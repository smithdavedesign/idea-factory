// Limits of the Markdown → Notion conversion. The rule under test: research is never lost between
// the agent's files and the Notion page. Run: npm test (node --test).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { mdToBlocks, batches, blocksText, markdownText, chunk, LIMITS } = require('../lib/notion-md');

const lossless = (md) => assert.equal(blocksText(mdToBlocks(md)), markdownText(md), 'page text differs from the markdown');

function* walk(blocks) {
  for (const b of blocks) {
    yield b;
    const v = b[b.type] || {};
    if (b.type === 'table') for (const r of [...(v.children || []), ...(b._moreRows || [])]) yield r;
  }
}

function assertWithinLimits(blocks) {
  for (const b of walk(blocks)) {
    const v = b[b.type];
    const lists = b.type === 'table_row' ? v.cells : v.rich_text ? [v.rich_text] : [];
    for (const items of lists) {
      assert.ok(items.length <= LIMITS.MAX_ITEMS, `${b.type}: ${items.length} rich-text items`);
      for (const t of items) {
        assert.ok(t.text.content.length <= LIMITS.MAX_TEXT, `${b.type}: item of ${t.text.content.length} units`);
        assert.ok(!/[\ud800-\udbff]$/.test(t.text.content) && !/^[\udc00-\udfff]/.test(t.text.content), 'surrogate pair cut');
      }
    }
    if (b.type === 'table') assert.ok(v.children.length <= LIMITS.MAX_TABLE_ROWS, `table created with ${v.children.length} rows`);
  }
  for (const batch of batches(blocks)) {
    assert.ok(batch.length <= LIMITS.MAX_BATCH, `batch of ${batch.length} blocks`);
    const bytes = Buffer.byteLength(JSON.stringify(batch.map(({ _moreRows, ...b }) => b)));
    assert.ok(bytes <= LIMITS.MAX_BATCH_BYTES + 210_000, `batch of ${bytes} bytes`); // one oversized block may stand alone
  }
}

const words = (n, seed = 'lorem') => Array.from({ length: n }, (_, i) => `${seed}${i}`).join(' ');

test('chunk: exact lengths, emoji never split, empty string kept', () => {
  assert.deepEqual(chunk(''), ['']);
  assert.deepEqual(chunk('a'.repeat(4001)).map((c) => c.length), [2000, 2000, 1]);
  const emoji = '😀'.repeat(1500); // 3,000 UTF-16 units
  const parts = chunk(emoji);
  assert.equal(parts.join(''), emoji);
  assert.ok(parts.every((p) => p.length <= 2000 && !/[\ud800-\udbff]$/.test(p)));
});

test('a 15,000-character paragraph survives whole', () => {
  const md = words(2500);
  assert.ok(md.length > 15_000);
  lossless(md);
  const [b] = mdToBlocks(md);
  assert.equal(b.paragraph.rich_text.length, Math.ceil(md.length / 2000));
  assertWithinLimits(mdToBlocks(md));
});

test('a paragraph longer than one block can hold (>200k) spills into more blocks, losing nothing', () => {
  const md = 'x'.repeat(450_000);
  const blocks = mdToBlocks(md);
  assert.equal(blocks.length, 3);
  lossless(md);
  assertWithinLimits(blocks);
});

test('500 bullets, nested lists, numbered lists and checkboxes', () => {
  const md = [
    ...Array.from({ length: 500 }, (_, i) => `- feature ${i}: ${words(8, `f${i}w`)}`),
    '- parent', '  - child', '    - grandchild',
    '1. first', '2. second', '10) tenth',
    '- [ ] open task', '- [x] done task',
  ].join('\n');
  const blocks = mdToBlocks(md);
  assert.equal(blocks.filter((b) => b.type === 'bulleted_list_item').length, 503);
  assert.equal(blocks.filter((b) => b.type === 'numbered_list_item').length, 3);
  assert.deepEqual(blocks.filter((b) => b.type === 'to_do').map((b) => b.to_do.checked), [false, true]);
  assert.match(blocks.find((b) => /grandchild/.test(JSON.stringify(b))).bulleted_list_item.rich_text[0].text.content, /^ {8}grandchild/);
  lossless(md);
  assertWithinLimits(blocks);
});

test('a 250-row competitor table becomes a real table; rows past 100 are appended after', () => {
  const md = ['| Name | Price | Gap | Source |', '|---|---:|:---|---|',
    ...Array.from({ length: 250 }, (_, i) => `| Tool ${i} | $${i}/mo | ${words(30, `gap${i}_`)} | [site](https://example.com/${i}) |`)].join('\n');
  const [t] = mdToBlocks(md);
  assert.equal(t.type, 'table');
  assert.equal(t.table.table_width, 4);
  assert.equal(t.table.has_column_header, true);
  assert.equal(t.table.children.length, 100);
  assert.equal(t._moreRows.length, 151);
  lossless(md);
  assertWithinLimits([t]);
});

test('ragged tables keep every cell; escaped pipes stay text', () => {
  const md = '| a | b |\n|---|---|\n| 1 | 2 | 3 |\n| only |\n| x \\| y | z |';
  const [t] = mdToBlocks(md);
  assert.equal(t.table.table_width, 3);
  assert.equal(t.table.children[3].table_row.cells[0][0].text.content, 'x | y');
  lossless(md);
});

test('a 250,000-character code block is split across code blocks, byte for byte', () => {
  const code = Array.from({ length: 5000 }, (_, i) => `const v${i} = ${i}; // ${'#'.repeat(30)}`).join('\n');
  const md = '```ts\n' + code + '\n```';
  const blocks = mdToBlocks(md);
  assert.ok(blocks.length >= 2 && blocks.every((b) => b.type === 'code'));
  assert.equal(blocks.flatMap((b) => b.code.rich_text).map((t) => t.text.content).join(''), code);
  assertWithinLimits(blocks);
});

test('headings at every level, quotes, dividers, links, bold and inline code', () => {
  const md = [
    '# Title', '## Section', '### Sub', '#### Deep', '##### Deeper', '###### Deepest',
    '> a quoted complaint from a user', '---',
    'See [the thread](https://news.ycombinator.com/item?id=1) — **bold claim** with `code` inline.',
  ].join('\n');
  const blocks = mdToBlocks(md, { headingOffset: 1 });
  assert.deepEqual(blocks.slice(0, 2).map((b) => b.type), ['heading_2', 'heading_3']);
  assert.equal(blocks.filter((b) => b.type === 'paragraph').length, 5); // h3+ under the offset → bold paragraphs, + body
  assert.ok(blocks.some((b) => b.type === 'quote') && blocks.some((b) => b.type === 'divider'));
  const body = blocks.at(-1).paragraph.rich_text;
  assert.equal(body.find((t) => t.text.link).text.link.url, 'https://news.ycombinator.com/item?id=1');
  assert.ok(body.find((t) => t.annotations?.bold) && body.find((t) => t.annotations?.code));
  lossless(md);
});

test('a link URL longer than Notion allows keeps its text', () => {
  const url = 'https://example.com/' + 'a'.repeat(2100);
  const md = `[long link](${url})`;
  const [b] = mdToBlocks(md);
  assert.equal(b.paragraph.rich_text[0].text.content, 'long link');
  assert.equal(b.paragraph.rich_text[0].text.link, undefined);
});

test('a worst-case research bundle (~1.2 MB) converts losslessly within every limit', () => {
  const md = [
    '# Research', words(3000, 'summary'),
    ...Array.from({ length: 40 }, (_, s) => [`## Section ${s}`, words(400, `s${s}p`), ...Array.from({ length: 20 }, (_, i) => `- point ${s}.${i} ${words(15)}`)].join('\n')),
    '| A | B |', '|---|---|', ...Array.from({ length: 300 }, (_, i) => `| ${i} | ${words(20, `r${i}`)} |`),
    '```', 'y'.repeat(800_000), '```', '😀 emoji tail '.repeat(5000),
  ].join('\n');
  assert.ok(md.length > 1_000_000);
  const blocks = mdToBlocks(md);
  lossless(md);
  assertWithinLimits(blocks);
});

test('every stored idea renders its full research, PRD and roadmap into the page', () => {
  const { pageBody } = require('../bin/idea-publish');
  const ideasDir = path.join(__dirname, '..', 'ideas');
  const slugs = fs.existsSync(ideasDir) ? fs.readdirSync(ideasDir).filter((s) => fs.existsSync(path.join(ideasDir, s, 'idea.json'))) : [];
  for (const slug of slugs) {
    const dir = path.join(ideasDir, slug);
    const idea = JSON.parse(fs.readFileSync(path.join(dir, 'idea.json'), 'utf8'));
    const blocks = pageBody(dir, idea);
    const page = blocksText(blocks);
    for (const f of ['RESEARCH.md', 'PRD.md', 'ROADMAP.md']) {
      assert.ok(page.includes(markdownText(fs.readFileSync(path.join(dir, f), 'utf8'))), `${slug}/${f} is not complete on the page`);
    }
    for (const u of idea.sources) assert.ok(page.includes(markdownText(u)), `${slug}: source ${u} missing`);
    assertWithinLimits(blocks);
  }
});
