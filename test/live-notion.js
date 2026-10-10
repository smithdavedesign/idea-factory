// Live check against the real Notion API: a stress page goes in, is read back, and must match.
// Creates one throwaway row on the Idea Board (Status "Pass"), then moves it to the trash.
// Run: npm run test:live
const assert = require('node:assert/strict');
const { mdToBlocks, blocksText } = require('../lib/notion-md');
const { appendBlocks, readPageBlocks, notionRequest, DATABASE_ID } = require('../bin/idea-publish');

const words = (n, seed) => Array.from({ length: n }, (_, i) => `${seed}${i}`).join(' ');
const md = [
  '# Stress', words(2600, 'para'),                                   // ~17k chars → 9 rich-text items
  ...Array.from({ length: 150 }, (_, i) => `- bullet ${i} ${words(6, 'b')}`),
  '  - nested child', '1. numbered', '- [x] done',
  '| Name | Price | Gap |', '|---|---|---|',
  ...Array.from({ length: 130 }, (_, i) => `| Tool ${i} | $${i} | ${words(12, `g${i}_`)} |`), // > 100 rows
  '```', 'c'.repeat(9000), '```',
  '> quote', '---', '#### deep heading', 'link [here](https://example.com) **bold** `code` 😀'.repeat(50),
].join('\n');

(async () => {
  const page = await notionRequest('pages', 'POST', { parent: { database_id: DATABASE_ID }, properties: {
    Name: { title: [{ text: { content: 'ZZ live limit check — auto-deleted' } }] }, Status: { select: { name: 'Pass' } } } });
  try {
    const blocks = mdToBlocks(md);
    await appendBlocks(page.id, blocks);
    const back = await readPageBlocks(page.id);
    const want = blocksText(blocks);
    const got = blocksText(back);
    assert.equal(got.length, want.length, `length: sent ${want.length}, read back ${got.length}`);
    assert.equal(got, want);
    const table = back.find((b) => b.type === 'table');
    assert.equal(table.children.length, 131, 'table rows (header + 130)');
    console.log(JSON.stringify({ ok: true, markdownChars: md.length, blocks: back.length, tableRows: table.children.length, comparedChars: got.length }));
  } finally {
    await notionRequest(`pages/${page.id}`, 'PATCH', { archived: true });
  }
})().catch((e) => { console.log(JSON.stringify({ ok: false, error: e.message.slice(0, 500) })); process.exitCode = 1; });
