// notion-md.js — Markdown → Notion blocks without losing text.
//
// Notion's limits, and how each is met:
//   - 2,000 characters per rich-text item   → long text is split across items
//   - 100 rich-text items per block         → longer text is split across blocks
//   - 100 children per append request       → batches of ≤ 100 blocks
//   - ~500 KB per request                   → batches also stop at MAX_BATCH_BYTES
//   - 100 rows per table creation           → extra rows are appended to the table afterwards
//   - no h4+, no nested-list markup here    → h4+ become bold paragraphs, nesting becomes indentation
// Formatting may be simplified; text never is. `blocksText` and `markdownText` give the comparable
// plain text of both sides, so tests can prove nothing was dropped.

const MAX_TEXT = 2000;
const MAX_ITEMS = 100;
const MAX_BATCH = 100;
const MAX_BATCH_BYTES = 400_000;
const MAX_TABLE_ROWS = 100;
const INDENT = '    '; // nested list levels, as non-breaking spaces

/**
 * Split a string into pieces of ≤ MAX_TEXT UTF-16 units (the stricter way to count Notion's limit:
 * an emoji counts 2), never cutting a surrogate pair.
 */
function chunk(s, size = MAX_TEXT) {
  const out = [];
  let cur = '';
  for (const cp of String(s)) {
    if (cur.length + cp.length > size) { out.push(cur); cur = ''; }
    cur += cp;
  }
  if (cur || !out.length) out.push(cur);
  return out;
}

/** Inline markdown → rich-text items: [text](url), **bold**, `code`. */
function inline(s) {
  const items = [];
  const push = (content, extra = {}) => {
    for (const piece of chunk(content)) {
      if (piece === '' && content !== '') continue;
      items.push({ type: 'text', text: { content: piece, ...(extra.link ? { link: { url: extra.link } } : {}) },
        ...(extra.bold || extra.code ? { annotations: { bold: !!extra.bold, code: !!extra.code } } : {}) });
    }
  };
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  for (const m of String(s).matchAll(re)) {
    if (m.index > last) push(s.slice(last, m.index));
    if (m[1] !== undefined) push(m[1], { link: m[2].length <= 2000 ? m[2] : undefined });
    else if (m[3] !== undefined) push(m[3], { bold: true });
    else push(m[4], { code: true });
    last = m.index + m[0].length;
  }
  if (last < String(s).length) push(String(s).slice(last));
  return items.length ? items : [{ type: 'text', text: { content: '' } }];
}

/** One logical block; split into several blocks of the same type if it needs > 100 rich-text items. */
function textBlocks(type, s, extra = {}) {
  const items = inline(s);
  const out = [];
  for (let i = 0; i < items.length; i += MAX_ITEMS) {
    out.push({ object: 'block', type, [type]: { rich_text: items.slice(i, i + MAX_ITEMS), ...extra } });
  }
  return out;
}

function codeBlocks(code, language = 'plain text') {
  const pieces = chunk(code);
  const out = [];
  for (let i = 0; i < pieces.length; i += MAX_ITEMS) {
    out.push({ object: 'block', type: 'code', code: { language,
      rich_text: pieces.slice(i, i + MAX_ITEMS).map((p) => ({ type: 'text', text: { content: p } })) } });
  }
  return out;
}

const splitRow = (line) => {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1);
  return t.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
};
const isTableSep = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

function tableBlock(lines) {
  const rows = lines.filter((l) => !isTableSep(l)).map(splitRow);
  const width = Math.max(...rows.map((r) => r.length));
  const cells = (r) => {
    const full = [...r, ...Array(width - r.length).fill('')];
    return full.map((c) => inline(c).slice(0, MAX_ITEMS));
  };
  const tableRows = rows.map((r) => ({ object: 'block', type: 'table_row', table_row: { cells: cells(r) } }));
  return {
    object: 'block', type: 'table',
    table: { table_width: width, has_column_header: lines.length > 1 && isTableSep(lines[1]), has_row_header: false,
      children: tableRows.slice(0, MAX_TABLE_ROWS) },
    // Rows past Notion's per-request limit, appended to the table once it exists.
    _moreRows: tableRows.slice(MAX_TABLE_ROWS),
  };
}

/** Markdown → blocks. `headingOffset` shifts levels so a document can sit under a page section. */
function mdToBlocks(md, { headingOffset = 1 } = {}) {
  const blocks = [];
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
  const heading = (level, text) => {
    const l = level + headingOffset;
    if (l <= 3) blocks.push(...textBlocks(`heading_${l}`, text));
    else blocks.push(...textBlocks('paragraph', `**${text}**`));
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if ((m = /^(\s*)(```|~~~)\s*([\w+-]*)/.exec(line))) {
      const fence = m[2];
      const code = [];
      while (++i < lines.length && !new RegExp(`^\\s*${fence}\\s*$`).test(lines[i])) code.push(lines[i]);
      blocks.push(...codeBlocks(code.join('\n')));
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const tbl = [line];
      while (i + 1 < lines.length && /^\s*\|.*\|\s*$/.test(lines[i + 1])) tbl.push(lines[++i]);
      blocks.push(tableBlock(tbl));
      continue;
    }
    if (!line.trim()) continue;
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { blocks.push({ object: 'block', type: 'divider', divider: {} }); continue; }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(line.trim()))) { heading(m[1].length, m[2]); continue; }
    if ((m = /^\s*>\s?(.*)$/.exec(line))) { blocks.push(...textBlocks('quote', m[1])); continue; }
    if ((m = /^(\s*)[-*+]\s+(?:\[([ xX])\]\s+)?(.*)$/.exec(line))) {
      const depth = Math.floor(m[1].replace(/\t/g, '  ').length / 2);
      if (m[2] !== undefined) blocks.push(...textBlocks('to_do', INDENT.repeat(depth) + m[3], { checked: m[2].toLowerCase() === 'x' }));
      else blocks.push(...textBlocks('bulleted_list_item', INDENT.repeat(depth) + m[3]));
      continue;
    }
    if ((m = /^(\s*)(\d+)[.)]\s+(.*)$/.exec(line))) {
      const depth = Math.floor(m[1].replace(/\t/g, '  ').length / 2);
      blocks.push(...textBlocks('numbered_list_item', INDENT.repeat(depth) + m[3]));
      continue;
    }
    blocks.push(...textBlocks('paragraph', line.trim()));
  }
  return blocks;
}

/** Split blocks into append requests within Notion's count and size limits. */
function batches(blocks) {
  const out = [];
  let cur = [];
  let bytes = 0;
  for (const b of blocks) {
    const size = Buffer.byteLength(JSON.stringify(b));
    if (cur.length && (cur.length >= MAX_BATCH || bytes + size > MAX_BATCH_BYTES)) { out.push(cur); cur = []; bytes = 0; }
    cur.push(b);
    bytes += size;
  }
  if (cur.length) out.push(cur);
  return out;
}

// ─── Comparable plain text: proves nothing was dropped ───────────────────────

// Whitespace is layout (Notion and markdown space things differently); every other character must match, in order.
const norm = (s) => String(s).replace(/[\s ]+/g, '');
const itemsText = (items) => (items || []).map((t) => t.plain_text ?? t.text?.content ?? '').join('');

/** Plain text of blocks (as sent, or as read back from Notion: pass table rows in `children`). */
function blocksText(blocks) {
  const parts = [];
  for (const b of blocks) {
    const v = b[b.type] || {};
    if (b.type === 'table') {
      const rows = [...(v.children || []), ...(b._moreRows || []), ...(b.children || [])];
      for (const r of rows) for (const c of r.table_row.cells) parts.push(itemsText(c));
    } else if (b.type === 'table_row') {
      for (const c of v.cells) parts.push(itemsText(c));
    } else if (v.rich_text) parts.push(itemsText(v.rich_text));
  }
  return norm(parts.join(' '));
}

/** Plain text of markdown as mdToBlocks keeps it: markup removed, every word kept. */
function markdownText(md) {
  const parts = [];
  const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
  const strip = (s) => s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if ((m = /^(\s*)(```|~~~)/.exec(line))) {
      const fence = m[2];
      const code = [];
      while (++i < lines.length && !new RegExp(`^\\s*${fence}\\s*$`).test(lines[i])) code.push(lines[i]);
      parts.push(code.join('\n'));
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      if (!isTableSep(line)) parts.push(...splitRow(line).map(strip));
      continue;
    }
    if (!line.trim() || /^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) continue;
    const t = line.trim()
      .replace(/^#{1,6}\s+/, '').replace(/^>\s?/, '')
      .replace(/^[-*+]\s+(\[[ xX]\]\s+)?/, '').replace(/^\d+[.)]\s+/, '');
    parts.push(strip(t));
  }
  return norm(parts.join(' '));
}

module.exports = { mdToBlocks, batches, blocksText, markdownText, inline, chunk,
  LIMITS: { MAX_TEXT, MAX_ITEMS, MAX_BATCH, MAX_BATCH_BYTES, MAX_TABLE_ROWS } };
