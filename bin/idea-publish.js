#!/usr/bin/env node
// idea-publish.js — every side effect of the idea pipeline. Agents do the research and write the
// docs; this script validates them, stores them, and creates product repos only when David asks.
//
//   node bin/idea-publish.js list                  # {ideas, portfolio}: every recorded idea + David's GitHub repos (dedupe)
//   node bin/idea-publish.js seed "<text>" [--source slack|whatsapp|page]   # queue an idea David sent ("idea: …"); the pipeline researches it on its next tick and replies there
//   node bin/idea-publish.js seeds                 # queued seeds, oldest first
//   node bin/idea-publish.js publish <draft-dir>   # validate → ideas/<slug>/ committed to the idea-factory repo
//   node bin/idea-publish.js promote [--dry-run]   # product repos for ideas at stage "build" (private, topic "idea")
//
// The git copy (ideas/<slug>/ in this repo) is the record: complete, versioned, readable by agents.
// RepoHQ's Ideas page shows it (the pipeline mirrors it every tick) and is where David decides.
//
// Never builds shell strings: every external command goes through execFileSync(arg array),
// because titles and text come from the web.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { parseSeedArgs, IDEAS_PAGE } = require('../lib/seeds');

const GH_OWNER = process.env.IDEA_GH_OWNER || 'smithdavedesign';
const IDEA_HOME = process.env.IDEA_HOME || path.resolve(__dirname, '..');
const IDEAS_REPO = process.env.IDEA_REPO || 'idea-factory';
const IDEAS_DIR = path.join(IDEA_HOME, 'ideas');
const SEEDS_FILE = path.join(IDEA_HOME, 'seeds.jsonl');
const DOCS = ['RESEARCH.md', 'PRD.md', 'ROADMAP.md'];
const REQUIRED_FILES = ['idea.json', ...DOCS];
const PRD_HEADINGS = [/problem/i, /user/i, /competit|alternative/i, /mvp|scope/i, /metric|success/i];
const LEVELS = ['Low', 'Medium', 'High'];
const REPO_NAME_RE = /^(?=.{3,24}$)[a-z][a-z0-9]*(-[a-z0-9]+)?$/;
const BANNED_NAME_WORDS = new Set(['idea', 'ideas', 'test', 'tmp', 'demo', 'draft', 'mvp', 'poc', 'prototype', 'project', 'repo', 'new']);

class Fail extends Error {}
const fail = (msg) => { throw new Fail(msg); };

const tagName = (s) => String(s).replace(/,/g, ' ').trim().slice(0, 100);
/** idea.json tags: lowercase, no duplicates, at most 8 (one per filter group, `ai`, topics: SKILL.md "tags"). */
const normalizeTags = (tags) => [...new Set((Array.isArray(tags) ? tags : []).filter((t) => typeof t === 'string')
  .map((t) => tagName(t).toLowerCase()).filter(Boolean))].slice(0, 8);
const docsUrl = (slug) => `https://github.com/${GH_OWNER}/${IDEAS_REPO}/tree/main/ideas/${slug}`;
/** The idea on RepoHQ's Ideas page, where David reads it in full and decides. */
const ideaPageUrl = (slug) => `${IDEAS_PAGE}/${encodeURIComponent(slug)}`;
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

/** Every recorded idea (ideas/<slug>/), for research to dedupe against and promote to act on. */
function localIdeas() {
  if (!fs.existsSync(IDEAS_DIR)) return [];
  return fs.readdirSync(IDEAS_DIR).filter((slug) => fs.existsSync(path.join(IDEAS_DIR, slug, 'idea.json'))).map((slug) => {
    const idea = readJson(path.join(IDEAS_DIR, slug, 'idea.json')) || {};
    const state = readJson(path.join(IDEAS_DIR, slug, 'state.json')) || {};
    return { slug, title: idea.title || slug, stage: state.stage || 'idea', oneLiner: String(idea.oneLiner || '').slice(0, 200), repo: state.repo || '', url: ideaPageUrl(slug) };
  });
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

// ─── Seeds: ideas David sends ("idea: …" on Slack or WhatsApp, or the Ideas page). The companion only
// queues them; the pipeline researches each on its next tick (lib/seeds.js), without his personal context.
function readSeeds() {
  if (!fs.existsSync(SEEDS_FILE)) return [];
  return fs.readFileSync(SEEDS_FILE, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

function seed(textArg, { source = null } = {}) {
  const t = String(textArg || '').replace(/^\s*idea:\s*/i, '').trim();
  if (t.length < 8) fail('usage: idea-publish.js seed "<idea text, at least 8 characters>"');
  fs.mkdirSync(IDEA_HOME, { recursive: true });
  const entry = { id: `seed-${crypto.randomBytes(3).toString('hex')}`, text: t.slice(0, 2000), at: new Date().toISOString(), status: 'queued', ...(source ? { source } : {}) };
  fs.appendFileSync(SEEDS_FILE, JSON.stringify(entry) + '\n');
  return { ok: true, id: entry.id, note: 'queued — researched within about 15 minutes; the verdict comes back where it was sent' };
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
  idea.tags = normalizeTags(idea.tags);
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

/** Commit ideas/<slug>/ to the idea-factory repo and push. The pipeline mirrors it to RepoHQ on its next tick. */
function storeIdea(slug, message) {
  git(['add', '--', path.join('ideas', slug)]);
  try { git(['commit', '-q', '-m', message.slice(0, 200), '--', path.join('ideas', slug)]); } catch {} // unchanged on retry
  try { git(['pull', '-q', '--rebase', '--autostash']); } catch {}
  git(['push', '-q']);
  return git(['rev-parse', '--short', 'HEAD']);
}

async function publish(dirArg) {
  if (!dirArg) fail('usage: idea-publish.js publish <draft-dir>');
  const dir = path.resolve(dirArg);
  if (!fs.existsSync(dir)) fail(`no such directory: ${dir}`);
  const idea = validateDraft(dir);
  const full = `${GH_OWNER}/${idea.repoName}`;

  const existing = localIdeas().find((r) => r.slug === idea.slug ||
    r.title.trim().toLowerCase() === idea.title.trim().toLowerCase());
  if (existing) {
    markSeed(idea.seedId, 'done', { slug: existing.slug });
    return { ok: true, skipped: 'already recorded', slug: existing.slug, stage: existing.stage, url: existing.url };
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
  markSeed(idea.seedId, 'done', { slug: idea.slug });
  return { ok: true, title: idea.title, oneLiner: idea.oneLiner, stage: 'idea', url: ideaPageUrl(idea.slug), docs: docsUrl(idea.slug), commit };
}

function loadIdea(slug) {
  const dir = path.join(IDEAS_DIR, slug);
  if (!fs.existsSync(path.join(dir, 'idea.json'))) fail(`no stored idea ideas/${slug}`);
  const idea = JSON.parse(fs.readFileSync(path.join(dir, 'idea.json'), 'utf8'));
  // Ideas recorded before 2026-10-10 may lack these.
  idea.slug = idea.slug || slug;
  idea.repoName = idea.repoName || slug;
  idea.sources = Array.isArray(idea.sources) ? idea.sources : [];
  return { dir, idea };
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

/**
 * A private product repo for each idea at stage "build" without one: David approved it on the Ideas page
 * (or a demand test passed its bar). The caller records stage "repo" and the URL in the idea's state.
 */
async function promote(dryRun = false) {
  const promoted = [];
  const errors = [];
  for (const row of localIdeas().filter((r) => r.stage === 'build' && !r.repo)) {
    try {
      const { dir, idea } = loadIdea(row.slug);
      const full = `${GH_OWNER}/${idea.repoName}`;
      const remote = repoInfo(full);
      if (remote && remote.description !== repoDescription(idea)) throw new Error(`"${full}" exists and isn't this idea's repo`);
      const repoUrl = `https://github.com/${full}`;
      if (dryRun) { promoted.push({ slug: row.slug, title: row.title, repoUrl, dryRun: true }); continue; }
      if (!remote) createRepo(dir, idea, full);
      promoted.push({ slug: row.slug, title: row.title, repoUrl });
    } catch (e) {
      errors.push({ slug: row.slug, title: row.title, error: String(e.stderr || e.message).slice(0, 300) });
    }
  }
  return { ok: errors.length === 0, at: new Date().toISOString(), promoted, errors };
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === 'list') return { ideas: localIdeas(), portfolio: portfolio() };
  if (cmd === 'seed') { const a = parseSeedArgs(rest); return seed(a.text, { source: a.source }); }
  if (cmd === 'seeds') return readSeeds().filter((s) => s.status === 'queued');
  if (cmd === 'publish') return publish(rest[0]);
  if (cmd === 'promote') return promote(rest.includes('--dry-run'));
  fail('usage: idea-publish.js list | seed "<text>" [--source slack|whatsapp|page] | seeds | publish <draft-dir> | promote [--dry-run]');
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

module.exports = { seed, readSeeds, validateDraft, normalizeTags, docsUrl, ideaPageUrl, localIdeas, Fail, promote, storeIdea, IDEAS_DIR, git };
