#!/usr/bin/env node
// idea-build-job.js — one build in its own process, so several run at once (lib/build-slots.js,
// policy.build.concurrency; David's call on 2026-10-13). The tick starts it detached and moves on.
// This process runs the build (buildOne), then answers what started it: the request row and Slack for
// "Start build now", any request still waiting on the idea for a build the pipeline started itself, the
// experiment for a growth build. It leaves its result for the next tick, which logs it and commits the
// record, syncs its own idea to RepoHQ's Ideas page right away, and frees its slot.
//
//   node bin/idea-build-job.js <job.json>      (the tick writes the job file: .builds/job-<slug>.json)
const fs = require('fs');
const path = require('path');
const P = require('../lib/pipeline');
const R = require('../lib/repohq');
const S = require('../lib/seeds');
const BS = require('../lib/build-slots');
const { emit } = require('../lib/events');

const ROOT = path.resolve(__dirname, '..');
const DATA = process.env.IDEA_PIPELINE_DATA || ROOT;
const IDEAS = path.join(DATA, 'ideas');
const SLOTS = path.join(DATA, '.builds');
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'policy.json'), 'utf8'));

/** What the request row says about a build: "MVP (M1, M2) PR opened, tests passing", or why it failed. */
function requestResult(milestone, r) {
  if (!r.ok) return String(r.reason || 'build failed');
  const what = milestone === 'MVP' ? `MVP (${(r.completed || []).join(', ') || 'nothing complete'})` : milestone === 'GOLIVE' ? 'Go-live' : milestone;
  return `${what} PR opened, tests ${r.testsPassing ? 'passing' : 'failing'}${r.stopped ? `; stopped: ${r.stopped}` : ''}`;
}

function engineText(r) {
  if (!r.ok) return null;
  return r.engine === 'free' ? `free pool (${r.model || 'free-agent'})` : `${r.model || policy.build.model}${policy.build.effort ? ` · ${policy.build.effort}` : ''}`;
}

/**
 * Runs one job {slug, milestone, opts, kind: 'request' | 'auto' | 'growth', requestId, startedAt} and
 * writes its result for the tick. The tick tests run it in-process (IDEA_BUILD_INLINE).
 */
async function runJob(job, { sql = null } = {}) {
  const { buildOne, buildMessage } = require('./idea-build');
  const { slug, milestone, opts = {}, kind, requestId = null } = job;
  const dir = path.join(IDEAS, slug);
  const errors = [];
  const fail = (step, e) => errors.push(`${step}: ${String(e && (e.stderr || e.message) || e).slice(0, 300)}`);
  let r;
  try { r = await buildOne(slug, { milestone, ...opts }); } catch (e) {
    // A crash (clone, push, gh) mustn't leave the idea "running" forever: record it as failed.
    const s = P.readState(dir);
    const reason = String(e && (e.stderr || e.message) || e).slice(0, 300);
    if (s.build?.status === 'running') P.writeState(dir, { ...s, stage: s.stage === 'live' ? 'live' : milestone === 'M1' ? 'repo' : 'building', build: { ...s.build, status: 'failed', reason } });
    r = { ok: false, slug, milestone, reason };
  }
  if (kind === 'request' && requestId && sql) {
    await R.finishBuildRequest(sql, requestId, r.ok ? 'done' : 'failed', { result: requestResult(milestone, r), prUrl: r.prUrl || null, engine: engineText(r) })
      .catch((e) => fail(`build request ${requestId}`, R.explain(e)));
    try { S.notify('slack', buildMessage({ slug, milestone, r, effort: policy.build.effort })); } catch (e) { fail(`notify build ${slug}`, e); }
  } else if (kind === 'auto' && sql) {
    // A build the pipeline started itself answers any "Start build now" still waiting for this idea.
    await R.settleBuildRequests(sql, slug, { ok: r.ok, result: r.ok ? `${milestone} PR opened by an automatic build` : `an automatic build tried ${milestone}: ${String(r.reason).slice(0, 200)}`, prUrl: r.prUrl || null })
      .catch((e) => { if (!R.isMissingTable(e)) fail(`settle build requests ${slug}`, e); });
  } else if (kind === 'growth' && opts.growth?.experiment) {
    // The experiment gets its PR; a run that failed is tried again the next day (lib/growth.js failedRun).
    const exp = opts.growth.experiment;
    // At the usage limit it's paused, not failed: tried again first once the limit resets (lib/plan.js).
    const change = r.ok && r.prUrl ? { prUrl: r.prUrl } : { status: 'abandoned', failed: true, ...(r.usageLimited ? { paused: true } : {}), reason: String(r.reason || 'no PR was opened').slice(0, 300) };
    const cur = P.readState(dir);
    P.writeState(dir, { ...cur, growth: { ...cur.growth, experiments: (cur.growth?.experiments || []).map((e) => (e.id === exp.id ? { ...e, ...change, updatedAt: new Date().toISOString() } : e)) } });
  }
  // The Ideas page shows the outcome now, not at the next tick. Only this idea: nothing else is pruned.
  if (sql) await R.syncIdeas(sql, [R.ideaRecord(dir, slug)], { prune: false }).catch((e) => fail('repohq sync', R.explain(e)));
  const result = {
    slug, milestone, kind, ok: !!r.ok, prUrl: r.prUrl || null, testsPassing: !!r.testsPassing, engine: r.engine || null, model: r.model || null,
    reason: r.ok ? null : String(r.reason || 'build failed').slice(0, 300), ...(r.usageLimited ? { usageLimited: true, resumeAt: r.resumeAt } : {}), errors, startedAt: job.startedAt || null, at: new Date().toISOString(),
  };
  BS.writeResult(SLOTS, result);
  return result;
}

module.exports = { runJob, requestResult };

if (require.main === module) {
  const file = process.argv[2];
  let job;
  try { job = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
    console.log(JSON.stringify({ ok: false, error: `usage: idea-build-job.js <job.json> (${e.message})` }));
    process.exit(1);
  }
  let sql = null;
  try { sql = R.connect(); } catch (e) { console.log(JSON.stringify({ warning: `no database: ${e.message}` })); }
  // The slot names this process (the tick writes the same one right after starting it).
  BS.writeSlot(SLOTS, { slug: job.slug, milestone: job.milestone, kind: job.kind, requestId: job.requestId ?? null, pid: process.pid, startedAt: job.startedAt });
  runJob(job, { sql })
    .then((r) => console.log(JSON.stringify({ ok: r.ok, slug: r.slug, milestone: r.milestone, prUrl: r.prUrl, reason: r.reason })))
    .catch(async (e) => {
      const reason = `the build job crashed: ${String(e && e.message || e).slice(0, 300)}`;
      emit({ component: 'build', event: job.milestone, status: 'fail', subject: { idea: job.slug }, message: reason });
      const dir = path.join(IDEAS, job.slug);
      try {
        const s = P.readState(dir);
        if (s.build?.status === 'running') P.writeState(dir, { ...s, stage: s.stage === 'live' ? 'live' : (s.milestonesDone || []).length ? 'building' : 'repo', build: { ...s.build, status: 'failed', reason } });
      } catch { /* the tick's stale-slot check covers it */ }
      if (sql && job.requestId) await R.finishBuildRequest(sql, job.requestId, 'failed', { result: reason }).catch(() => {});
      BS.writeResult(SLOTS, { slug: job.slug, milestone: job.milestone, kind: job.kind, ok: false, reason, errors: [], startedAt: job.startedAt || null, at: new Date().toISOString() });
      console.log(JSON.stringify({ ok: false, error: reason }));
      process.exitCode = 1;
    })
    .finally(() => {
      BS.removeSlot(SLOTS, job.slug);
      fs.rmSync(file, { force: true });
    });
}
