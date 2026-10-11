#!/usr/bin/env node
// idea-pipeline.js — runs the idea lifecycle (lib/pipeline.js) end to end. launchd: every 15 minutes.
//
//   node bin/idea-pipeline.js tick            # cheap steps every time; the daily steps once a day after 09:30
//   node bin/idea-pipeline.js tick --daily    # force the daily steps now
//
// Every tick (no model calls):
//   0. Decisions from RepoHQ's Ideas page → the Notion Status David would have set; new ideas typed
//      there → the research queue (seeds.jsonl, like "idea: …" on Slack/WhatsApp) (lib/repohq.js).
//   1. Notion → state: David's own Status changes win (Pass, Build, Validate, Live).
//   2. Demand signals from RepoHQ (idea_signals) → state + Notion (Visitors, Signups).
//   3. Validation decisions (policy.json): build / pass / extend. Build → Notion "Build".
//   4. Promote: "Build" rows get their private repo (stage repo).
//   5. Revenue: MRR and lifecycle of idea repos from RepoHQ; RepoHQ marks new idea repos "building".
//   6. State → Notion (Status, Verdict, Score, Page, MRR), commit the record.
//   7. The record → RepoHQ (ideas, idea_pipeline) for the Ideas page.
// An idea David approves is built on the tick that creates its repo, not at the next daily run.
// Daily (Claude Pro subscription, capped by policy):
//   a. Review new ideas with the gstack frameworks (bin/idea-review.js) → Validate or Pass.
//   b. Landing page for each new Validate idea (pages/<slug>/), deployed to the free pages project.
//   c. Build M1 for a new repo, tests first (bin/idea-build.js), at most policy.build.maxPerWeek.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const P = require('../lib/pipeline');
const pub = require('./idea-publish');
const { mdToBlocks } = require('../lib/notion-md');
const { emit } = require('../lib/events');
const R = require('../lib/repohq');

const ROOT = path.resolve(__dirname, '..');
const IDEAS = path.join(ROOT, 'ideas');
const PAGES = path.join(ROOT, 'pages');
const LOCK = path.join(ROOT, '.pipeline.lock');
const STATE_FILE = path.join(ROOT, '.pipeline-state.json');
const LOG = path.join(ROOT, 'pipeline.log');
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'policy.json'), 'utf8'));
const OWNER = process.env.IDEA_GH_OWNER || 'smithdavedesign';

const STAGE_TO_STATUS = { idea: 'Idea', validate: 'Validate', build: 'Build', repo: 'Repo Created', building: 'Repo Created', live: 'Live', pass: 'Pass' };

/**
 * David's Status changes in Notion (or on RepoHQ's Ideas page, which sets them) that the pipeline
 * must follow (pure). Validate sends a reviewed idea to a demand test: the landing page needs the
 * review's copy, so an unreviewed idea waits for its review.
 */
function ownerOverride(stage, notionStatus, { reviewed = true } = {}) {
  if (!notionStatus || STAGE_TO_STATUS[stage] === notionStatus) return null;
  if (notionStatus === 'Pass' && stage !== 'pass') return 'pass';
  if (notionStatus === 'Build' && ['idea', 'validate', 'pass'].includes(stage)) return 'build';
  if (notionStatus === 'Validate' && reviewed && ['idea', 'pass'].includes(stage)) return 'validate';
  if (notionStatus === 'Live' && stage !== 'live') return 'live';
  return null;
}

/**
 * An idea gets an M1 build when its repo exists, it hasn't been built, and either the review didn't
 * say pass or David approved it himself (Notion "Build"). Ideas made repos by the old pipeline,
 * before reviews existed, wait for one of those.
 */
function buildable(s) {
  if (s.stage !== 'repo' || (s.build && s.build.status !== 'failed')) return false;
  if (s.build?.status === 'failed' && s.build.retried) return false;
  return s.ownerApproved === true || s.validation?.decision === 'build' || (!!s.review && s.review.verdict !== 'pass');
}

/** Daily steps run once per local day, after 09:30 (the research run is at 09:00). */
function dailyDue(lastDaily, now) {
  const today = now.toLocaleDateString('en-CA'); // YYYY-MM-DD, local
  const afterStart = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() >= 30);
  return afterStart && lastDaily !== today;
}

const log = (entry) => fs.appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
const ideaDirs = () => (fs.existsSync(IDEAS) ? fs.readdirSync(IDEAS).filter((s) => fs.existsSync(path.join(IDEAS, s, 'idea.json'))) : []);

function lock() {
  if (fs.existsSync(LOCK)) {
    const pid = Number(fs.readFileSync(LOCK, 'utf8'));
    try { process.kill(pid, 0); return false; } catch { /* stale */ }
  }
  fs.writeFileSync(LOCK, String(process.pid));
  return true;
}

function dbSql() {
  const { neon } = require('@neondatabase/serverless');
  const url = process.env.IDEA_DATABASE_URL || execFileSync('security', ['find-generic-password', '-s', 'repohq-factory-database-url', '-w'], { encoding: 'utf8' }).trim();
  return neon(url);
}

async function signalsBySlug(sql) {
  const rows = await sql`SELECT slug,
      count(*) FILTER (WHERE kind = 'view')::int AS views,
      count(DISTINCT ip_hash) FILTER (WHERE kind = 'view')::int AS unique_visitors,
      count(DISTINCT email) FILTER (WHERE kind = 'signup')::int AS signups
    FROM idea_signals GROUP BY slug`;
  return new Map(rows.map((r) => [r.slug, { views: r.views, uniqueVisitors: r.unique_visitors, signups: r.signups }]));
}

async function notionProps(row, state) {
  const props = {
    Status: { select: { name: STAGE_TO_STATUS[state.stage] } },
    ...(state.review ? { Verdict: { select: { name: state.review.verdict } }, Score: { number: state.review.score } } : {}),
    ...(state.page ? { Page: { url: state.page.url } } : {}),
    ...(state.signals ? { Visitors: { number: state.signals.uniqueVisitors }, Signups: { number: state.signals.signups } } : {}),
    ...(state.revenue ? { MRR: { number: state.revenue.mrr } } : {}),
    ...(state.repo ? { GitHub_URL: { url: state.repo } } : {}),
  };
  await pub.notionRequest(`pages/${row.id}`, 'PATCH', { properties: props });
}

/** Append the review to the idea's Notion page once (it carries research/PRD/roadmap already). */
async function notionReview(row, dir) {
  const md = fs.readFileSync(path.join(dir, 'REVIEW.md'), 'utf8');
  const h1 = { object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: 'Review (gstack)' } }] } };
  await pub.appendBlocks(row.id, [h1, ...mdToBlocks(md, { headingOffset: 1 })]);
}

function deployPages() {
  const out = execFileSync('vercel', ['deploy', '--prod', '--yes', '--scope', policy.vercelScope], { cwd: PAGES, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 300_000 });
  return /Aliased|ready/.test(out);
}

function commitRecord(message) {
  try {
    pub.git(['add', '--', 'ideas', 'pages']);
    pub.git(['commit', '-q', '-m', message]);
  } catch { return null; } // nothing to commit
  try { pub.git(['pull', '-q', '--rebase', '--autostash']); } catch {}
  pub.git(['push', '-q']);
  return pub.git(['rev-parse', '--short', 'HEAD']);
}

async function tick({ forceDaily = false } = {}) {
  const now = new Date();
  const out = { at: now.toISOString(), changes: [], errors: [] };
  const note = (slug, what) => out.changes.push(`${slug}: ${what}`);
  const fail = (step, e) => out.errors.push(`${step}: ${String(e && (e.stderr || e.message) || e).slice(0, 300)}`);
  await pub.ensureDatabaseProperties();
  const rows = new Map((await pub.allIdeas()).filter((r) => r.slug).map((r) => [r.slug, r]));
  const changed = new Set();
  const save = (slug, state, what) => { P.writeState(path.join(IDEAS, slug), state, now); changed.add(slug); note(slug, what); };
  let sql = null;
  try { sql = dbSql(); } catch (e) { fail('database', e); }

  // 0. Decisions from RepoHQ's Ideas page: set the Notion Status exactly as David would, so step 1
  // applies them like any other owner decision and Notion stays the board the pipeline follows.
  const fromPage = new Map();
  if (sql) {
    try {
      for (const d of await R.pendingDecisions(sql)) {
        const row = rows.get(d.slug);
        const status = R.DECISION_STATUS[d.decision];
        if (!row || !status) { await R.finishDecision(sql, d.id, 'failed', row ? `unknown decision "${d.decision}"` : 'no Notion row for this idea'); continue; }
        if (!(await R.claimDecision(sql, d.id, `Notion set to ${status}`))) continue; // withdrawn meanwhile
        try {
          await pub.notionRequest(`pages/${row.id}`, 'PATCH', { properties: { Status: { select: { name: status } } } });
          row.status = status;
          fromPage.set(d.slug, d);
        } catch (e) {
          await R.finishDecision(sql, d.id, 'failed', `Notion: ${e.message}`).catch(() => {});
          fail(`decision ${d.slug}`, e);
        }
      }
    } catch (e) { fail('decisions', R.explain(e)); }
  }

  // 1. David's Status changes in Notion win.
  for (const slug of ideaDirs()) {
    const dir = path.join(IDEAS, slug);
    const state = P.readState(dir);
    const next = ownerOverride(state.stage, rows.get(slug)?.status, { reviewed: fs.existsSync(path.join(dir, 'review.json')) });
    const d = fromPage.get(slug);
    if (!next) {
      // A decision that matches where the idea already is (agreeing with the review's pass): record it,
      // so the Ideas page and the morning report stop asking.
      if (d && STAGE_TO_STATUS[state.stage] === rows.get(slug)?.status) {
        save(slug, { ...state, ownerDecision: { decision: d.decision, at: now.toISOString(), source: 'repohq', ...(d.note ? { note: d.note } : {}) } }, `owner confirmed ${rows.get(slug).status} (RepoHQ Ideas page)`);
      }
      continue;
    }
    const ownerDecision = next === 'live' ? state.ownerDecision : { decision: next, at: now.toISOString(), source: d ? 'repohq' : 'notion', ...(d?.note ? { note: d.note } : {}) };
    save(slug, {
      ...state, stage: next, ownerDecision,
      ...(next === 'pass' ? { passReason: 'owner' } : {}),
      ...(next === 'build' ? { ownerApproved: true } : {}),
      // Back to a demand test after one already ran: a fresh window (the page and its signals stay).
      ...(next === 'validate' && state.page ? { validation: P.startValidation(now, policy) } : {}),
    }, `owner set ${rows.get(slug).status}${d ? ' (RepoHQ Ideas page)' : ''}`);
  }

  // Notion "Build" on an idea that already has its repo approves the M1 build (e.g. overriding a review's pass).
  for (const slug of ideaDirs()) {
    const dir = path.join(IDEAS, slug);
    const state = P.readState(dir);
    if (rows.get(slug)?.status === 'Build' && state.stage === 'repo' && !state.ownerApproved) {
      const d = fromPage.get(slug);
      save(slug, { ...state, ownerApproved: true, ownerDecision: { decision: 'build', at: now.toISOString(), source: d ? 'repohq' : 'notion', ...(d?.note ? { note: d.note } : {}) } }, 'owner approved the M1 build');
    }
  }

  // Reviews not yet on their Notion page (run by hand, or a failed earlier sync): post them once.
  for (const slug of ideaDirs()) {
    const dir = path.join(IDEAS, slug);
    const state = P.readState(dir);
    const row = rows.get(slug);
    if (!row || !state.review || state.review.notionAt || !fs.existsSync(path.join(dir, 'REVIEW.md'))) continue;
    try {
      await notionReview(row, dir);
      save(slug, { ...state, review: { ...state.review, notionAt: now.toISOString() } }, 'review posted to Notion');
    } catch (e) { fail(`notion review ${slug}`, e); }
  }

  // 0b. New ideas from the Ideas page → the research queue; researched ones marked with their slug.
  if (sql) {
    try {
      const slugForSeed = (id) => ideaDirs().find((slug) => {
        try { return JSON.parse(fs.readFileSync(path.join(IDEAS, slug, 'idea.json'), 'utf8')).seedId === id; } catch { return false; }
      }) || null;
      for (const n of await R.syncSeeds(sql, { seed: pub.seed, seeds: pub.readSeeds(), slugForSeed })) note('seeds', n);
    } catch (e) { fail('seeds', R.explain(e)); }
  }

  // 2–3. Demand signals and validation decisions.
  if (sql) {
    try {
      const signals = await signalsBySlug(sql);
      for (const slug of ideaDirs()) {
        const dir = path.join(IDEAS, slug);
        const state = P.readState(dir);
        if (state.stage !== 'validate' || !state.page) continue;
        const s = signals.get(slug) ?? { views: 0, uniqueVisitors: 0, signups: 0 };
        const prev = state.signals;
        let next = { ...state, signals: { ...s, updatedAt: now.toISOString() } };
        const d = P.decideValidation(next, s, policy, now);
        if (d.decision === 'build') next = { ...next, stage: 'build', validation: { ...next.validation, decision: 'build', reason: d.reason } };
        else if (d.decision === 'pass') next = { ...next, stage: 'pass', validation: { ...next.validation, decision: 'pass', reason: d.reason } };
        else if (d.decision === 'extend') next = { ...next, validation: { ...P.extendValidation(next.validation, now, policy), decision: 'extend', reason: d.reason } };
        if (d.decision !== 'wait' || JSON.stringify(prev) !== JSON.stringify({ ...s, updatedAt: prev?.updatedAt })) save(slug, next, d.decision === 'wait' ? `signals ${s.uniqueVisitors}/${s.signups}` : `${d.decision}: ${d.reason}`);
      }
    } catch (e) { fail('signals', e); }
  }

  // State → Notion before promote, so "build" decisions become Notion "Build" and get their repo now.
  for (const slug of changed) {
    const row = rows.get(slug);
    if (row) await notionProps(row, P.readState(path.join(IDEAS, slug))).catch((e) => fail(`notion ${slug}`, e));
  }

  // 4. Promote: "Build" rows → private repo.
  try {
    const res = await pub.promote();
    for (const p of res.promoted) {
      const slug = p.repoUrl.split('/').pop();
      const dir = path.join(IDEAS, slug);
      if (fs.existsSync(dir)) save(slug, { ...P.readState(dir), stage: 'repo', repo: p.repoUrl }, `repo created ${p.repoUrl}`);
    }
    for (const e of res.errors) fail(`promote ${e.title}`, e.error);
  } catch (e) { fail('promote', e); }

  // 5. Revenue and lifecycle from RepoHQ.
  if (sql) {
    try {
      const withRepo = ideaDirs().map((slug) => [slug, P.readState(path.join(IDEAS, slug))]).filter(([, s]) => s.repo);
      if (withRepo.length) {
        const names = withRepo.map(([, s]) => s.repo.replace('https://github.com/', ''));
        const repos = await sql`SELECT full_name, mrr, lifecycle_status FROM repositories WHERE full_name = ANY(${names})`;
        for (const [slug, state] of withRepo) {
          const r = repos.find((x) => x.full_name.toLowerCase() === state.repo.replace('https://github.com/', '').toLowerCase());
          if (!r) continue; // RepoHQ hasn't synced the repo yet
          if (['maintaining', 'idea'].includes(r.lifecycle_status) && ['repo', 'building'].includes(state.stage)) {
            await sql`UPDATE repositories SET lifecycle_status = 'building', purpose = COALESCE(purpose, 'Revenue') WHERE full_name = ${r.full_name}`;
          }
          const mrr = Number(r.mrr ?? 0);
          const live = ['beta', 'production', 'growing'].includes(r.lifecycle_status);
          const next = { ...state, revenue: { mrr, updatedAt: now.toISOString() }, ...(live && state.stage !== 'live' ? { stage: 'live' } : {}) };
          if (mrr !== (state.revenue?.mrr ?? -1) || next.stage !== state.stage) save(slug, next, `revenue $${mrr}${next.stage !== state.stage ? ', live' : ''}`);
        }
      }
    } catch (e) { fail('revenue', e); }
  }

  // The record → RepoHQ's Ideas page (only ideas whose content changed), and the heartbeat.
  const syncRepoHQ = async () => {
    if (!sql) return;
    try {
      const synced = await R.syncIdeas(sql, ideaDirs().map((slug) => R.ideaRecord(path.join(IDEAS, slug), slug, rows.get(slug)?.url)));
      if (synced.length) out.synced = [...new Set([...(out.synced || []), ...synced])];
    } catch (e) { fail('repohq sync', R.explain(e)); }
    await R.heartbeat(sql, { at: new Date().toISOString(), ok: out.errors.length === 0, errors: out.errors, policy }).catch(() => {});
  };

  const startBuild = async (slug, milestone) => {
    const { buildOne } = require('./idea-build');
    // A build holds the tick for up to an hour: sync and beat first, so the Ideas page is current meanwhile.
    await syncRepoHQ();
    const r = await buildOne(slug, { milestone });
    changed.add(slug);
    if (r.ok) note(slug, `${milestone} PR ${r.prUrl} (tests ${r.testsPassing ? 'passing' : 'failing'}, ${r.engine === 'free' ? 'free-pool backup' : 'Claude subscription'})`); else fail(`build ${slug} ${milestone}`, r.reason);
  };

  // Daily steps.
  const pstate = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {};
  const dailyNow = forceDaily || dailyDue(pstate.lastDaily, now);

  // 4b. An idea David approved (Notion Build, or the Ideas page) is built now, not at the next daily
  // run: approving is the signal he wants it. Still at most policy.build.maxPerWeek.
  if (!dailyNow) {
    const all = ideaDirs().map((slug) => [slug, P.readState(path.join(IDEAS, slug))]);
    const approved = all.filter(([, s]) => s.ownerApproved && buildable(s));
    if (approved.length && P.buildsThisWeek(all.map(([, s]) => s), now) < policy.build.maxPerWeek) await startBuild(approved[0][0], 'M1');
  }

  if (dailyNow) {
    out.daily = true;
    // a. Reviews.
    const { reviewOne, pendingSlugs } = require('./idea-review');
    for (const slug of pendingSlugs().slice(0, policy.review.maxPerDay)) {
      const r = await reviewOne(slug);
      if (!r.ok) { fail(`review ${slug}`, r.reason); continue; }
      changed.add(slug); note(slug, `reviewed: ${r.review.verdict} ${r.review.score}/10`);
      const row = rows.get(slug);
      if (row) {
        await notionReview(row, path.join(IDEAS, slug))
          .then(() => P.writeState(path.join(IDEAS, slug), { ...P.readState(path.join(IDEAS, slug)), review: { ...P.readState(path.join(IDEAS, slug)).review, notionAt: new Date().toISOString() } }))
          .catch((e) => fail(`notion review ${slug}`, e));
      }
    }
    // b. Landing pages for new Validate ideas, within the cap.
    const states = ideaDirs().map((slug) => [slug, P.readState(path.join(IDEAS, slug))]);
    let live = states.filter(([, s]) => s.stage === 'validate' && s.page).length;
    const newPages = [];
    for (const [slug, state] of states) {
      if (state.stage !== 'validate' || state.page || live >= policy.validation.maxValidating) continue;
      try {
        const review = JSON.parse(fs.readFileSync(path.join(IDEAS, slug, 'review.json'), 'utf8'));
        fs.mkdirSync(path.join(PAGES, slug), { recursive: true });
        fs.writeFileSync(path.join(PAGES, slug, 'index.html'), P.renderLanding({ slug, landing: review.landing, signalUrl: policy.signalUrl }));
        const url = `${policy.pagesBaseUrl}/${slug}/`;
        fs.writeFileSync(path.join(IDEAS, slug, 'LAUNCH.md'), `# Launch post for ${slug}\n\nPage: ${url}\n\nWhere to post:\n${review.launch.channels.map((c) => `- ${c.name}${c.url ? ` (${c.url})` : ''}${c.why ? `: ${c.why}` : ''}`).join('\n')}\n\nPost:\n\n${review.launch.post.replace(/\{url\}/g, url)}\n`);
        newPages.push([slug, state, url]);
        live++;
      } catch (e) { fail(`page ${slug}`, e); }
    }
    if (newPages.length) {
      try {
        deployPages();
        for (const [slug, state, url] of newPages) save(slug, { ...P.readState(path.join(IDEAS, slug)), page: { url, deployedAt: now.toISOString() }, validation: P.startValidation(now, policy) }, `landing page ${url}`);
      } catch (e) { fail('deploy pages', e); }
    }
    // c. Builds: Claude Code on the subscription first, the free pool only as backup (idea-build.js).
    // A merged milestone PR moves the idea on to its next milestone; M1 for new repos. One a week.
    const { nextMilestone } = require('./idea-build');
    for (const [slug, s] of states) {
      if (s.stage !== 'building' || s.build?.status !== 'pr-open' || !s.build.prUrl) continue;
      let prState = null;
      try { prState = JSON.parse(execFileSync('gh', ['pr', 'view', s.build.prUrl, '--json', 'state'], { encoding: 'utf8' })).state; } catch { continue; }
      const m = s.build.milestone || 'M1';
      if (prState === 'MERGED') save(slug, { ...s, build: { ...s.build, status: 'merged' }, milestonesDone: [...new Set([...(s.milestonesDone || []), m])] }, `${m} merged`);
      else if (prState === 'CLOSED') save(slug, { ...s, build: { ...s.build, status: 'closed' } }, `${m} PR closed without merging`);
    }
    const fresh = ideaDirs().map((slug) => [slug, P.readState(path.join(IDEAS, slug))]);
    const queue = [
      ...fresh.filter(([, s]) => buildable(s)).map(([slug]) => [slug, 'M1']),
      ...fresh.filter(([, s]) => s.stage === 'building' && s.build?.status === 'merged').map(([slug, s]) => {
        const roadmap = fs.existsSync(path.join(IDEAS, slug, 'ROADMAP.md')) ? fs.readFileSync(path.join(IDEAS, slug, 'ROADMAP.md'), 'utf8') : '';
        return [slug, nextMilestone(roadmap, s.milestonesDone || [])];
      }).filter(([, m]) => m),
    ];
    if (queue.length && P.buildsThisWeek(fresh.map(([, s]) => s), now) < policy.build.maxPerWeek) {
      const [slug, milestone] = queue[0];
      await startBuild(slug, milestone);
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify({ ...pstate, lastDaily: now.toLocaleDateString('en-CA') }));
  }

  // 6. State → Notion for anything changed after the first sync, then commit the record.
  for (const slug of changed) {
    const row = rows.get(slug);
    if (row) await notionProps(row, P.readState(path.join(IDEAS, slug))).catch((e) => fail(`notion ${slug}`, e));
  }
  if (changed.size) out.commit = commitRecord(`pipeline: ${[...changed].join(', ')}`);

  // 7. The record → RepoHQ's Ideas page, and the heartbeat.
  await syncRepoHQ();
  out.ok = out.errors.length === 0;
  log(out);
  // Quiet ticks aren't logged (launchd's exit code covers liveness): only changes, daily runs and failures.
  if (!out.ok || out.changes.length || out.daily) emit({ component: 'pipeline', event: 'tick', status: out.ok ? 'ok' : 'fail', durationMs: Date.now() - now.getTime(),
    message: out.ok ? `${out.changes.length} change(s)${out.daily ? ', daily steps ran' : ''}` : out.errors.join('; ').slice(0, 1500),
    data: { changes: out.changes.slice(0, 20), daily: !!out.daily } });
  return out;
}

module.exports = { ownerOverride, dailyDue, buildable, STAGE_TO_STATUS, tick };

if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd !== 'tick') { console.log(JSON.stringify({ ok: false, error: 'usage: idea-pipeline.js tick [--daily]' })); process.exit(1); }
  if (!lock()) { console.log(JSON.stringify({ ok: true, skipped: 'another run is in progress' })); process.exit(0); }
  tick({ forceDaily: rest.includes('--daily') })
    .then((o) => { console.log(JSON.stringify(o)); if (!o.ok) process.exitCode = 1; })
    .catch((e) => { console.log(JSON.stringify({ ok: false, error: e.message })); process.exitCode = 1; })
    .finally(() => fs.rmSync(LOCK, { force: true }));
}
