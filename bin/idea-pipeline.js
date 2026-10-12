#!/usr/bin/env node
// idea-pipeline.js — runs the idea lifecycle (lib/pipeline.js) end to end. launchd: every 15 minutes.
//
//   node bin/idea-pipeline.js tick            # cheap steps every time; the daily steps once a day after 09:30
//   node bin/idea-pipeline.js tick --daily    # force the daily steps now
//
// Every tick (no model calls):
//   0. Decisions from RepoHQ's Ideas page → the Notion Status David would have set; new ideas typed
//      there → the research queue (seeds.jsonl, like "idea: …" on Slack/WhatsApp) (lib/repohq.js).
//  0c. Ideas David sent are researched and reviewed now (Claude Pro, policy.research.seeded), and the
//      verdict goes back where he sent it (lib/seeds.js). The one model call outside the daily steps.
//   1. Notion → state: David's own Status changes win (Pass, Build, Validate, Live).
//   2. Demand signals from RepoHQ (idea_signals) → state + Notion (Visitors, Signups).
//   3. Validation decisions (policy.json): build / pass / extend. Build → Notion "Build".
//   4. Promote: "Build" rows get their private repo (stage repo).
//   5. Revenue: MRR and lifecycle of idea repos from RepoHQ; RepoHQ marks new idea repos "building".
//   6. State → Notion (Status, Verdict, Score, Page, MRR), commit the record.
//   7. The record → RepoHQ (ideas, idea_pipeline) for the Ideas page.
// An idea David approves is built on the tick that creates its repo, not at the next daily run.
//  4a. Milestone PRs merged or closed since the last tick (every tick, so "Build M2 now" appears right away).
//  5b. The launch checklist for every idea with a repo (lib/revenue.js): RepoHQ's repo row (homepage,
//      Stripe product, MRR), a live-URL probe, legal pages in the repo, launch posts, signups. And the
//      road-to-revenue plan (bin/idea-revenue.js) once M1 is merged, at most policy.revenue.maxPerDay.
//      Build queues are ordered by revenueScore: the idea closest to its first dollar goes first.
//      policy.build.mode "mvp": approving a build builds the whole roadmap in one run (buildOne({mvp})).
//  Go-live (lib/golive.js): once an MVP is complete, a go-live build makes it launch-ready (SEO basics,
//      privacy and terms, payment link, visit beacon, Vercel project); after it merges, the production
//      URL becomes the repo's homepage and the live site is audited every 6 hours (checklist step
//      "launchReady"). Also "Get it launch-ready" on the Ideas page (idea_build_requests "GOLIVE").
//  4c. "Start build now" on the Ideas page (idea_build_requests) builds the next milestone on this
//      tick, outside the weekly slot: oldest request first, policy.build.manualPerDay in 24 hours,
//      one build per tick. The result goes back to the request row and to Slack.
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
const S = require('../lib/seeds');
const REV = require('../lib/revenue');
const LF = require('../lib/launch-facts');
const GL = require('../lib/golive');

const ROOT = path.resolve(__dirname, '..');
// The record and the pipeline's own files. IDEA_PIPELINE_DATA points them elsewhere (the tick tests).
const DATA = process.env.IDEA_PIPELINE_DATA || ROOT;
const IDEAS = path.join(DATA, 'ideas');
const PAGES = path.join(DATA, 'pages');
const LOCK = path.join(DATA, '.pipeline.lock');
const STATE_FILE = path.join(DATA, '.pipeline-state.json');
const LOG = path.join(DATA, 'pipeline.log');
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
  const pstate = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {};
  const writePstate = () => fs.writeFileSync(STATE_FILE, JSON.stringify(pstate));

  /** Landing pages for Validate ideas without one, within policy.validation.maxValidating. Returns [{slug, url}]. */
  const landingPages = () => {
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
        newPages.push({ slug, url });
        live++;
      } catch (e) { fail(`page ${slug}`, e); }
    }
    if (!newPages.length) return [];
    try {
      deployPages();
      for (const { slug, url } of newPages) save(slug, { ...P.readState(path.join(IDEAS, slug)), page: { url, deployedAt: now.toISOString() }, validation: P.startValidation(now, policy) }, `landing page ${url}`);
      return newPages;
    } catch (e) { fail('deploy pages', e); return []; }
  };

  /** Post an idea's review to its Notion page once, and record that it's there. */
  const postReview = async (slug) => {
    const row = rows.get(slug);
    if (!row) return;
    const dir = path.join(IDEAS, slug);
    await notionReview(row, dir)
      .then(() => P.writeState(dir, { ...P.readState(dir), review: { ...P.readState(dir).review, notionAt: new Date().toISOString() } }))
      .catch((e) => fail(`notion review ${slug}`, e));
  };

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
      for (const n of await R.syncSeeds(sql, { seed: (text) => pub.seed(text, { source: 'page' }), seeds: pub.readSeeds(), slugForSeed })) note('seeds', n);
    } catch (e) { fail('seeds', R.explain(e)); }
  }

  // 0c. An idea David sent is researched and reviewed now, oldest first, and the verdict goes back where
  // he sent it. Claude Pro only: a failed run leaves the seed queued for a later tick (no free-model fallback).
  const rules = policy.research?.seeded;
  const queued = pub.readSeeds().filter((s) => s.status === 'queued');
  const due = rules ? S.seededDue({ queued: queued.length, seeded: pstate.seeded, now, rules }) : { due: false };
  if (due.due) {
    const oldest = queued[0];
    const { research } = require('./idea-research');
    const r = await research({ trigger: 'seed' });
    if (r.busy) note('seeds', 'research already running; next tick');
    else {
      const seedNow = pub.readSeeds().find((s) => s.id === oldest.id) || oldest;
      const slug = r.recorded?.[0];
      pstate.seeded = S.countRun(pstate.seeded, now, { failed: !slug && seedNow.status !== 'done' });
      writePstate();
      if (slug) {
        // A recorded idea: review it now, give a Validate its page, and reply.
        const dir = path.join(IDEAS, slug);
        const idea = JSON.parse(fs.readFileSync(path.join(dir, 'idea.json'), 'utf8'));
        const source = (pub.readSeeds().find((s) => s.id === idea.seedId) || seedNow).source;
        changed.add(slug); note(slug, `researched now (seed ${idea.seedId || oldest.id})`);
        const row = (await pub.allIdeas().catch(() => [])).find((x) => x.slug === slug);
        if (row) rows.set(slug, row);
        const { reviewOne } = require('./idea-review');
        const rv = await reviewOne(slug);
        let pageUrl = null;
        if (rv.ok) {
          note(slug, `reviewed now: ${rv.review.verdict} ${rv.review.score}/10`);
          await postReview(slug);
          if (P.readState(dir).stage === 'validate') pageUrl = landingPages().find((p) => p.slug === slug)?.url ?? null;
        } else fail(`review ${slug}`, rv.reason);
        try {
          const to = S.notify(source, S.seedMessage({ idea, slug, review: rv.ok ? rv.review : null, reviewError: rv.reason, pageUrl }));
          note(slug, `verdict sent to ${to.channel}`);
        } catch (e) { fail(`notify ${slug}`, e); }
      } else if (seedNow.status === 'done' && seedNow.notionUrl) {
        // Research found it's already on the Idea Board.
        try { S.notify(seedNow.source, `💡 That idea is already on the Idea Board: ${seedNow.notionUrl}\nDecide: ${S.IDEAS_PAGE}`); } catch (e) { fail('notify seed', e); }
        note('seeds', `${oldest.id} already on the board`);
      } else {
        // research.js logged and alerted the failure; the seed waits policy.research.seeded.retryMinutes.
        note('seeds', `${oldest.id} not researched yet: ${String(r.reason).slice(0, 160)}`);
      }
    }
  }

  // 2–3. Demand signals and validation decisions.
  let signals = new Map();
  if (sql) {
    try {
      signals = await signalsBySlug(sql);
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
  const repoRows = new Map();
  if (sql) {
    try {
      const withRepo = ideaDirs().map((slug) => [slug, P.readState(path.join(IDEAS, slug))]).filter(([, s]) => s.repo);
      if (withRepo.length) {
        const names = withRepo.map(([, s]) => s.repo.replace('https://github.com/', ''));
        const repos = await sql`SELECT full_name, mrr, lifecycle_status, homepage, stripe_product_id FROM repositories WHERE full_name = ANY(${names})`;
        for (const r of repos) repoRows.set(r.full_name.toLowerCase(), r);
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

  // 5b. The launch checklist (lib/revenue.js), for every idea with a repo. Live checks are cached.
  const { readPlan } = require('./idea-revenue');
  pstate.live = pstate.live || {};
  pstate.legal = pstate.legal || {};
  for (const slug of ideaDirs()) {
    const dir = path.join(IDEAS, slug);
    const state = P.readState(dir);
    if (!state.repo || state.stage === 'pass') continue;
    try {
      const full = state.repo.replace('https://github.com/', '');
      const row = repoRows.get(full.toLowerCase()) || null;
      const fresh = (c, hours) => c && now.getTime() - new Date(c.at).getTime() < hours * 3_600_000;
      // The product's own production URL (its Vercel project in the owner's team), once it has deployed.
      pstate.prod = pstate.prod || {};
      if (!fresh(pstate.prod[slug], 1)) pstate.prod[slug] = { at: now.toISOString(), url: GL.productionUrl(full.split('/')[1], policy.vercelScope) };
      const prodUrl = pstate.prod[slug].url;
      // A repo without a homepage gets its production URL, so RepoHQ (and everyone) knows where it lives.
      // RepoHQ may not have synced a new repo yet: then ask GitHub, and never overwrite a homepage that's set.
      const homepageNow = () => {
        // RepoHQ's copy can lag GitHub (a homepage set minutes ago reads as ''), so only a non-empty
        // homepage there counts; otherwise GitHub decides. (2026-10-12: tiebreak's was overwritten.)
        if (row?.homepage) return row.homepage; try { return JSON.parse(execFileSync('gh', ['repo', 'view', full, '--json', 'homepageUrl'], { encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'ignore'] })).homepageUrl || ''; } catch { return null; } };
      if (prodUrl && !pstate.prod[slug].homepageSet && homepageNow() === '') {
        try { execFileSync('gh', ['repo', 'edit', full, '--homepage', prodUrl], { stdio: 'ignore', timeout: 30_000 }); pstate.prod[slug].homepageSet = true; note(slug, `homepage set to ${prodUrl}`); } catch (e) { fail(`homepage ${slug}`, e); }
      }
      if (!fresh(pstate.live[slug], 1)) pstate.live[slug] = { at: now.toISOString(), url: await LF.liveUrl([...new Set([...(prodUrl ? [prodUrl] : []), ...LF.urlCandidates(row?.homepage, full.split('/')[1])])], { owned: (u) => u === prodUrl || LF.ownedByTeam(u, policy.vercelScope) }) };
      pstate.audit = pstate.audit || {};
      const liveNow = pstate.live[slug].url;
      if (liveNow && (!fresh(pstate.audit[slug], 6) || pstate.audit[slug].url !== liveNow)) {
        const was = pstate.audit[slug]?.result?.ready;
        const result = await GL.auditLaunch(liveNow);
        pstate.audit[slug] = { at: now.toISOString(), url: liveNow, result };
        // Log a change, not every audit: newly launch-ready, or a check that used to pass now failing.
        if (result.ready && was !== true) note(slug, `launch-ready: ${result.passed}/${result.total} launch checks pass on ${liveNow}`);
        if (!result.ready && was === true) note(slug, `launch checks regressed on ${liveNow}: missing ${result.missing.join(', ')}`);
      }
      if (!liveNow) delete pstate.audit[slug];
      if (!fresh(pstate.legal[slug], 6)) pstate.legal[slug] = { at: now.toISOString(), found: LF.legalPages(full) };
      const launchLog = (() => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'launch-log.json'), 'utf8')); } catch { return null; } })();
      const checklist = REV.launchChecklist(state, {
        plan: readPlan(dir),
        roadmap: fs.existsSync(path.join(dir, 'ROADMAP.md')) ? fs.readFileSync(path.join(dir, 'ROADMAP.md'), 'utf8') : '',
        repo: row && { homepage: row.homepage, stripeProductId: row.stripe_product_id, mrr: Number(row.mrr ?? 0) },
        liveUrl: pstate.live[slug].url, legal: pstate.legal[slug].found,
        launchPosts: Array.isArray(launchLog?.posts) ? launchLog.posts.length : 0,
        signups: signals.get(slug)?.signups ?? state.signals?.signups ?? 0,
        audit: pstate.audit[slug]?.result ?? null,
      });
      if (!REV.sameChecklist(state.launch, checklist)) save(slug, { ...P.readState(dir), launch: { ...checklist, updatedAt: now.toISOString() } }, `launch checklist ${checklist.done}/${checklist.total}${checklist.next ? `, next: ${checklist.next.label}` : ''}`);
    } catch (e) { fail(`launch checklist ${slug}`, e); }
  }
  writePstate();

  /** Ideas ordered by how close they are to money (lib/revenue.js revenueScore). */
  const byRevenue = (entries) => REV.rankByRevenue(entries.map(([slug, s]) => [slug, s, { plan: readPlan(path.join(IDEAS, slug)), signups: signals.get(slug)?.signups ?? 0 }]));
  const mvpMode = (policy.build.mode || 'milestone') === 'mvp';

  // The record → RepoHQ's Ideas page (only ideas whose content changed), and the heartbeat.
  const syncRepoHQ = async () => {
    if (!sql) return;
    try {
      const synced = await R.syncIdeas(sql, ideaDirs().map((slug) => R.ideaRecord(path.join(IDEAS, slug), slug, rows.get(slug)?.url)));
      if (synced.length) out.synced = [...new Set([...(out.synced || []), ...synced])];
    } catch (e) { fail('repohq sync', R.explain(e)); }
    await R.heartbeat(sql, { at: new Date().toISOString(), ok: out.errors.length === 0, errors: out.errors, policy }).catch(() => {});
  };

  let builtThisTick = false;
  const startBuild = async (slug, milestone, opts = {}) => {
    builtThisTick = true;
    const { buildOne } = require('./idea-build');
    // A build holds the tick for up to an hour: sync and beat first, so the Ideas page is current meanwhile.
    await syncRepoHQ();
    let r;
    try { r = await buildOne(slug, { milestone, ...opts }); } catch (e) {
      // A crash (clone, push, gh) mustn't leave the idea "running" forever: record it as failed.
      const dir = path.join(IDEAS, slug);
      const s = P.readState(dir);
      const reason = String(e && (e.stderr || e.message) || e).slice(0, 300);
      if (s.build?.status === 'running') P.writeState(dir, { ...s, stage: s.stage === 'live' ? 'live' : milestone === 'M1' ? 'repo' : 'building', build: { ...s.build, status: 'failed', reason } });
      r = { ok: false, slug, milestone, reason };
    }
    changed.add(slug);
    if (r.ok) note(slug, `${milestone} PR ${r.prUrl} (tests ${r.testsPassing ? 'passing' : 'failing'}, ${r.engine === 'free' ? 'free-pool backup' : `Claude subscription${r.model ? ` ${r.model}` : ''}`}${opts.manual ? ', started from the Ideas page' : ''})`); else fail(`build ${slug} ${milestone}`, r.reason);
    // A weekly-slot build answers any "Start build now" still waiting for this idea.
    if (!opts.manual && sql) {
      await R.settleBuildRequests(sql, slug, { ok: r.ok, result: r.ok ? `${milestone} PR opened by the weekly build slot` : `the weekly build slot tried ${milestone}: ${String(r.reason).slice(0, 200)}`, prUrl: r.prUrl || null })
        .catch((e) => { if (!R.isMissingTable(e)) fail(`settle build requests ${slug}`, e); });
    }
    return r;
  };

  /** 4c. The oldest "Start build now" request the cap allows. True when a build ran this tick. */
  const runBuildRequest = async () => {
    const { manualBuildTarget, mvpMilestones, buildMessage } = require('./idea-build');
    const cap = policy.build.manualPerDay ?? 2;
    for (const req of await R.pendingBuildRequests(sql)) {
      const dir = path.join(IDEAS, req.slug);
      if (!fs.existsSync(path.join(dir, 'idea.json'))) { await R.finishBuildRequest(sql, req.id, 'failed', { result: 'no such idea in the record' }); continue; }
      const roadmap = fs.existsSync(path.join(dir, 'ROADMAP.md')) ? fs.readFileSync(path.join(dir, 'ROADMAP.md'), 'utf8') : '';
      // milestone "MVP" on the request: build every remaining milestone in one run.
      // "GOLIVE": make it launch-ready (lib/golive.js).
      const target = req.milestone === 'MVP' ? mvpMilestones(P.readState(dir), roadmap, policy.build.mvp?.maxMilestones ?? 6)
        : req.milestone === 'GOLIVE' ? GL.goLiveTarget(P.readState(dir)) : manualBuildTarget(P.readState(dir), roadmap);
      if (!target.ok) {
        await R.finishBuildRequest(sql, req.id, 'failed', { result: `can't build: ${target.reason}` });
        note(req.slug, `build request refused: ${target.reason}`);
        continue;
      }
      const used = await R.manualStartsSince(sql, 24);
      if (used >= cap) {
        await R.noteBuildRequest(sql, req.id, `waiting: ${used} manual builds started in the last 24 h (the cap is ${cap})`);
        return false;
      }
      if (!(await R.claimBuildRequest(sql, req.id, target.milestone))) continue; // withdrawn meanwhile
      const r = await startBuild(req.slug, target.milestone, { manual: true, note: req.note || '', ...(target.milestone === 'MVP' ? { mvp: true } : {}), ...(target.milestone === 'GOLIVE' ? { golive: true } : {}) });
      await R.finishBuildRequest(sql, req.id, r.ok ? 'done' : 'failed', {
        result: r.ok ? `${target.milestone === 'MVP' ? `MVP (${(r.completed || []).join(', ') || 'nothing complete'})` : target.milestone === 'GOLIVE' ? 'Go-live' : target.milestone} PR opened, tests ${r.testsPassing ? 'passing' : 'failing'}${r.stopped ? `; stopped: ${r.stopped}` : ''}` : String(r.reason || 'build failed'),
        prUrl: r.prUrl || null, engine: r.ok ? (r.engine === 'free' ? `free pool (${r.model || 'free-agent'})` : `${r.model || policy.build.model}${policy.build.effort ? ` · ${policy.build.effort}` : ''}`) : null,
      }).catch((e) => fail(`build request ${req.id}`, R.explain(e)));
      try { S.notify('slack', buildMessage({ slug: req.slug, milestone: target.milestone, r, effort: policy.build.effort })); } catch (e) { fail(`notify build ${req.slug}`, e); }
      return true;
    }
    return false;
  };

  // Daily steps.
  const dailyNow = forceDaily || dailyDue(pstate.lastDaily, now);

  // 4a. Milestone PRs merged or closed (every tick, so the next build is offered right away). A merge
  // marks the milestones that build completed as done (an MVP run's `milestones`, else its milestone).
  // Live products too: step 5 keeps them "live" while a go-live or growth PR is open.
  for (const slug of ideaDirs()) {
    const s = P.readState(path.join(IDEAS, slug));
    if (!['building', 'live'].includes(s.stage) || s.build?.status !== 'pr-open' || !s.build.prUrl) continue;
    let prState = null;
    try { prState = JSON.parse(execFileSync('gh', ['pr', 'view', s.build.prUrl, '--json', 'state'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).state; } catch { continue; }
    const m = s.build.milestone || 'M1';
    const doneNow = (Array.isArray(s.build.milestones) ? s.build.milestones : [m]).filter((x) => x !== 'MVP' && x !== 'GOLIVE');
    if (prState === 'MERGED' && m === 'GOLIVE') save(slug, { ...s, build: { ...s.build, status: 'merged' }, golive: { mergedAt: now.toISOString(), prUrl: s.build.prUrl } }, 'go-live merged: launch-ready changes are in; the live audit takes it from here');
    else if (prState === 'MERGED') save(slug, { ...s, build: { ...s.build, status: 'merged' }, milestonesDone: [...new Set([...(s.milestonesDone || []), ...doneNow])] }, `${m === 'MVP' ? `MVP (${doneNow.join(', ')})` : m} merged`);
    // A merged PR settles its build: a "tests failing" failure logged when it opened would otherwise
    // stay "failing now" in RepoHQ until some other build of that milestone succeeded (tiebreak, 2026-10-12).
    if (prState === 'MERGED') emit({ component: 'build', event: m, status: 'ok', subject: { idea: slug }, message: `${slug}: ${m === 'MVP' ? `MVP (${doneNow.join(', ')})` : m === 'GOLIVE' ? 'go-live' : m} PR merged ${s.build.prUrl}` });
    else if (prState === 'CLOSED') save(slug, { ...s, build: { ...s.build, status: 'closed' } }, `${m} PR closed without merging`);
  }

  // 4c. "Start build now" requests come first; a tick runs at most one build.
  let manualRan = false;
  if (sql) {
    try { manualRan = await runBuildRequest(); } catch (e) { fail('build requests', R.explain(e)); }
  }

  // 4b. An idea David approved (Notion Build, or the Ideas page) is built now, not at the next daily
  // run: approving is the signal he wants it. Still at most policy.build.maxPerWeek, and not while new
  // builds are held (policy.build.startNew, P.newBuildsHeld).
  if (!dailyNow && !manualRan) {
    const all = ideaDirs().map((slug) => [slug, P.readState(path.join(IDEAS, slug))]);
    const approved = P.newBuildsHeld(policy, all) ? [] : byRevenue(all.filter(([, s]) => s.ownerApproved && buildable(s)));
    if (approved.length && P.buildsThisWeek(all.map(([, s]) => s), now) < policy.build.maxPerWeek) await startBuild(approved[0][0], mvpMode ? 'MVP' : 'M1', mvpMode ? { mvp: true } : {});
  }

  // Go-live by itself once an MVP is complete (lib/golive.js goLiveDue): closest to money first, at
  // most policy.golive.maxPerDay, never on a tick that already built.
  if (!builtThisTick && policy.golive?.auto !== false) {
    const today = now.toLocaleDateString('en-CA');
    const runs = pstate.goliveRuns?.date === today ? pstate.goliveRuns.runs : 0;
    const due = byRevenue(ideaDirs().map((slug) => [slug, P.readState(path.join(IDEAS, slug))]).filter(([, s]) => GL.goLiveDue(s)));
    if (due.length && runs < (policy.golive?.maxPerDay ?? 1)) {
      pstate.goliveRuns = { date: today, runs: runs + 1 };
      writePstate();
      await startBuild(due[0][0], 'GOLIVE', { golive: true });
    }
  }

  if (dailyNow) {
    out.daily = true;
    // a. Reviews.
    const { reviewOne, pendingSlugs } = require('./idea-review');
    for (const slug of pendingSlugs().slice(0, policy.review.maxPerDay)) {
      const r = await reviewOne(slug);
      if (!r.ok) { fail(`review ${slug}`, r.reason); continue; }
      changed.add(slug); note(slug, `reviewed: ${r.review.verdict} ${r.review.score}/10`);
      await postReview(slug);
    }
    // b. Landing pages for new Validate ideas, within the cap.
    landingPages();
    const states = ideaDirs().map((slug) => [slug, P.readState(path.join(IDEAS, slug))]);
    // c. Builds: Claude Code on the subscription first, the free pool only as backup (idea-build.js).
    // A merged milestone PR moves the idea on to its next milestone; M1 for new repos. One a week.
    // (Merged milestone PRs are picked up every tick, in 4a.)
    const { nextMilestone } = require('./idea-build');
    const fresh = ideaDirs().map((slug) => [slug, P.readState(path.join(IDEAS, slug))]);
    const nextOf = (slug, s) => nextMilestone(fs.existsSync(path.join(IDEAS, slug, 'ROADMAP.md')) ? fs.readFileSync(path.join(IDEAS, slug, 'ROADMAP.md'), 'utf8') : '', s.milestonesDone || []);
    // Closest to money first (revenueScore); an MVP run builds everything left, else the next milestone.
    // While new builds are held (P.newBuildsHeld), only ideas already being built are continued.
    const firstBuilds = P.newBuildsHeld(policy, fresh) ? [] : fresh.filter(([, s]) => buildable(s));
    const queue = byRevenue([...firstBuilds, ...fresh.filter(([slug, s]) => s.stage === 'building' && s.build?.status === 'merged' && nextOf(slug, s))])
      .map(([slug, s]) => [slug, mvpMode ? 'MVP' : (buildable(s) ? 'M1' : nextOf(slug, s))]);
    if (!manualRan && queue.length && P.buildsThisWeek(fresh.map(([, s]) => s), now) < policy.build.maxPerWeek) {
      const [slug, milestone] = queue[0];
      await startBuild(slug, milestone, milestone === 'MVP' ? { mvp: true } : {});
    }
    // In memory too: a later writePstate() (the revenue cap, the tick's failure flag) would otherwise write
    // the old date back, and the daily steps would run again on the next tick.
    pstate.lastDaily = now.toLocaleDateString('en-CA');
    writePstate();
  }

  // 5c. The road-to-revenue plan for an idea whose M1 is merged and that has none yet: one per tick, only
  // on a tick that didn't build (a build already held it long), at most policy.revenue.maxPerDay.
  if (!builtThisTick) {
    const cap = policy.revenue?.maxPerDay ?? 2;
    const today = now.toLocaleDateString('en-CA');
    const runsToday = pstate.revenue?.date === today ? pstate.revenue.runs : 0;
    const due = ideaDirs().find((slug) => {
      const s = P.readState(path.join(IDEAS, slug));
      return ['building', 'live'].includes(s.stage) && (s.milestonesDone || []).includes('M1') && !fs.existsSync(path.join(IDEAS, slug, 'revenue.json'));
    });
    if (due && runsToday < cap) {
      pstate.revenue = { date: today, runs: runsToday + 1 };
      writePstate();
      const { revenueOne } = require('./idea-revenue');
      const r = await revenueOne(due);
      changed.add(due);
      if (r.ok) note(due, `revenue plan: ${REV.priceText(r.plan.price)} · ${r.plan.buyer.slice(0, 80)}`); else fail(`revenue plan ${due}`, r.reason);
    }
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
  // Quiet ticks aren't logged, except the first good one after a failure: RepoHQ shows the failure
  // as "failing now" until an ok tick arrives.
  const recovered = out.ok && pstate.tickFailed;
  if (!out.ok || out.changes.length || out.daily || recovered) emit({ component: 'pipeline', event: 'tick', status: out.ok ? 'ok' : 'fail', durationMs: Date.now() - now.getTime(),
    message: out.ok ? `${out.changes.length} change(s)${out.daily ? ', daily steps ran' : ''}${recovered ? '; recovered' : ''}` : out.errors.join('; ').slice(0, 1500),
    data: { changes: out.changes.slice(0, 20), daily: !!out.daily } });
  if (!!pstate.tickFailed !== !out.ok) { pstate.tickFailed = !out.ok; writePstate(); }
  return out;
}

// `policy` is exported so the tick tests can change a setting (policy.build.startNew) for one test.
module.exports = { ownerOverride, dailyDue, buildable, STAGE_TO_STATUS, tick, policy };

if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd !== 'tick') { console.log(JSON.stringify({ ok: false, error: 'usage: idea-pipeline.js tick [--daily]' })); process.exit(1); }
  if (!lock()) { console.log(JSON.stringify({ ok: true, skipped: 'another run is in progress' })); process.exit(0); }
  tick({ forceDaily: rest.includes('--daily') })
    .then((o) => { console.log(JSON.stringify(o)); if (!o.ok) process.exitCode = 1; })
    .catch((e) => { console.log(JSON.stringify({ ok: false, error: e.message })); process.exitCode = 1; })
    .finally(() => fs.rmSync(LOCK, { force: true }));
}
