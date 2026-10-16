// The growth loop's pure parts (lib/growth.js): a built product's funnel, and a demand test's counts
// from the same idea_signals rows. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../lib/growth');

// As lib/repohq.js funnelBySlug returns them; "reach" counts each visitor once across view and visit.
const row = {
  kinds: {
    view: { events: 6, d7: 3, prev7: 0, all: 3 },
    reach: { events: 9, d7: 4, prev7: 1, all: 5 },
    visit: { events: 3, d7: 2, prev7: 1, all: 2 },
    activate: { events: 1, d7: 1, prev7: 0, all: 1 },
    signup: { events: 2, d7: 1, prev7: 1, all: 2 },
  },
  referrers7d: [{ host: 'google.com', visitors: 2 }, { host: 'tiebreak-phi.vercel.app', visitors: 1 }, { host: 'direct', visitors: 1 }],
};
const deployed = { launch: { steps: [{ id: 'deployed', done: true, evidence: 'https://tiebreak-phi.vercel.app' }] } };

test('a product without a landing page counts its old home-page views as visits, once per visitor', () => {
  const f = G.funnelOf(row, { stage: 'live', repo: 'r', ...deployed });
  assert.deepEqual(f.d7, { visit: 4, signup: 1, activate: 1, checkout: 0 });
  assert.deepEqual(f.prev7, { visit: 1, signup: 1, activate: 0, checkout: 0 });
  assert.deepEqual(f.all, { visit: 5, signup: 2, activate: 1, checkout: 0 });
  assert.deepEqual(f.seen, { visit: true, activate: true, checkout: false });
  assert.deepEqual(f.referrers7d, [{ host: 'google.com', visitors: 2 }, { host: 'direct', visitors: 1 }], "the product's own pages aren't a source");
});

test("a product that had a landing page counts only its beacon's visits, not the page's views", () => {
  const f = G.funnelOf(row, { stage: 'live', repo: 'r', page: { url: 'https://idea-pages/x/' } });
  assert.equal(f.d7.visit, 2);
  assert.equal(f.all.visit, 2);
});

test('no events yet: a funnel of zeros, with nothing seen', () => {
  const f = G.funnelOf(undefined, { stage: 'building', repo: 'r', ...deployed });
  assert.deepEqual(f.all, { visit: 0, signup: 0, activate: 0, checkout: 0 });
  assert.deepEqual(f.seen, { visit: false, activate: false, checkout: false });
  assert.equal(G.funnelText(f), '0 visitors this week (0 the week before), 0 activations, 0 Buy clicks');
});

test("a demand test's counts are the same as before: views, unique visitors who viewed, distinct signups", () => {
  assert.deepEqual(G.signalsOf(row), { views: 6, uniqueVisitors: 3, signups: 2 });
  assert.deepEqual(G.signalsOf(undefined), { views: 0, uniqueVisitors: 0, signups: 0 });
});

test('which ideas keep a funnel, and when it counts as changed', () => {
  assert.equal(G.tracksFunnel({ stage: 'building', repo: 'r', ...deployed }, undefined), true, 'deployed');
  assert.equal(G.tracksFunnel({ stage: 'building', repo: 'r' }, row), true, 'had visitors');
  assert.equal(G.tracksFunnel({ stage: 'building', repo: 'r' }, undefined), false, 'not live, no visitors');
  assert.equal(G.tracksFunnel({ stage: 'validate', page: { url: 'x' } }, row), false, 'a demand test keeps state.signals');
  const f = G.funnelOf(row, { stage: 'live', repo: 'r' });
  assert.equal(G.sameFunnel({ at: '2026-10-12T00:00:00Z', ...f }, f), true, 'when it was taken doesn\'t count');
  assert.equal(G.sameFunnel(f, { ...f, d7: { ...f.d7, visit: 9 } }), false);
  assert.equal(G.funnelText(f), '4 visitors this week (1 the week before), 1 activation, 0 Buy clicks');
});

// ── The daily growth step ─────────────────────────────────────────────────────────────────────────────
const NOW = new Date('2026-10-13T12:00:00Z');
const GP = { minVisitorsPerWeek: 50, maxMissionsPerDay: 2, notBefore: '10:00', experimentDays: { default: 14, seo: 28, instrumentation: 7 }, proposedMaxDays: 7, parkAfterNoLift: 2 };
const ready = { stage: 'building', repo: 'r', launch: { steps: [{ id: 'launchReady', done: true }] } };
const funnelWith = (d7, seenVisit = true) => ({ d7: { visit: 0, signup: 0, activate: 0, checkout: 0, ...d7 }, prev7: { visit: 0 }, all: { visit: 0, activate: 0, checkout: 0 }, seen: { visit: seenVisit } });
const exp = (kind, status, extra = {}) => ({ id: `x-${kind}`, kind, executor: G.KINDS[kind].executor, status, createdAt: '2026-10-12T12:00:00Z', windowDays: 14, ...extra });
const next = (state, kit) => { const b = G.bottleneck(state, { kit, gp: GP, now: NOW }); return [b.stage, b.action && `${b.action.kind}:${b.action.executor}`]; };

test('the rules, first match wins: launch, instrument, acquire, activate, monetize, retain, park', () => {
  assert.deepEqual(next({ stage: 'building', repo: 'r' }), ['launch', null], 'not launch-ready: the go-live comes first');
  assert.deepEqual(next({ ...ready, funnel: funnelWith({ visit: 3 }, false) }), ['instrument', 'instrumentation:build'], 'the old one-view beacon');
  assert.deepEqual(next({ ...ready, funnel: funnelWith({ visit: 3 }, false), growth: { experiments: [exp('instrumentation', 'proposed')] } }), ['instrument', null], 'tried: wait for it');
  assert.deepEqual(next({ ...ready, funnel: funnelWith({ visit: 3 }) }), ['acquire', 'kit:claude'], 'short of visitors, no kit');
  assert.deepEqual(next({ ...ready, funnel: funnelWith({ visit: 3 }) }, { channels: 5, posted: 1 }), ['acquire', 'seo:build'], 'a kit exists: search pages next');
  assert.deepEqual(next({ ...ready, funnel: funnelWith({ visit: 3 }), growth: { experiments: [exp('seo', 'running')] } }, { channels: 5, posted: 1 }), ['acquire', 'post:owner'], 'then David posts the next channel');
  assert.deepEqual(next({ ...ready, funnel: funnelWith({ visit: 3 }), growth: { experiments: [exp('seo', 'running')] } }, { channels: 2, posted: 2 }), ['acquire', 'kit:claude'], 'every channel posted: a fresh kit');
  assert.deepEqual(next({ ...ready, funnel: funnelWith({ visit: 60 }) }), ['activate', 'landing:build'], 'visitors, nobody used the core action');
  assert.deepEqual(next({ ...ready, funnel: funnelWith({ visit: 60, activate: 4 }) }), ['monetize', 'paywall:build'], 'active users, no Buy clicks');
  assert.deepEqual(next({ ...ready, funnel: funnelWith({ visit: 60, activate: 4, checkout: 1 }) }), ['retain', null]);
  const noLift = [exp('seo', 'decided', { result: { lift: false } }), exp('landing', 'decided', { result: { lift: false } })];
  assert.deepEqual(next({ ...ready, funnel: funnelWith({ visit: 3 }), growth: { experiments: noLift } }), ['park', 'park:owner'], 'two experiments moved nothing');
  assert.deepEqual(next({ stage: 'validate' }), ['acquire', 'kit:claude'], 'a focus demand test only gets kits');
});

test("an abandoned mission can come back after a week, and a failed kit doesn't block the next day's", () => {
  const old = exp('instrumentation', 'abandoned', { updatedAt: '2026-10-01T00:00:00Z' });
  assert.deepEqual(next({ ...ready, funnel: funnelWith({ visit: 3 }, false), growth: { experiments: [old] } }), ['instrument', 'instrumentation:build']);
  const fresh = exp('instrumentation', 'abandoned', { updatedAt: '2026-10-12T00:00:00Z', prUrl: 'https://x/pull/1', reason: 'the PR was closed without merging' });
  assert.deepEqual(next({ ...ready, funnel: funnelWith({ visit: 3 }, false), growth: { experiments: [fresh] } }), ['instrument', null]);
  assert.deepEqual(next({ ...ready, funnel: funnelWith({ visit: 3 }), growth: { experiments: [exp('kit', 'abandoned')] } }), ['acquire', 'kit:claude']);
});

test('a mission waits while a build runs or something waits for David; experiments being measured do not block', () => {
  assert.equal(G.canStart({ build: { status: 'pr-open' } }), false);
  assert.equal(G.canStart({ build: { status: 'running' } }), false);
  assert.equal(G.canStart({ growth: { experiments: [exp('kit', 'proposed')] } }), false, 'a kit nobody has posted from');
  assert.equal(G.canStart({ build: { status: 'merged' }, growth: { experiments: [exp('seo', 'running')] } }), true);
});

test('the daily caps: not before 10:00 unless forced, at most two missions, off when auto is false', () => {
  const at = (h) => new Date(2026, 9, 13, h, 0);
  assert.equal(G.growthDue(null, at(9), GP), false);
  assert.equal(G.growthDue(null, at(9), GP, { force: true }), true);
  assert.equal(G.growthDue(null, at(10), GP), true);
  assert.equal(G.growthDue({ date: at(11).toLocaleDateString('en-CA'), runs: 2 }, at(11), GP, { force: true }), false);
  assert.equal(G.growthDue({ date: '2026-10-12', runs: 2 }, at(11), GP), true, "yesterday's runs don't count");
  assert.equal(G.growthDue(null, at(11), { ...GP, auto: false }), false);
  const weekOld = { executor: 'build', status: 'running', createdAt: '2026-10-01T00:00:00Z' };
  assert.equal(G.growthBuildsThisWeek([{ growth: { experiments: [exp('seo', 'running'), weekOld, exp('kit', 'proposed'), exp('landing', 'abandoned')] } }], NOW), 1);
});

test('an experiment records its hypothesis, baseline, target and window', () => {
  const e = G.newExperiment('tiebreak', { kind: 'seo' }, { funnel: funnelWith({ visit: 3 }) }, GP, NOW);
  assert.deepEqual({ ...e, hypothesis: undefined }, { id: 'tiebreak-20261013-seo', kind: 'seo', executor: 'build', metric: 'visit', baseline: 3, target: 50, windowDays: 28,
    status: 'proposed', createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), hypothesis: undefined });
  assert.equal(G.newExperiment('t', { kind: 'instrumentation' }, { funnel: funnelWith({}, false) }, GP, NOW).windowDays, 7);
  assert.deepEqual(G.newExperiment('t', { kind: 'landing' }, { funnel: funnelWith({ visit: 80, activate: 4 }) }, GP, NOW).target, 0.1, 'a share: half as much again, at least 10%');
  assert.equal(G.valueText('activate', 0.05), '5.0% of visitors');
  assert.equal(G.valueText('beacon', 0), 'old beacon');
});

test('experiments move on: a kit runs from its first post, unposted kits and PR-less builds are dropped', () => {
  const kit = exp('kit', 'proposed');
  const posted = G.advance([kit], { posts: [{ channel: 'r/x', postedAt: '2026-10-11T00:00:00Z' }, { channel: 'r/y', postedAt: '2026-10-13T09:00:00Z' }], now: NOW, gp: GP })[0];
  assert.deepEqual([posted.status, posted.startedAt, posted.endsAt], ['running', '2026-10-13T09:00:00Z', '2026-10-27T09:00:00.000Z'], 'from the first post after the kit');
  assert.equal(G.advance([kit], { now: new Date('2026-10-20T13:00:00Z'), gp: GP })[0].status, 'abandoned');
  assert.equal(G.advance([exp('seo', 'proposed')], { now: NOW, gp: GP })[0].status, 'proposed', 'a build has a day to open its PR');
  assert.equal(G.advance([exp('seo', 'proposed')], { now: new Date('2026-10-14T13:00:00Z'), gp: GP })[0].status, 'abandoned');
  assert.equal(G.advance([exp('seo', 'proposed', { prUrl: 'https://x/pull/1' })], { now: new Date('2026-10-20T00:00:00Z'), gp: GP })[0].status, 'proposed', 'an open PR waits for David');
  const running = G.onMerge({ experiments: [exp('seo', 'proposed', { windowDays: 28 })] }, 'x-seo', NOW).experiments[0];
  assert.deepEqual([running.status, running.endsAt], ['running', '2026-11-10T12:00:00.000Z']);
  assert.equal(G.onClose({ experiments: [exp('seo', 'proposed')] }, 'x-seo', NOW).experiments[0].status, 'abandoned');
});

test("a kit's channels and how many were posted; the brief a growth build reads", () => {
  const kit = '# kit\n\n## Order\n1. **r/SideProject**, Tue.\n2. **r/EtsySellers**, Wed.\n3. Indie Hackers: Thu.\n\n## r/SideProject\n';
  assert.deepEqual(G.kitChannels(kit), ['r/SideProject', 'r/EtsySellers', 'Indie Hackers']);
  assert.deepEqual(G.kitFacts(kit, { posts: [{ channel: 'r/sideproject' }, { channel: 'Twitter' }] }), { channels: 3, posted: 1 });
  const e = G.newExperiment('tiebreak', { kind: 'seo' }, { funnel: funnelWith({ visit: 3 }) }, GP, NOW);
  const b = G.brief({ slug: 'tiebreak', exp: e, state: { funnel: { ...funnelWith({ visit: 3 }), referrers7d: [{ host: 'google.com', visitors: 2 }] } }, task: G.missionTask('seo', { slug: 'tiebreak' }),
    learnings: '- 2026-10-01: nothing yet', playbook: '# Playbook\n## Rules\n- Distribution before conversion.\n## Proposed\n- An unaccepted idea.\n', others: [{ slug: 'codespend', hypothesis: 'Search pages bring visitors.', decision: 'keep' }] });
  assert.match(b, /^# Growth brief: tiebreak, search pages/);
  assert.match(b, /Metric: 3 visitors a week now; the target is 50 visitors a week within 28 days of the merge\./);
  assert.match(b, /This week's sources: google\.com 2\./);
  assert.match(b, /Distribution before conversion/);
  assert.doesNotMatch(b, /unaccepted/, "the playbook's proposals stay out until David accepts them");
  assert.match(b, /- codespend: Search pages bring visitors\. → keep/);
  assert.match(G.missionTask('instrumentation', { slug: 'tiebreak', signalUrl: 'https://repohq.vercel.app/api/ideas/signal' }), /"activate" the first time.*navigator\.webdriver.*repohq:notrack/s);
});

test("a fresh funnel beacon that hasn't seen a visit yet doesn't hold the product at instrument", () => {
  const quiet = funnelWith({ visit: 0 }, false);
  assert.deepEqual(next({ ...ready, funnel: quiet, golive: { mergedAt: 'x', beacon: 'funnel' } }), ['acquire', 'kit:claude'], 'a go-live built with the funnel beacon');
  assert.deepEqual(next({ ...ready, funnel: quiet, growth: { experiments: [exp('instrumentation', 'running')] } }), ['acquire', 'kit:claude'], 'its beacon build merged');
  assert.deepEqual(next({ ...ready, funnel: quiet, growth: { experiments: [exp('instrumentation', 'proposed')] } }), ['instrument', null], 'still waiting for the merge');
  assert.equal(G.beaconLive({ golive: { mergedAt: 'x' } }), false, 'a go-live from before the funnel beacon');
});

test("a mission whose run failed is tried again the next day; one David turned down waits a week", () => {
  const quiet = funnelWith({ visit: 3 }, false);
  const sandbox = exp('instrumentation', 'abandoned', { updatedAt: '2026-10-13T11:00:00Z', reason: "couldn't start the build sandbox" });
  assert.deepEqual(next({ ...ready, funnel: quiet, growth: { experiments: [sandbox] } }), ['instrument', 'instrumentation:build'], 'no PR was ever opened: the run failed, try again');
  const closed = exp('instrumentation', 'abandoned', { updatedAt: '2026-10-13T11:00:00Z', prUrl: 'https://x/pull/1', reason: 'the PR was closed without merging' });
  assert.deepEqual(next({ ...ready, funnel: quiet, growth: { experiments: [closed] } }), ['instrument', null], 'David closed its PR: wait a week');
  const thrice = [1, 2, 3].map((n) => exp('instrumentation', 'abandoned', { id: `f${n}`, failed: true, updatedAt: `2026-10-1${n}T11:00:00Z` }));
  assert.deepEqual(next({ ...ready, funnel: quiet, growth: { experiments: thrice } }), ['instrument', null], 'three failed runs this week: stop retrying');
  assert.equal(G.advance([exp('seo', 'proposed')], { now: new Date('2026-10-14T13:00:00Z'), gp: GP })[0].failed, true, 'a build that never opened a PR failed');
});

// ── Phase 3: the judge ───────────────────────────────────────────────────────────────────────────────
const W = (w) => ({ view: 0, visit: 0, reach: 0, signup: 0, activate: 0, checkout: 0, ...w });
const ran = (kind, metric, extra = {}) => ({ ...exp(kind, 'running', { metric, windowDays: 14, startedAt: '2026-10-01T00:00:00Z', endsAt: '2026-10-15T00:00:00Z', baseline: 0, target: 50 }), ...extra });

test('the judge: visitors a week against the target, compared with the window before', () => {
  assert.deepEqual(G.judge(ran('seo', 'visit'), W({ reach: 6 }), W({ reach: 120 }), GP), { decision: 'keep', lift: true, value: 60, before: 3, sample: 120 });
  assert.deepEqual(G.judge(ran('seo', 'visit'), W({ reach: 6 }), W({ reach: 20 }), GP), { decision: 'iterate', lift: true, value: 10, before: 3, sample: 20 });
  assert.equal(G.judge(ran('kit', 'visit'), W({ reach: 6 }), W({ reach: 2 }), GP).lift, false, 'fewer than before: no lift');
  assert.equal(G.judge(ran('seo', 'visit'), W({ reach: 6, visit: 1 }), W({ reach: 30, visit: 4 }), GP, { page: true }).value, 2, 'with a landing page, only beacon visits count');
});

test("the judge: a share needs enough visitors, keeps a win, reverts a clear loss on a first screen or paid offer", () => {
  const landing = ran('landing', 'activate', { target: 0.15 });
  assert.equal(G.judge(landing, W({ reach: 40, activate: 4 }), W({ reach: 10, activate: 3 }), GP).decision, 'extend', 'under 30 visitors');
  assert.deepEqual(G.judge({ ...landing, extensions: 1 }, W({}), W({ reach: 10 }), GP), { decision: 'iterate', lift: null, value: null, before: null, sample: 10, note: 'only 10 visitors in its window: not enough to judge' });
  assert.equal(G.judge(landing, W({ reach: 40, activate: 4 }), W({ reach: 40, activate: 8 }), GP).decision, 'keep');
  assert.deepEqual(G.judge(landing, W({ reach: 40, activate: 8 }), W({ reach: 40, activate: 4 }), GP), { decision: 'revert', lift: false, value: 0.1, before: 0.2, sample: 40, note: 'at least 30% worse than before' });
  assert.equal(G.judge({ ...landing, kind: 'seo' }, W({ reach: 40, activate: 8 }), W({ reach: 40, activate: 4 }), GP).decision, 'iterate', 'only a first screen or paid offer is reverted');
});

test('the judge: the beacon is kept once a visit arrives; no traffic is inconclusive, not a failure', () => {
  const beacon = ran('instrumentation', 'beacon', { windowDays: 7, target: 1 });
  assert.equal(G.judge(beacon, W({}), W({ visit: 2 }), GP).decision, 'keep');
  assert.equal(G.judge(beacon, W({}), W({}), GP).decision, 'extend');
  assert.deepEqual(G.judge({ ...beacon, extensions: 1 }, W({}), W({}), GP), { decision: 'iterate', lift: null, value: 0, before: 0, sample: 0, note: 'no visit in its window, so the beacon is unconfirmed' });
});

test('lessons and proposals: one line per result, the playbook proposal under Proposed, written once', () => {
  const e = ran('seo', 'visit', { id: 'tiebreak-20261001-seo', baseline: 3, hypothesis: 'Pages that answer what the buyer searches bring visitors from search.' });
  const r = G.judge(e, W({ reach: 6 }), W({ reach: 120 }), GP);
  const line = G.learningEntry(e, r, { now: new Date('2026-10-15T00:00:00Z'), alongside: ['launch kit'] });
  assert.equal(line, '- 2026-10-15 · search pages (tiebreak-20261001-seo) · keep: 3 visitors a week → 60 visitors a week (target 50 visitors a week). Pages that answer what the buyer searches bring visitors from search. Ran alongside: launch kit.');
  const md = G.withLearning('', 'tiebreak', line);
  assert.match(md, /^# Learnings: tiebreak\n\nWhat each growth experiment showed/);
  assert.match(G.withLearning(md, 'tiebreak', '- second'), /launch kit\.\n- second\n$/);
  const playbook = '# Playbook\n\nintro\n\n## Rules\n\n- A rule.\n\n## Proposed\n\nNone yet.\n';
  const proposal = '- Pages bring visitors. (kept on tiebreak, 2026-10-15: 3 visitors a week → 60 visitors a week)';
  const once = G.withProposal(playbook, proposal);
  assert.match(once, /## Proposed\n\n- Pages bring visitors\. \(kept on tiebreak/);
  assert.doesNotMatch(once, /None yet/);
  assert.match(once, /## Rules\n\n- A rule\./, 'Rules untouched');
  assert.equal(G.withProposal(once, proposal), once, 'the same proposal once');
  assert.match(G.withProposal('# Playbook\n', proposal), /## Proposed\n\n- Pages bring visitors/);
  assert.deepEqual(G.ranWith(e, [e, { ...exp('kit', 'running'), startedAt: '2026-10-05T00:00:00Z', endsAt: '2026-10-19T00:00:00Z' }, { ...exp('landing', 'running'), startedAt: '2026-11-01T00:00:00Z' }]), ['launch kit']);
  const reverted = G.markReverted({ experiments: [{ ...e, prUrl: 'https://x/pull/9' }] }, 'https://x/pull/9', { url: 'https://x/pull/10', reason: 'launch checks failed', now: NOW }).experiments[0];
  assert.deepEqual([reverted.status, reverted.decision, reverted.reverted.url, reverted.result.note], ['decided', 'revert', 'https://x/pull/10', 'launch checks failed']);
});

test('visitors left out as a burst are recorded on the funnel and said in its text, never silently dropped', () => {
  const f = G.funnelOf({ kinds: { visit: { events: 9, d7: 9, prev7: 0, all: 9 }, burst: { events: 25, d7: 24, prev7: 0, all: 24 } } }, { stage: 'building', repo: 'r', page: null, ...deployed });
  assert.equal(f.burst7d, 24);
  assert.match(G.funnelText(f), /; 24 more left out as a burst of direct visits$/);
  assert.equal(G.funnelOf(row, { stage: 'live', repo: 'r', ...deployed }).burst7d, undefined, 'no burst, no field');
});

test('a burst still counts in the hours after a logged launch post (Reddit app visitors send no referrer)', () => {
  const ex = G.burstExempt({ tiebreak: [{ channel: 'r/SideProject', postedAt: '2026-10-16T17:00:00Z' }, { postedAt: 'not a date' }], botchelor: [] }, 48);
  assert.deepEqual(ex, [{ slug: 'tiebreak', from: '2026-10-16T16:00:00.000Z', to: '2026-10-18T17:00:00.000Z' }]);
  assert.deepEqual(G.burstExempt(null), []);
});

test("until it starts, an experiment's baseline follows the funnel, so a figure taken mid-burst doesn't stick", () => {
  const kit = exp('kit', 'proposed', { metric: 'visit', baseline: 15, target: 50 });
  const now9 = G.advance([kit], { now: NOW, gp: GP, funnel: funnelWith({ visit: 9 }) })[0];
  assert.deepEqual([now9.status, now9.baseline, now9.target], ['proposed', 9, 50]);
  assert.equal(G.advance([kit], { now: NOW, gp: GP })[0].baseline, 15, 'no funnel: left as it was');
  const started = G.advance([{ ...kit, status: 'running' }], { now: NOW, gp: GP, funnel: funnelWith({ visit: 40 }) })[0];
  assert.equal(started.baseline, 15, 'a running experiment keeps the baseline it started from');
});
