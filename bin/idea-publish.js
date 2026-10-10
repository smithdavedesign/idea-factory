#!/usr/bin/env node
// idea-publish.js — every side effect of the idea pipeline. Agents do the research and write the
// docs; this script validates them, stores them, and creates product repos only when David asks.
//
//   node bin/idea-publish.js list                  # {ideas, portfolio}: Idea Board rows + David's GitHub repos (dedupe)
//   node bin/idea-publish.js seed "<text>"         # queue an idea David sent ("idea: …") for the next research run
//   node bin/idea-publish.js seeds                 # queued seeds, oldest first
//   node bin/idea-publish.js publish <draft-dir>   # validate → ideas/<slug>/ committed to the idea-factory repo
//                                                  #   → Notion row (Status "Idea", full research/PRD/roadmap in the page)
//   node bin/idea-publish.js promote [--dry-run]   # product repos for rows David set to "Build" (private, topic "idea")
//   node bin/idea-publish.js sync-page <slug>      # rebuild a row's Notion page from the git copy
//   node bin/idea-publish.js verify-page <slug>    # read the Notion page back and check no text was lost
//
// The git copy (ideas/<slug>/ in this repo) is the record: complete, versioned, readable by agents.
// Notion is where David decides; its page carries the same text, and links to the git copy.
//
// Never builds shell strings: every external command goes through execFileSync(arg array),
// because titles and text come from the web.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { mdToBlocks, batches, blocksText, markdownText } = require('../lib/notion-md');

const HOME = process.env.HOME;
const DATABASE_ID = process.env.IDEA_BOARD_ID || '3f5bf9bf-93e4-81b7-8036-fc1cd59fd48f';
const NOTION_VERSION = '2022-06-28';
const GH_OWNER = process.env.IDEA_GH_OWNER || 'smithdavedesign';
const IDEA_HOME = process.env.IDEA_HOME || path.resolve(__dirname, '..');
const IDEAS_REPO = process.env.IDEA_REPO || 'idea-factory';
const IDEAS_DIR = path.join(IDEA_HOME, 'ideas');
const SEEDS_FILE = path.join(IDEA_HOME, 'seeds.jsonl');
const STATUS = { idea: 'Idea', build: 'Build', created: 'Repo Created', pass: 'Pass' };
const STATUS_COLORS = { Idea: 'blue', Build: 'green', 'Repo Created': 'purple', Pass: 'gray' };
const DOCS = ['RESEARCH.md', 'PRD.md', 'ROADMAP.md'];
const DOC_TITLES = { 'RESEARCH.md': 'Research', 'PRD.md': 'PRD', 'ROADMAP.md': 'Roadmap' };
const REQUIRED_FILES = ['idea.json', ...DOCS];
const PRD_HEADINGS = [/problem/i, /user/i, /competit|alternative/i, /mvp|scope/i, /metric|success/i];
const LEVELS = ['Low', 'Medium', 'High'];
const REPO_NAME_RE = /^(?=.{3,24}$)[a-z][a-z0-9]*(-[a-z0-9]+)?$/;
const BANNED_NAME_WORDS = new Set(['idea', 'ideas', 'test', 'tmp', 'demo', 'draft', 'mvp', 'poc', 'prototype', 'project', 'repo', 'new']);

class Fail extends Error {}
const fail = (msg) => { throw new Fail(msg); };

function notionKey() {
  if (process.env.NOTION_API_KEY) return process.env.NOTION_API_KEY;
  // Fallback for runs outside an OpenClaw agent turn (launchd, Claude Code).
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(HOME, '.openclaw', 'openclaw.json'), 'utf8'));
    const key = cfg.skills?.entries?.notion?.apiKey;
    if (key) return key;
  } catch {}
  throw new Error('NOTION_API_KEY not set and not found in ~/.openclaw/openclaw.json');
}

async function notionRequest(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${notionKey()}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  for (let attempt = 0; ; attempt++) {
    const resp = await fetch(`https://api.notion.com/v1/${endpoint}`, opts);
    if (resp.status === 429 && attempt < 4) { await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); continue; }
    if (!resp.ok) throw new Error(`Notion API error ${resp.status}: ${await resp.text()}`);
    return resp.json();
  }
}

const text = (s) => String(s ?? '').slice(0, 2000); // properties only; the page body is never cut
const plain = (prop) => (prop?.title || prop?.rich_text || []).map((t) => t.plain_text).join('');
const tagName = (s) => String(s).replace(/,/g, ' ').trim().slice(0, 100);
const docsUrl = (slug) => `https://github.com/${GH_OWNER}/${IDEAS_REPO}/tree/main/ideas/${slug}`;

async function ensureDatabaseProperties() {
  const db = await notionRequest(`databases/${DATABASE_ID}`);
  const props = db.properties || {};
  const updates = {};
  if (!props.Slug) updates.Slug = { rich_text: {} };
  if (!props.Confidence) updates.Confidence = { select: { options: LEVELS.map((name) => ({ name })) } };
  if (!props.Sources) updates.Sources = { rich_text: {} };
  if (!props.GitHub_URL) updates.GitHub_URL = { url: {} };
  if (!props.Docs) updates.Docs = { url: {} };
  if (!props.Description) updates.Description = { rich_text: {} };
  if (!props.Keywords) updates.Keywords = { multi_select: {} };
  if (!props.EffortEstimate) updates.EffortEstimate = { select: { options: LEVELS.map((name) => ({ name })) } };
  if (!props.AddedAt) updates.AddedAt = { date: {} };
  const statusOpts = props.Status?.select?.options || [];
  const missing = Object.values(STATUS).filter((name) => !statusOpts.some((o) => o.name === name));
  if (!props.Status || missing.length) {
    // Resend existing options so none are dropped.
    updates.Status = { select: { options: [...statusOpts.map(({ name, color }) => ({ name, color })),
      ...missing.map((name) => ({ name, color: STATUS_COLORS[name] }))] } };
  }
  if (Object.keys(updates).length) {
    await notionRequest(`databases/${DATABASE_ID}`, 'PATCH', { properties: updates });
  }
}

async function allIdeas(filter) {
  const rows = [];
  let cursor;
  do {
    const res = await notionRequest(`databases/${DATABASE_ID}/query`, 'POST',
      { page_size: 100, ...(filter ? { filter } : {}), ...(cursor ? { start_cursor: cursor } : {}) });
    rows.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return rows.map((p) => ({
    id: p.id,
    url: p.url,
    title: plain(p.properties.Name),
    slug: plain(p.properties.Slug),
    status: p.properties.Status?.select?.name || '',
    oneLiner: plain(p.properties.Description).slice(0, 200),
    repo: p.properties.GitHub_URL?.url || '',
    docs: p.properties.Docs?.url || '',
  }));
}

/** David's own repos, so research extends an existing project instead of duplicating it. */
function portfolio() {
  try {
    const repos = JSON.parse(execFileSync('gh', ['repo', 'list', GH_OWNER, '--limit', '300',
      '--json', 'name,description,isArchived,repositoryTopics'], { stdio: 'pipe' }));
    return repos.filter((r) => r.name !== IDEAS_REPO).map((r) => ({
      name: r.name, description: (r.description || '').slice(0, 200), archived: r.isArchived,
      fromIdeaPipeline: (r.repositoryTopics || []).some((t) => (t.name || t.topic?.name) === 'idea'),
    }));
  } catch (e) {
    return { error: `gh repo list failed: ${String(e.stderr || e.message).slice(0, 200)}` };
  }
}

// ─── Seeds: ideas David sends on WhatsApp ("idea: …"). The companion only queues them; research
// happens on the next run, without David's personal context.
function readSeeds() {
  if (!fs.existsSync(SEEDS_FILE)) return [];
  return fs.readFileSync(SEEDS_FILE, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

function seed(textArg) {
  const t = String(textArg || '').replace(/^\s*idea:\s*/i, '').trim();
  if (t.length < 8) fail('usage: idea-publish.js seed "<idea text, at least 8 characters>"');
  fs.mkdirSync(IDEA_HOME, { recursive: true });
  const entry = { id: `seed-${crypto.randomBytes(3).toString('hex')}`, text: t.slice(0, 2000), at: new Date().toISOString(), status: 'queued' };
  fs.appendFileSync(SEEDS_FILE, JSON.stringify(entry) + '\n');
  return { ok: true, id: entry.id, note: 'queued — researched in the next idea run' };
}

function markSeed(id, status, extra = {}) {
  if (!id) return;
  const seeds = readSeeds();
  const s = seeds.find((x) => x.id === id);
  if (!s) return;
  Object.assign(s, { status, doneAt: new Date().toISOString(), ...extra });
  fs.writeFileSync(SEEDS_FILE, seeds.map((x) => JSON.stringify(x)).join('\n') + '\n');
}

function validateDraft(dir) {
  for (const f of REQUIRED_FILES) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p) || fs.statSync(p).size < 200 && f !== 'idea.json') fail(`missing or too short: ${f}`);
  }
  let idea;
  try { idea = JSON.parse(fs.readFileSync(path.join(dir, 'idea.json'), 'utf8')); }
  catch (e) { fail(`idea.json is not valid JSON: ${e.message}`); }
  for (const k of ['title', 'oneLiner']) if (!idea[k] || String(idea[k]).trim().length < 8) fail(`idea.json.${k} missing/too short`);
  if (!LEVELS.includes(idea.effort)) fail(`idea.json.effort must be one of ${LEVELS.join('/')}`);
  if (!LEVELS.includes(idea.confidence)) fail(`idea.json.confidence must be one of ${LEVELS.join('/')}`);
  // Production repo name: a short product name, never a description or a pipeline label.
  const repo = String(idea.repoName || '').trim();
  if (!REPO_NAME_RE.test(repo)) {
    fail(`idea.json.repoName "${repo}" must be a short product name: lowercase kebab-case, 3–24 chars, ` +
      'at most 2 words (e.g. "tripsplit", "ledger-lens")');
  }
  const banned = repo.split('-').find((w) => BANNED_NAME_WORDS.has(w) || /^\d{4,}$/.test(w));
  if (banned) fail(`idea.json.repoName must not contain "${banned}" — name the product, not the process`);
  idea.repoName = repo;
  idea.slug = repo;
  idea.tags = (Array.isArray(idea.tags) ? idea.tags : []).map(tagName).filter(Boolean).slice(0, 6);
  // Portfolio check (Step 1): the agent names the closest existing repo, or "none".
  if (typeof idea.overlaps !== 'string' || !idea.overlaps.trim()) {
    fail('idea.json.overlaps is required: the closest existing repo from `list` (portfolio) and how this differs, or "none"');
  }

  const research = fs.readFileSync(path.join(dir, 'RESEARCH.md'), 'utf8');
  // Models often wrap citations in 【】 or end them with punctuation — trim both.
  const urls = [...new Set((research.match(/https?:\/\/[^\s)>\]"'【】]+/g) || [])
    .map((u) => u.replace(/[.,;:!?]+$/, '')))];
  if (urls.length < 3) fail(`RESEARCH.md must cite at least 3 source URLs (found ${urls.length})`);
  idea.sources = [...new Set([...(idea.sources || []), ...urls])].filter((u) => /^https?:\/\//.test(u));

  const prd = fs.readFileSync(path.join(dir, 'PRD.md'), 'utf8');
  const headings = (prd.match(/^#{1,3} .+$/gm) || []).join('\n');
  const missing = PRD_HEADINGS.filter((re) => !re.test(headings));
  if (missing.length) fail(`PRD.md is missing sections matching: ${missing.map(String).join(', ')}`);
  return idea;
}

function repoInfo(full) {
  try { return JSON.parse(execFileSync('gh', ['repo', 'view', full, '--json', 'name,description'], { stdio: 'pipe' })); }
  catch { return null; }
}

const repoDescription = (idea) => idea.oneLiner.replace(/[\r\n]+/g, ' ').slice(0, 300);
const git = (args, cwd = IDEA_HOME) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim();

/** Commit ideas/<slug>/ to the idea-factory repo and push. The record must exist before Notion does. */
function storeIdea(slug, message) {
  git(['add', '--', path.join('ideas', slug)]);
  try { git(['commit', '-q', '-m', message.slice(0, 200), '--', path.join('ideas', slug)]); } catch {} // unchanged on retry
  try { git(['pull', '-q', '--rebase', '--autostash']); } catch {}
  git(['push', '-q']);
  return git(['rev-parse', '--short', 'HEAD']);
}

// ─── Notion page body: the full research, PRD and roadmap, so David can decide without opening anything else.

function pageBody(dir, idea) {
  const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
  const h1 = (t) => ({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: t } }] } });
  return [
    { object: 'block', type: 'callout', callout: { icon: { emoji: '🗳️' }, rich_text: [
      { type: 'text', text: { content: 'Decide here: set Status to "Build" and a private repo is created within 15 minutes; "Pass" drops it. ' } },
      { type: 'text', text: { content: `Closest existing project: ${String(idea.overlaps || 'not checked').slice(0, 1500)}. ` } },
      { type: 'text', text: { content: 'Full docs in git', link: { url: docsUrl(idea.slug) } } },
    ] } },
    ...DOCS.flatMap((f) => [h1(DOC_TITLES[f]), ...mdToBlocks(read(f), { headingOffset: 1 })]),
    h1('Sources'),
    ...mdToBlocks(idea.sources.map((u) => `- [${u}](${u})`).join('\n')),
  ];
}

/** The plain text a page must contain: every doc in full, plus every source. */
function expectedPageText(dir, idea) {
  return blocksText(pageBody(dir, idea));
}

async function appendBlocks(parentId, blocks) {
  for (const batch of batches(blocks)) {
    const clean = batch.map(({ _moreRows, ...b }) => b);
    const res = await notionRequest(`blocks/${parentId}/children`, 'PATCH', { children: clean });
    for (let i = 0; i < batch.length; i++) {
      const more = batch[i]._moreRows;
      if (more && more.length) {
        const tableId = res.results[i].id;
        for (const rows of batches(more)) await notionRequest(`blocks/${tableId}/children`, 'PATCH', { children: rows });
      }
    }
  }
}

async function children(id) {
  const out = [];
  let cursor;
  do {
    const res = await notionRequest(`blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    out.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return out;
}

async function readPageBlocks(pageId) {
  const blocks = await children(pageId);
  for (const b of blocks) if (b.type === 'table') b.children = await children(b.id);
  return blocks;
}

async function createRow(idea, dir) {
  const now = new Date().toISOString();
  const page = await notionRequest('pages', 'POST', {
    parent: { database_id: DATABASE_ID },
    properties: {
      Name: { title: [{ text: { content: text(idea.title) } }] },
      Slug: { rich_text: [{ text: { content: idea.slug } }] },
      Status: { select: { name: STATUS.idea } },
      Description: { rich_text: [{ text: { content: text(idea.oneLiner) } }] },
      Keywords: { multi_select: idea.tags.map((name) => ({ name })) },
      EffortEstimate: { select: { name: idea.effort } },
      Confidence: { select: { name: idea.confidence } },
      Sources: { rich_text: [{ text: { content: text(idea.sources.join('\n')) } }] },
      Docs: { url: docsUrl(idea.slug) },
      AddedAt: { date: { start: now } },
      SpecCreatedAt: { date: { start: now } },
    },
  });
  await appendBlocks(page.id, pageBody(dir, idea));
  return page;
}

async function publish(dirArg) {
  if (!dirArg) fail('usage: idea-publish.js publish <draft-dir>');
  const dir = path.resolve(dirArg);
  if (!fs.existsSync(dir)) fail(`no such directory: ${dir}`);
  const idea = validateDraft(dir);
  const full = `${GH_OWNER}/${idea.repoName}`;

  await ensureDatabaseProperties();
  const existing = (await allIdeas()).find((r) => r.slug === idea.slug ||
    r.title.trim().toLowerCase() === idea.title.trim().toLowerCase());
  if (existing) {
    markSeed(idea.seedId, 'done', { notionUrl: existing.url });
    return { ok: true, skipped: 'already on the Idea Board', status: existing.status, notionUrl: existing.url };
  }
  // The repo name is reserved now, so "Build" can't fail later on a name clash with David's repos.
  if (repoInfo(full)) fail(`repo name "${idea.repoName}" is already taken on GitHub; choose a different repoName`);

  const dest = path.join(IDEAS_DIR, idea.slug);
  if (fs.existsSync(dest)) fail(`ideas/${idea.slug} already exists; choose a different repoName`);
  fs.mkdirSync(IDEAS_DIR, { recursive: true });
  idea.recordedAt = new Date().toISOString();
  fs.writeFileSync(path.join(dir, 'idea.json'), JSON.stringify(idea, null, 2) + '\n');
  fs.renameSync(dir, dest);
  const commit = storeIdea(idea.slug, `Idea: ${idea.title}`);
  const page = await createRow(idea, dest);
  markSeed(idea.seedId, 'done', { notionUrl: page.url });
  return { ok: true, title: idea.title, oneLiner: idea.oneLiner, status: STATUS.idea, notionUrl: page.url, docs: docsUrl(idea.slug), commit };
}

function loadIdea(slug) {
  const dir = path.join(IDEAS_DIR, slug);
  if (!fs.existsSync(path.join(dir, 'idea.json'))) fail(`no stored idea ideas/${slug}`);
  return { dir, idea: JSON.parse(fs.readFileSync(path.join(dir, 'idea.json'), 'utf8')) };
}

async function rowFor(slug) {
  const row = (await allIdeas({ property: 'Slug', rich_text: { equals: slug } }))[0];
  if (!row) fail(`no Idea Board row with Slug "${slug}"`);
  return row;
}

/** Rebuild the Notion page from the git copy (after editing the docs, or to repair a page). */
async function syncPage(slug) {
  const { dir, idea } = loadIdea(slug);
  await ensureDatabaseProperties();
  const row = await rowFor(slug);
  for (const b of await children(row.id)) await notionRequest(`blocks/${b.id}`, 'DELETE');
  await appendBlocks(row.id, pageBody(dir, idea));
  await notionRequest(`pages/${row.id}`, 'PATCH', { properties: { Docs: { url: docsUrl(slug) } } });
  return { ok: true, slug, notionUrl: row.url };
}

/** Read the page back and compare its text with the git copy: proves nothing was cut. */
async function verifyPage(slug) {
  const { dir, idea } = loadIdea(slug);
  const row = await rowFor(slug);
  const got = blocksText(await readPageBlocks(row.id));
  const want = expectedPageText(dir, idea);
  const docsChars = DOCS.reduce((n, f) => n + fs.readFileSync(path.join(dir, f), 'utf8').length, 0);
  if (got === want) return { ok: true, slug, docsChars, pageChars: got.length };
  let at = 0;
  while (at < Math.min(got.length, want.length) && got[at] === want[at]) at++;
  return { ok: false, slug, docsChars, pageChars: got.length, expectedChars: want.length, firstDifferenceAt: at,
    expected: want.slice(at, at + 120), got: got.slice(at, at + 120) };
}

function writeReadme(dir, idea) {
  const p = path.join(dir, 'README.md');
  if (fs.existsSync(p)) return;
  fs.writeFileSync(p, `# ${idea.title}\n\n${idea.oneLiner}\n\n` +
    `- [Research](RESEARCH.md) — findings and sources\n- [PRD](PRD.md)\n- [Roadmap](ROADMAP.md)\n\n` +
    `Effort: ${idea.effort} · Confidence: ${idea.confidence}\n\n` +
    `_Researched by the idea pipeline on ${String(idea.recordedAt || new Date().toISOString()).slice(0, 10)} ` +
    `([original record](${docsUrl(idea.slug)})); repo created on David's go-ahead ${new Date().toISOString().slice(0, 10)}._\n`);
}

/** Product repo from the stored idea: a copy of ideas/<slug>/, so the record stays in idea-factory. */
function createRepo(srcDir, idea, full) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `idea-${idea.slug}-`));
  fs.cpSync(srcDir, dir, { recursive: true });
  writeReadme(dir, idea);
  const g = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  g('init', '-q', '-b', 'main');
  g('add', '-A');
  g('commit', '-q', '-m', `Idea: ${idea.title}`.slice(0, 200));
  execFileSync('gh', ['repo', 'create', full, '--private',
    '--description', repoDescription(idea),
    '--source', dir, '--remote', 'origin', '--push'], { stdio: 'pipe' });
  // RepoHQ and the factory tell idea repos apart from real projects by this topic.
  try { execFileSync('gh', ['repo', 'edit', full, '--add-topic', 'idea'], { stdio: 'pipe' }); } catch {}
  fs.rmSync(dir, { recursive: true, force: true });
}

async function promote(dryRun = false) {
  const rows = await allIdeas({ property: 'Status', select: { equals: STATUS.build } });
  const promoted = [];
  const errors = [];
  for (const row of rows.filter((r) => !r.repo)) {
    try {
      const { dir, idea } = loadIdea(row.slug);
      const full = `${GH_OWNER}/${idea.repoName}`;
      const remote = repoInfo(full);
      if (remote && remote.description !== repoDescription(idea)) throw new Error(`"${full}" exists and isn't this idea's repo`);
      const repoUrl = `https://github.com/${full}`;
      if (dryRun) { promoted.push({ title: row.title, repoUrl, dryRun: true }); continue; }
      if (!remote) createRepo(dir, idea, full);
      await notionRequest(`pages/${row.id}`, 'PATCH', { properties: {
        Status: { select: { name: STATUS.created } }, GitHub_URL: { url: repoUrl } } });
      promoted.push({ title: row.title, repoUrl, notionUrl: row.url });
    } catch (e) {
      errors.push({ title: row.title, error: String(e.stderr || e.message).slice(0, 300) });
    }
  }
  return { ok: errors.length === 0, at: new Date().toISOString(), promoted, errors };
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === 'list') return { ideas: await allIdeas(), portfolio: portfolio() };
  if (cmd === 'seed') return seed(rest.join(' '));
  if (cmd === 'seeds') return readSeeds().filter((s) => s.status === 'queued');
  if (cmd === 'publish') return publish(rest[0]);
  if (cmd === 'promote') return promote(rest.includes('--dry-run'));
  if (cmd === 'sync-page') return syncPage(rest[0]);
  if (cmd === 'verify-page') return verifyPage(rest[0]);
  fail('usage: idea-publish.js list | seed "<text>" | seeds | publish <draft-dir> | promote [--dry-run] | sync-page <slug> | verify-page <slug>');
}

if (require.main === module) {
  main(process.argv.slice(2)).then((out) => {
    console.log(JSON.stringify(out, null, Array.isArray(out) || out?.ideas ? 1 : 0));
    if (out && out.ok === false) process.exitCode = 1;
  }, (err) => {
    const msg = err instanceof Fail ? err.message : err.stderr ? `${err.message}: ${String(err.stderr).slice(0, 500)}` : err.message;
    console.log(JSON.stringify({ ok: false, error: msg }));
    process.exitCode = 1;
  });
}

module.exports = { validateDraft, pageBody, expectedPageText, docsUrl, Fail, appendBlocks, readPageBlocks, notionRequest, DATABASE_ID };
