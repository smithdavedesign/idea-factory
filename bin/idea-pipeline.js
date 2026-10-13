#!/usr/bin/env node
// idea-pipeline.js — runs the idea lifecycle (lib/pipeline.js) end to end. launchd: every 15 minutes.
//
//   node bin/idea-pipeline.js tick            # cheap steps every time; the daily steps once a day after 09:30
//   node bin/idea-pipeline.js tick --daily    # force the daily steps now
//
// Every tick (no model calls):
//   0. Decisions from RepoHQ's Ideas page (Build, Demand test, Pass) → state: David's call wins over any
//      verdict (applyDecision). New ideas typed there → the research queue (seeds.jsonl, like "idea: …"
//      on Slack/WhatsApp) (lib/repohq.js).
//  0c. Ideas David sent are researched and reviewed now (Claude Pro, policy.research.seeded), and the
//      verdict goes back where he sent it (lib/seeds.js). The one model call outside the daily steps.
//   2. Demand signals from RepoHQ (idea_signals) → state; each built product's funnel (visits,
//      activations, Buy clicks, sources) → state.funnel (lib/growth.js).
//   3. Validation decisions (policy.json): build / pass / extend.
//   4. Promote: ideas at stage "build" get their private repo (stage repo).
//   5. Revenue: MRR and lifecycle of idea repos from RepoHQ; RepoHQ marks new idea repos "building".
//   6. Commit the record.
//   7. The record → RepoHQ (ideas, idea_pipeline) for the Ideas page, which is the board (no Notion
//      since 2026-10-12).
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
//  4a0. Autonomy (lib/autonomy.js, policy.autonomy): the pipeline merges its own PRs once tests and checks
//      are green, closes failed growth PRs (retried the next day), leaves the rest for David; a merge that
//      breaks the live site's launch checks is reverted (5b).
//  5d. The growth loop (lib/growth.js, policy.growth): each focus product's growth record every tick; once a
//      day per product, the funnel's bottleneck starts one mission: a growth build (draft PR) or a launch
//      kit (bin/idea-growth.js, posts David publishes). A merged growth PR starts its experiment (4a).
//      When its window ends, the experiment is judged: LEARNINGS.md, a PLAYBOOK.md proposal, or a revert.
// Daily (Claude Pro subscription, capped by policy):
//   a. Review new ideas with the gstack frameworks (bin/idea-review.js) → Validate or Pass.
//   b. Landing page for each new Validate idea (pages/<slug>/), deployed to the free pages project.
//   c. Build M1 for a new repo, tests first (bin/idea-build.js), at most policy.build.maxPerWeek.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const P = require('../lib/pipeline');
const pub = require('./idea-publish');
const { emit } = require('../lib/events');
const R = require('../lib/repohq');
const S = require('../lib/seeds');
const REV = require('../lib/revenue');
const LF = require('../lib/launch-facts');
const GL = require('../lib/golive');
const A = require('../lib/autonomy');
const { commitAuthor } = require('../lib/author');
const G = require('../lib/growth');

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

/**
 * What a decision from RepoHQ's Ideas page does to an idea (pure): {state, what}, or {error} when the
 * idea moved on since RepoHQ checked it (RepoHQ's checkDecision is the same rules).
 *   build: an idea, demand test or passed idea goes to "build" (its repo is created on this tick); an
 *     approved idea whose repo exists has its M1 build approved.
 *   validate: a reviewed idea or passed idea goes to a demand test. Its landing page needs the review's
 *     copy, so an unreviewed idea can't; one that ran a test before gets a fresh window.
 *   pass: anything not passed yet is passed.
 * A decision matching where the idea already is (agreeing with the review's pass) is recorded, so the
 * Ideas page and the morning report stop asking.
 */
function applyDecision(state, d, { reviewed = true, now = new Date() } = {}) {
  const ownerDecision = { decision: d.decision, at: now.toISOString(), source: 'repohq', ...(d.note ? { note: d.note } : {}) };
  const stage = state.stage || 'idea';
  if (d.decision === 'pass') {
    return stage === 'pass'
      ? { state: { ...state, ownerDecision }, what: 'owner confirmed Pass (RepoHQ Ideas page)' }
      : { state: { ...state, stage: 'pass', passReason: 'owner', ownerDecision }, what: 'owner set Pass (RepoHQ Ideas page)' };
  }
  if (d.decision === 'build') {
    if (['idea', 'validate', 'pass'].includes(stage)) return { state: { ...state, stage: 'build', ownerApproved: true, ownerDecision }, what: 'owner set Build (RepoHQ Ideas page)' };
    if (stage === 'build') return { state: { ...state, ownerApproved: true, ownerDecision }, what: 'owner confirmed Build (RepoHQ Ideas page)' };
    if (stage === 'repo' && !state.ownerApproved) return { state: { ...state, ownerApproved: true, ownerDecision }, what: 'owner approved the M1 build (RepoHQ Ideas page)' };
    return { error: stage === 'live' ? 'already live' : 'already approved and past the build decision' };
  }
  if (d.decision === 'validate') {
    if (stage === 'validate') return { state: { ...state, ownerDecision }, what: 'owner confirmed the demand test (RepoHQ Ideas page)' };
    if (!['idea', 'pass'].includes(stage)) return { error: 'only an idea that is not yet being built can go to a demand test' };
    if (!reviewed) return { error: "a demand test needs the review's landing-page copy; the review runs daily at 09:30" };
    return {
      state: { ...state, stage: 'validate', ownerDecision, ...(state.page ? { validation: P.startValidation(now, policy) } : {}) },
      what: 'owner set Validate (RepoHQ Ideas page)',
    };
  }
  return { error: `unknown decision "${d.decision}"` };
}

/**
 * An idea gets an M1 build when its repo exists, it hasn't been built, and either the review didn't
 * say pass or David approved it himself (Build on the Ideas page). Ideas made repos by the old
 * pipeline, before reviews existed, wait for one of those.
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

function deployPages() {
  const out = execFileSync('vercel', ['deploy', '--prod', '--yes', '--scope', policy.vercelScope], { cwd: PAGES, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 300_000 });
  return /Aliased|ready/.test(out);
}

function commitRecord(message) {
  try {
    // PLAYBOOK.md: the growth loop proposes rules there from kept experiments.
    pub.git(['add', '--', 'ideas', 'pages', ...(fs.existsSync(path.join(DATA, 'PLAYBOOK.md')) ? ['PLAYBOOK.md'] : [])]);
    pub.git(['commit', '-q', '-m', message]);
  } catch { return null; } // nothing to commit
  try { pub.git(['pull', '-q', '--rebase', '--autostash']); } catch {}
  pub.git(['push', '-q']);
  return pub.git(['rev-parse', '--short', 'HEAD']);
}

/** `forceGrowth`: the growth step (5d) ignores policy.growth.notBefore; its caps still hold (`--growth`). */
async function tick({ forceDaily = false, forceGrowth = false } = {}) {
  const now = new Date();
  const out = { at: now.toISOString(), changes: [], errors: [] };
  const note = (slug, what) => out.changes.push(`${slug}: ${what}`);
  const fail = (step, e) => out.errors.push(`${step}: ${String(e && (e.stderr || e.message) || e).slice(0, 300)}`);
  const changed = new Set();
  const save = (slug, state, what) => { P.writeState(path.join(IDEAS, slug), state, now); changed.add(slug); note(slug, what); };
  /**
   * Undo a PR an agent merged (lib/autonomy.js revertSteps, policy.autonomy.revert): a revert commit on a
   * branch, a PR that says why, merged. {ok, url} or {ok: false}. A revert because the live site broke
   * (`breakage`) is logged as a failure, so Slack hears of it, and as recovered once the site passes its
   * launch checks again (5b); one the judge decided on is news for the morning email only.
   */
  const revertMerged = (slug, prUrl, reason, { breakage = false } = {}) => {
    const full = P.readState(path.join(IDEAS, slug)).repo.replace('https://github.com/', '');
    const work = path.join(DATA, 'work', `revert-${slug}`);
    const gh = (args) => String(execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000 }));
    try {
      const pr = JSON.parse(gh(['pr', 'view', prUrl, '--json', 'number,title,mergeCommit']));
      const sha = pr.mergeCommit?.oid;
      if (!sha) throw new Error(`${prUrl} has no merge commit`);
      const parents = Number(gh(['api', `repos/${full}/commits/${sha}`, '--jq', '.parents | length']).trim()) || 1;
      fs.rmSync(work, { recursive: true, force: true });
      let url = null;
      for (const [cmd, args, cwd] of A.revertSteps({ repoFull: full, prUrl, number: pr.number, title: pr.title, sha, parents, reason, work, author: commitAuthor({ exec: execFileSync }) })) {
        const out = String(execFileSync(cmd, args, { cwd: cwd || DATA, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180_000 }));
        if (cmd === 'gh' && args[0] === 'pr' && args[1] === 'create') url = out.trim() || null;
      }
      emit({ component: 'autonomy', event: 'revert', status: breakage ? 'fail' : 'info', subject: { idea: slug, pr: prUrl }, message: `${slug}: reverted ${prUrl}: ${reason}${url ? ` (${url})` : ''}` });
      return { ok: true, url };
    } catch (e) { fail(`revert ${slug} ${prUrl}`, e); return { ok: false }; }
    finally { fs.rmSync(work, { recursive: true, force: true }); }
  };
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

  // 0. Decisions from RepoHQ's Ideas page apply on this tick: David's call wins over any verdict.
  if (sql) {
    try {
      for (const d of await R.pendingDecisions(sql)) {
        const dir = path.join(IDEAS, d.slug);
        if (!fs.existsSync(path.join(dir, 'idea.json'))) { await R.finishDecision(sql, d.id, 'failed', 'no such idea in the record'); continue; }
        const r = applyDecision(P.readState(dir), d, { reviewed: fs.existsSync(path.join(dir, 'review.json')), now });
        if (r.error) { await R.finishDecision(sql, d.id, 'failed', r.error); continue; }
        if (!(await R.claimDecision(sql, d.id, r.what))) continue; // withdrawn meanwhile
        save(d.slug, r.state, r.what);
      }
    } catch (e) { fail('decisions', R.explain(e)); }
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
        const { reviewOne } = require('./idea-review');
        const rv = await reviewOne(slug);
        let pageUrl = null;
        if (rv.ok) {
          note(slug, `reviewed now: ${rv.review.verdict} ${rv.review.score}/10`);
          if (P.readState(dir).stage === 'validate') pageUrl = landingPages().find((p) => p.slug === slug)?.url ?? null;
        } else fail(`review ${slug}`, rv.reason);
        try {
          const to = S.notify(source, S.seedMessage({ idea, slug, review: rv.ok ? rv.review : null, reviewError: rv.reason, pageUrl }));
          note(slug, `verdict sent to ${to.channel}`);
        } catch (e) { fail(`notify ${slug}`, e); }
      } else if (seedNow.status === 'done' && seedNow.slug) {
        // Research found it's already recorded (idea-publish marks the seed with that idea's slug).
        try { S.notify(seedNow.source, `💡 That idea is already recorded: ${S.IDEAS_PAGE}/${seedNow.slug}`); } catch (e) { fail('notify seed', e); }
        note('seeds', `${oldest.id} already recorded as ${seedNow.slug}`);
      } else {
        // research.js logged and alerted the failure; the seed waits policy.research.seeded.retryMinutes.
        note('seeds', `${oldest.id} not researched yet: ${String(r.reason).slice(0, 160)}`);
      }
    }
  }

  // 2–3. Demand signals and validation decisions, and each built product's funnel (lib/growth.js).
  let signals = new Map();
  if (sql) {
    try {
      const funnels = await R.funnelBySlug(sql);
      signals = new Map([...funnels].map(([slug, row]) => [slug, G.signalsOf(row)]));
      for (const slug of ideaDirs()) {
        const dir = path.join(IDEAS, slug);
        const state = P.readState(dir);
        if (G.tracksFunnel(state, funnels.get(slug))) {
          const funnel = G.funnelOf(funnels.get(slug), state);
          if (!G.sameFunnel(state.funnel, funnel)) save(slug, { ...state, funnel: { at: now.toISOString(), ...funnel } }, `funnel: ${G.funnelText(funnel)}`);
          continue;
        }
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

  // 4. Promote: ideas at stage "build" (approved this tick or by a demand test) → private repo.
  try {
    const res = await pub.promote();
    for (const p of res.promoted) {
      const dir = path.join(IDEAS, p.slug);
      if (fs.existsSync(dir)) save(p.slug, { ...P.readState(dir), stage: 'repo', repo: p.repoUrl }, `repo created ${p.repoUrl}`);
    }
    for (const e of res.errors) fail(`promote ${e.slug}`, e.error);
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
      // RepoHQ may not have synced a new repo yet: then ask GitHub. A homepage that's set is never
      // overwritten, except one of the project's own Vercel addresses that isn't its production URL: a
      // team or deployment address behind Vercel's login (codespend's, 2026-10-12).
      const ghHomepage = () => { try { return JSON.parse(execFileSync('gh', ['repo', 'view', full, '--json', 'homepageUrl'], { encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'ignore'] })).homepageUrl || ''; } catch { return null; } };
      // RepoHQ's copy can lag GitHub (a homepage set minutes ago reads as ''), so only a non-empty
      // homepage there counts; otherwise GitHub decides. (2026-10-12: tiebreak's was overwritten.)
      const homepageNow = () => (row?.homepage ? row.homepage : ghHomepage());
      const project = full.split('/')[1];
      const misplaced = (h) => !!h && h !== prodUrl && GL.ownVercelAddress(h, project);
      let homepage = prodUrl ? homepageNow() : null;
      // RepoHQ's copy of a homepage the pipeline just moved stays old for hours: GitHub has the last word.
      if (misplaced(homepage) && row?.homepage) homepage = ghHomepage();
      if (prodUrl && ((!pstate.prod[slug].homepageSet && homepage === '') || misplaced(homepage))) {
        try {
          execFileSync('gh', ['repo', 'edit', full, '--homepage', prodUrl], { stdio: 'ignore', timeout: 30_000 });
          pstate.prod[slug].homepageSet = true;
          note(slug, misplaced(homepage) ? `homepage moved to ${prodUrl} (${homepage} is behind Vercel's login)` : `homepage set to ${prodUrl}`);
        } catch (e) { fail(`homepage ${slug}`, e); }
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
        // The site passes again after a breakage revert: the revert's Slack alert is closed ("recovered").
        if (result.ready && pstate.revertAlerts?.[slug]) {
          emit({ component: 'autonomy', event: 'revert', status: 'ok', subject: { idea: slug }, message: `${slug}: the live site passes its launch checks again after the revert of ${pstate.revertAlerts[slug].prUrl}` });
          note(slug, 'the live site passes its launch checks again after the revert');
          delete pstate.revertAlerts[slug];
        }
        if (!result.ready && was === true) {
          note(slug, `launch checks regressed on ${liveNow}: missing ${result.missing.join(', ')}`);
          // An agent's merge in the last day broke the live site: undo it (policy.autonomy.revert).
          const b = state.build || {};
          if (policy.autonomy?.revert && b.mergedBy === 'agent' && b.prUrl && !b.reverted && now - new Date(b.mergedAt) < 24 * 3_600_000) {
            const reason = `the live site's launch checks failed after it merged (missing ${result.missing.join(', ')})`;
            const r = revertMerged(slug, b.prUrl, reason, { breakage: true });
            if (r.ok) {
              // Watched until the site passes again (above); audited again on the next tick, after the redeploy.
              pstate.revertAlerts = { ...(pstate.revertAlerts || {}), [slug]: { at: now.toISOString(), prUrl: b.prUrl } };
              pstate.audit[slug].at = '1970-01-01T00:00:00.000Z';
              const cur = P.readState(dir);
              save(slug, { ...cur, build: { ...cur.build, reverted: { at: now.toISOString(), url: r.url, reason } }, ...(cur.growth ? { growth: G.markReverted(cur.growth, b.prUrl, { url: r.url, reason, now }) } : {}) }, `reverted its own merge ${b.prUrl}: ${reason}`);
            }
          }
        }
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
        activations: state.funnel?.all?.activate ?? 0,
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
      const synced = await R.syncIdeas(sql, ideaDirs().map((slug) => R.ideaRecord(path.join(IDEAS, slug), slug)));
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
    // A weekly-slot build answers any "Start build now" still waiting for this idea. A growth build doesn't:
    // nobody asks for one on the Ideas page.
    if (!opts.manual && !opts.growth && sql) {
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

  // 4a0. Autonomy (lib/autonomy.js, policy.autonomy, David's call on 2026-10-12): the pipeline merges its
  // own PRs once its tests and every check are green. A growth PR that failed is closed, and its mission
  // is tried again the next day. A failed roadmap build, or a PR touching a protected path, waits for
  // David's morning review. After a merge the live site is audited again on the next tick (5b reverts a
  // regression).
  const auto = policy.autonomy || {};
  if (auto.merge) {
    const gh = (args) => String(execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000 }));
    for (const slug of ideaDirs()) {
      const s = P.readState(path.join(IDEAS, slug));
      const b = s.build || {};
      if (b.status !== 'pr-open' || !b.prUrl) continue;
      let pr;
      try { pr = JSON.parse(gh(['pr', 'view', b.prUrl, '--json', 'state,mergeable,statusCheckRollup,files,createdAt'])); } catch { continue; }
      const d = A.mergeDecision({ pr, build: b, protectedPaths: auto.protectedPaths || [], now });
      if (d.action === 'merge') {
        try {
          gh(['pr', 'ready', b.prUrl]);
          try { gh(['pr', 'merge', b.prUrl, '--squash', '--delete-branch']); } catch { gh(['pr', 'merge', b.prUrl, '--merge', '--delete-branch']); }
        } catch (e) { fail(`merge ${slug} ${b.prUrl}`, e); continue; }
        save(slug, { ...s, build: { ...b, mergedBy: 'agent', mergedAt: now.toISOString() } }, `merged its own PR ${b.prUrl} (${d.reason})`);
        emit({ component: 'autonomy', event: 'merge', status: 'info', subject: { idea: slug, pr: b.prUrl }, message: `${slug}: merged ${b.prUrl} (${d.reason})` });
        if (pstate.audit?.[slug]) { pstate.audit[slug].at = '1970-01-01T00:00:00.000Z'; writePstate(); }
      } else if (d.action === 'fail' && b.milestone === 'GROWTH') {
        try { gh(['pr', 'close', b.prUrl, '--comment', `Closed by the growth loop: ${d.reason}. The mission is tried again tomorrow.`]); } catch (e) { fail(`close ${slug} ${b.prUrl}`, e); continue; }
        const growth = { ...s.growth, experiments: (s.growth?.experiments || []).map((e) => (e.id === b.experiment ? { ...e, status: 'abandoned', failed: true, reason: d.reason, updatedAt: now.toISOString() } : e)) };
        save(slug, { ...s, build: { ...b, status: 'closed' }, growth }, `closed its growth PR ${b.prUrl} (${d.reason}); tried again tomorrow`);
      } else if ((d.action === 'fail' || d.action === 'leave') && b.held !== d.reason) {
        // Recorded once; the morning email lists it under what needs David.
        save(slug, { ...s, build: { ...b, held: d.reason } }, `PR left for David: ${d.reason} (${b.prUrl})`);
      }
    }
  }

  // 4a. Milestone PRs merged or closed (every tick, so the next build is offered right away). A merge
  // marks the milestones that build completed as done (an MVP run's `milestones`, else its milestone).
  // Live products too: step 5 keeps them "live" while a go-live or growth PR is open.
  for (const slug of ideaDirs()) {
    const s = P.readState(path.join(IDEAS, slug));
    if (!['building', 'live'].includes(s.stage) || s.build?.status !== 'pr-open' || !s.build.prUrl) continue;
    let prState = null;
    try { prState = JSON.parse(execFileSync('gh', ['pr', 'view', s.build.prUrl, '--json', 'state'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).state; } catch { continue; }
    const m = s.build.milestone || 'M1';
    const doneNow = (Array.isArray(s.build.milestones) ? s.build.milestones : [m]).filter((x) => P.isRoadmapBuild(x) && x !== 'MVP');
    // A growth PR merged starts its experiment's window; closed, the experiment is abandoned (lib/growth.js).
    if (m === 'GROWTH' && (prState === 'MERGED' || prState === 'CLOSED')) {
      const merged = prState === 'MERGED';
      const growth = merged ? G.onMerge(s.growth, s.build.experiment, now) : G.onClose(s.growth, s.build.experiment, now);
      const e = (growth?.experiments || []).find((x) => x.id === s.build.experiment);
      save(slug, { ...s, build: { ...s.build, status: merged ? 'merged' : 'closed' }, growth },
        merged ? `growth PR merged: the ${e?.kind || 'growth'} experiment runs until ${e?.endsAt?.slice(0, 10) || '?'}` : `growth PR closed: the ${e?.kind || 'growth'} experiment is abandoned`);
      if (merged) emit({ component: 'build', event: 'GROWTH', status: 'ok', subject: { idea: slug }, message: `${slug}: growth PR merged ${s.build.prUrl}` });
      continue;
    }
    // A go-live built with the funnel beacon (build.beacon, goLivePrompt step 4) says so: the growth loop
    // doesn't wait for the first visit to know the product is measured (lib/growth.js beaconLive).
    if (prState === 'MERGED' && m === 'GOLIVE') save(slug, { ...s, build: { ...s.build, status: 'merged' }, golive: { mergedAt: now.toISOString(), prUrl: s.build.prUrl, ...(s.build.beacon ? { beacon: s.build.beacon } : {}) } }, 'go-live merged: launch-ready changes are in; the live audit takes it from here');
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

  // 4b. An idea David approved (Build on the Ideas page) is built now, not at the next daily
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
  let planRan = false;
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
      planRan = true;
      const { revenueOne } = require('./idea-revenue');
      const r = await revenueOne(due);
      changed.add(due);
      if (r.ok) note(due, `revenue plan: ${REV.priceText(r.plan.price)} · ${r.plan.buyer.slice(0, 80)}`); else fail(`revenue plan ${due}`, r.reason);
    }
  }

  // 5d. The growth loop (lib/growth.js, RepoHQ docs/growth-loop-prd.md). Every tick, each focus product's
  // growth record is kept current: a kit's experiment runs from its first post, stale proposals are dropped,
  // and the funnel's bottleneck picks the next mission. Once a day per product, on a tick that ran nothing
  // long and within policy.growth's caps, that mission starts: a growth build (a draft PR) or a launch kit
  // (posts David publishes). Owner missions go to the morning email's Today block. Nothing here posts,
  // spends or merges.
  const gp = policy.growth || {};
  const readText = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
  const readLog = (dir) => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'launch-log.json'), 'utf8')); } catch { return null; } };
  // Phase 3: an experiment whose window has ended is judged against the window before it (lib/growth.js
  // judge). The lesson goes to the product's LEARNINGS.md; a kept one is proposed for PLAYBOOK.md; one that
  // made things clearly worse is reverted (policy.autonomy.revert).
  const judgeDue = async (slug, dir, s, experiments) => {
    const out = [];
    for (const e of experiments) {
      if (!['running', 'measuring'].includes(e.status) || !e.endsAt || new Date(e.endsAt) > now) { out.push(e); continue; }
      let r;
      try {
        const span = e.windowDays * 86_400_000;
        const before = await R.funnelWindow(sql, slug, new Date(new Date(e.startedAt).getTime() - span).toISOString(), e.startedAt);
        const after = await R.funnelWindow(sql, slug, e.startedAt, e.endsAt);
        r = G.judge(e, before, after, gp, { page: !!s.page });
      } catch (err) { fail(`judge ${e.id}`, err); out.push(e); continue; }
      if (r.decision === 'extend') {
        out.push({ ...e, status: 'measuring', endsAt: new Date(new Date(e.endsAt).getTime() + e.windowDays * 86_400_000).toISOString(), extensions: (e.extensions ?? 0) + 1, updatedAt: now.toISOString() });
        note(slug, `experiment ${e.id} extended: ${r.note}`);
        continue;
      }
      const alongside = G.ranWith(e, experiments);
      let decided = { ...e, status: 'decided', decision: r.decision, decidedAt: now.toISOString(), updatedAt: now.toISOString(),
        result: { lift: r.lift, value: r.value, before: r.before, sample: r.sample, ...(r.note ? { note: r.note } : {}), ...(alongside.length ? { ranWith: alongside } : {}) } };
      if (r.decision === 'revert' && auto.revert && e.prUrl) {
        const rv = revertMerged(slug, e.prUrl, `the ${G.KINDS[e.kind]?.label || e.kind} experiment made it worse: ${G.valueText(e.metric, r.before)} → ${G.valueText(e.metric, r.value)}`);
        if (rv.ok) decided = { ...decided, reverted: { at: now.toISOString(), url: rv.url } };
      }
      const entry = G.learningEntry(e, r, { now, alongside });
      const learnings = path.join(dir, 'LEARNINGS.md');
      fs.writeFileSync(learnings, G.withLearning(readText(learnings), slug, entry));
      if (r.decision === 'keep') {
        const playbook = path.join(DATA, 'PLAYBOOK.md');
        fs.writeFileSync(playbook, G.withProposal(readText(playbook), `- ${e.hypothesis} (kept on ${slug}, ${now.toISOString().slice(0, 10)}: ${G.valueText(e.metric, r.before ?? e.baseline)} → ${G.valueText(e.metric, r.value)})`));
      }
      emit({ component: 'growth', event: 'decided', status: 'info', subject: { idea: slug }, message: `${slug}: ${entry.slice(2, 400)}` });
      note(slug, `experiment decided: ${G.KINDS[e.kind]?.label || e.kind} → ${r.decision}`);
      changed.add(slug);
      out.push(decided);
    }
    return out;
  };
  for (const slug of gp.focus || []) {
    const dir = path.join(IDEAS, slug);
    if (!fs.existsSync(path.join(dir, 'idea.json'))) continue;
    const s = P.readState(dir);
    const log = readLog(dir);
    let experiments = G.advance(s.growth?.experiments || [], { posts: log?.posts || [], now, gp });
    if (sql) experiments = await judgeDue(slug, dir, s, experiments);
    const b = G.bottleneck({ ...s, growth: { ...s.growth, experiments } }, { kit: G.kitFacts(readText(path.join(dir, 'LAUNCH-KIT.md')), log), gp, now });
    const growth = { ...(s.growth || {}), stage: b.stage, bottleneck: b.bottleneck, next: b.action, experiments };
    if (!G.sameGrowth(s.growth, growth)) save(slug, { ...s, growth: { ...growth, checkedAt: now.toISOString() } }, `growth: ${b.stage}, ${b.bottleneck}${b.action ? `; next: ${b.action.kind} (${b.action.executor})` : ''}`);
  }
  if (!builtThisTick && !planRan && sql && G.growthDue(pstate.growth, now, gp, { force: forceGrowth })) {
    const today = now.toLocaleDateString('en-CA');
    const pg = pstate.growth?.date === today ? pstate.growth : { date: today, runs: 0, slugs: [] };
    const weekBuilds = G.growthBuildsThisWeek(ideaDirs().map((slug) => P.readState(path.join(IDEAS, slug))), now);
    for (const slug of gp.focus || []) {
      const dir = path.join(IDEAS, slug);
      if (pg.slugs.includes(slug) || !fs.existsSync(path.join(dir, 'idea.json'))) continue;
      const s = P.readState(dir);
      const next = s.growth?.next;
      if (!next || next.executor === 'owner' || !G.KINDS[next.kind] || !G.canStart(s)) continue;
      if (next.executor === 'build' && weekBuilds >= (gp.maxBuildsPerWeek ?? 2)) continue;
      const exp = G.newExperiment(slug, next, s, gp, now);
      // Recorded before it starts, so a crash mid-run can't start it twice: the day's counter, then the proposed experiment.
      pstate.growth = { date: today, runs: pg.runs + 1, slugs: [...pg.slugs, slug] };
      writePstate();
      save(slug, { ...s, growth: { ...s.growth, experiments: [...(s.growth?.experiments || []), exp] } }, `growth mission: ${G.KINDS[exp.kind].label} (${exp.executor === 'build' ? 'a draft PR' : 'posts for David'}): ${exp.hypothesis}`);
      const record = (change) => {
        const cur = P.readState(dir);
        P.writeState(dir, { ...cur, growth: { ...cur.growth, experiments: (cur.growth?.experiments || []).map((e) => (e.id === exp.id ? { ...e, ...change, updatedAt: new Date().toISOString() } : e)) } }, now);
        changed.add(slug);
      };
      if (exp.executor === 'build') {
        const task = G.missionTask(exp.kind, { slug, signalUrl: policy.signalUrl });
        // How the same kind of experiment went on other products: their records, never their visitors.
        const others = ideaDirs().filter((x) => x !== slug).flatMap((x) => (P.readState(path.join(IDEAS, x)).growth?.experiments || [])
          .filter((e) => e.kind === exp.kind && e.status !== 'proposed').map((e) => ({ slug: x, hypothesis: e.hypothesis, decision: e.decision, status: e.status, reason: e.reason })));
        const brief = G.brief({ slug, exp, state: s, task, learnings: readText(path.join(dir, 'LEARNINGS.md')), playbook: readText(path.join(DATA, 'PLAYBOOK.md')), others });
        const r = await startBuild(slug, 'GROWTH', { growth: { experiment: exp, task, brief } });
        // A run that failed is tried again the next day (lib/growth.js failedRun); a PR David closes isn't.
        record(r.ok && r.prUrl ? { prUrl: r.prUrl } : { status: 'abandoned', failed: true, reason: String(r.reason || 'no PR was opened').slice(0, 300) });
      } else {
        const { distributionKitOne } = require('./idea-growth');
        let r;
        try { r = await distributionKitOne(slug); } catch (e) { r = { ok: false, reason: String(e.message || e).slice(0, 300) }; }
        if (r.ok) { record({ artifact: 'LAUNCH-KIT.md', channels: r.channels.length }); note(slug, `launch kit ready for David: ${r.channels.join(', ')}`); }
        else { record({ status: 'abandoned', failed: true, reason: String(r.reason).slice(0, 300) }); fail(`growth kit ${slug}`, r.reason); }
      }
      break; // one mission per tick
    }
  }

  // 6. Commit the record.
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
module.exports = { applyDecision, dailyDue, buildable, tick, policy };

if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd !== 'tick') { console.log(JSON.stringify({ ok: false, error: 'usage: idea-pipeline.js tick [--daily] [--growth]' })); process.exit(1); }
  if (!lock()) { console.log(JSON.stringify({ ok: true, skipped: 'another run is in progress' })); process.exit(0); }
  tick({ forceDaily: rest.includes('--daily'), forceGrowth: rest.includes('--growth') })
    .then((o) => { console.log(JSON.stringify(o)); if (!o.ok) process.exitCode = 1; })
    .catch((e) => { console.log(JSON.stringify({ ok: false, error: e.message })); process.exitCode = 1; })
    .finally(() => fs.rmSync(LOCK, { force: true }));
}
