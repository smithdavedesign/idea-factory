// System test of one pipeline tick for "Start build now" (RepoHQ idea_build_requests): a temporary
// record (IDEA_PIPELINE_DATA), RepoHQ's database faked in memory, Notion, the builder and OpenClaw
// stubbed. Checks the request is claimed, the build runs with the owner's note, the row and Slack get
// the result, the 24-hour cap holds, and an idea that can't be built is refused. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-'));
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'home-'));
fs.mkdirSync(path.join(HOME, '.openclaw'));
fs.writeFileSync(path.join(HOME, '.openclaw', 'openclaw.json'), JSON.stringify({ channels: { slack: { enabled: true, channels: { C_TEST: {} } } } }));

// Real build rules (manualBuildTarget, buildMessage); only buildOne is faked.
const realBuild = require('../bin/idea-build');
const builds = [];
let buildResult = null;
const sent = [];
const emitted = [];
let db = null; // per test: { requests, startsLast24h, log }

function fakeSql(strings, ...values) {
  const q = strings.join('?').replace(/\s+/g, ' ');
  db.log.push({ q, values });
  if (db.failSync && /SELECT slug, hash/.test(q)) return Promise.reject(new Error('neon: connection reset'));
  if (/FROM idea_build_requests WHERE status = 'pending'/.test(q)) return Promise.resolve(db.requests.filter((r) => r.status === 'pending'));
  if (/count\(\*\)::int AS n FROM idea_build_requests/.test(q)) return Promise.resolve([{ n: db.startsLast24h }]);
  if (/UPDATE idea_build_requests SET status = 'running'/.test(q)) {
    const r = db.requests.find((x) => x.id === values[2] && x.status === 'pending');
    if (r) Object.assign(r, { status: 'running', milestone: values[0] });
    return Promise.resolve(r ? [{ id: r.id }] : []);
  }
  if (/UPDATE idea_build_requests SET result = .* AND status = 'pending'/.test(q)) {
    const r = db.requests.find((x) => x.id === values[1]);
    if (r) r.result = values[0];
    return Promise.resolve([]);
  }
  if (/UPDATE idea_build_requests SET status = .* WHERE slug = /.test(q)) {
    for (const r of db.requests.filter((x) => x.slug === values[3] && x.status === 'pending')) Object.assign(r, { status: values[0], result: values[1], pr_url: values[2] });
    return Promise.resolve([]);
  }
  if (/UPDATE idea_build_requests SET status = \?/.test(q)) {
    const r = db.requests.find((x) => x.id === values[4]);
    if (r) Object.assign(r, { status: values[0], result: values[1], pr_url: values[2], engine: values[3] });
    return Promise.resolve([]);
  }
  if (/FROM repositories WHERE full_name = ANY/.test(q)) return Promise.resolve(db.repos || []);
  return Promise.resolve([]); // decisions, seeds, signals, ideas sync, heartbeat: nothing to do here
}

// GitHub answers: PR states by URL, and the files in a repo (for the legal-pages check).
const gh = { prs: {}, files: '', edits: [], homepage: '' };
const vercelOut = { ls: '', inspect: '' };
const revenueRuns = [];
const realRevenue = require('../bin/idea-revenue');

const stubs = {
  './idea-revenue': { ...realRevenue, revenueOne: async (slug) => {
    revenueRuns.push(slug);
    const plan = { buyer: 'Indie devs who run agents overnight', paymentMethod: 'Stripe payment link', price: { amount: 9, currency: 'USD', interval: 'month', why: 'x' },
      mvpScope: 'the CLI and a digest page', mustHaveBeforeCharging: ['checkout'], launchChannels: [{ name: 'r/ClaudeAI' }], firstTenUsers: 'GitHub discussions' };
    fs.writeFileSync(path.join(DATA, 'ideas', slug, 'revenue.json'), JSON.stringify(plan));
    return { ok: true, slug, plan };
  } },
  './idea-publish': {
    ensureDatabaseProperties: async () => {}, allIdeas: async () => [], readSeeds: () => [], seed: () => ({ id: 's' }),
    promote: async () => ({ promoted: [], errors: [] }), notionRequest: async () => ({}), appendBlocks: async () => {}, git: () => '',
  },
  '../lib/events': { emit: (e) => emitted.push(e) },
  '@neondatabase/serverless': { neon: () => fakeSql },
  './idea-build': { ...realBuild, buildOne: async (slug, opts) => { builds.push({ slug, ...opts }); return { slug, ...buildResult }; } },
};
const realLoad = Module._load;
Module._load = function (request, parent, ...rest) {
  if (parent && parent.filename.startsWith(ROOT) && !parent.filename.includes(`${path.sep}test${path.sep}`)) {
    if (stubs[request]) return stubs[request];
    if (request === 'child_process') return { execFileSync: (cmd, args) => {
      if (cmd === 'openclaw') sent.push(args);
      if (cmd === 'gh' && args[0] === 'pr' && args[1] === 'view') return JSON.stringify({ state: gh.prs[args[2]] || 'OPEN' });
      if (cmd === 'gh' && args[0] === 'api') return gh.files;
      if (cmd === 'gh' && args[0] === 'repo' && args[1] === 'edit') { gh.edits.push(args); return ''; }
      if (cmd === 'gh' && args[0] === 'repo' && args[1] === 'view') return JSON.stringify({ homepageUrl: gh.homepage || '' });
      if (cmd === 'vercel' && args[0] === 'ls') return vercelOut.ls;
      if (cmd === 'vercel' && args[0] === 'inspect') { if (!vercelOut.inspect) throw new Error('not ours'); return vercelOut.inspect; }
      return '';
    }, spawnSync: (cmd, args) => {
      // productionUrl reads both streams; the real CLI prints inspect's aliases on stderr.
      if (cmd === 'vercel' && args[0] === 'ls') return { status: 0, stdout: vercelOut.ls, stderr: '' };
      if (cmd === 'vercel' && args[0] === 'inspect') return vercelOut.inspect ? { status: 0, stdout: '', stderr: vercelOut.inspect } : { status: 1, stdout: '', stderr: 'not ours' };
      return { status: 0 };
    }, spawn: () => { throw new Error('no spawn in tests'); } };
  }
  return realLoad.call(this, request, parent, ...rest);
};
process.env.IDEA_PIPELINE_DATA = DATA;
process.env.IDEA_DATABASE_URL = 'postgres://fake';
process.env.HOME = HOME;
// The launch checklist probes live URLs: never reach the network from tests.
globalThis.fetch = async () => ({ status: 404 });
const { tick } = require('../bin/idea-pipeline');

function idea(slug, state) {
  const dir = path.join(DATA, 'ideas', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'idea.json'), JSON.stringify({ title: `${slug} — test idea` }));
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(state));
  fs.writeFileSync(path.join(dir, 'ROADMAP.md'), '## M1 — core\n\n## M2 — more\n');
}

test.beforeEach(() => {
  fs.rmSync(path.join(DATA, 'ideas'), { recursive: true, force: true });
  // The daily steps ran today already, so the tick does only the every-tick steps.
  fs.writeFileSync(path.join(DATA, '.pipeline-state.json'), JSON.stringify({ lastDaily: new Date().toLocaleDateString('en-CA') }));
  builds.length = 0; sent.length = 0; revenueRuns.length = 0; gh.prs = {}; gh.files = ''; gh.edits = []; gh.homepage = ''; vercelOut.ls = ''; vercelOut.inspect = '';
  globalThis.fetch = async () => ({ status: 404 });
  buildResult = { ok: true, milestone: 'M1', prUrl: 'https://github.com/o/pr-x/pull/1', testsPassing: true, engine: 'claude', model: 'claude-opus-5-5' };
});
test.after(() => { Module._load = realLoad; fs.rmSync(DATA, { recursive: true, force: true }); fs.rmSync(HOME, { recursive: true, force: true }); });

test('a request for an approved idea builds M1 now, with the note, and reports to the row and Slack', async () => {
  idea('pr-x', { stage: 'repo', repo: 'https://github.com/o/pr-x', ownerApproved: true });
  db = { requests: [{ id: 7, slug: 'pr-x', milestone: null, note: 'focus on the CLI', status: 'pending' }], startsLast24h: 0, log: [] };
  const out = await tick();
  assert.deepEqual(out.errors, []);
  assert.deepEqual(builds, [{ slug: 'pr-x', milestone: 'M1', manual: true, note: 'focus on the CLI' }], 'one build: the weekly slot stays out of a tick that ran a manual one');
  assert.equal(db.requests[0].status, 'done');
  assert.equal(db.requests[0].pr_url, 'https://github.com/o/pr-x/pull/1');
  assert.equal(db.requests[0].engine, 'claude-opus-5-5 · xhigh');
  assert.match(db.requests[0].result, /M1 PR opened, tests passing/);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].slice(0, 6), ['message', 'send', '--channel', 'slack', '--target', 'C_TEST']);
  assert.match(sent[0][7], /M1 for \*pr-x\* is ready for review: https:\/\/github\.com\/o\/pr-x\/pull\/1/);
  assert.ok(out.changes.some((c) => /pr-x: M1 PR .*started from the Ideas page/.test(c)));
});

test('over the 24-hour cap the request waits, with the reason on the row', async () => {
  idea('pr-x', { stage: 'repo', repo: 'https://github.com/o/pr-x', ownerApproved: true });
  // This week's automatic slot is used too, so nothing builds this tick.
  idea('other', { stage: 'building', repo: 'https://github.com/o/other', build: { milestone: 'M1', status: 'pr-open', at: new Date().toISOString() } });
  db = { requests: [{ id: 8, slug: 'pr-x', status: 'pending' }], startsLast24h: 2, log: [] };
  await tick();
  assert.equal(builds.length, 0);
  assert.equal(db.requests[0].status, 'pending');
  assert.match(db.requests[0].result, /waiting: 2 manual builds started in the last 24 h \(the cap is 2\)/);
  assert.equal(sent.length, 0);
});

test('a weekly-slot build of the same idea settles a request that was waiting', async () => {
  idea('pr-x', { stage: 'repo', repo: 'https://github.com/o/pr-x', ownerApproved: true });
  db = { requests: [{ id: 12, slug: 'pr-x', status: 'pending' }], startsLast24h: 2, log: [] };
  await tick();
  assert.deepEqual(builds, [{ slug: 'pr-x', milestone: 'MVP', mvp: true }], 'the weekly slot builds it, as an MVP run (policy.build.mode), not a manual start');
  assert.equal(db.requests[0].status, 'done');
  assert.match(db.requests[0].result, /MVP PR opened by the weekly build slot/);
  assert.equal(db.requests[0].pr_url, 'https://github.com/o/pr-x/pull/1');
});

test('an idea that can\'t be built is refused, and the next request still runs', async () => {
  idea('passed', { stage: 'pass' });
  idea('pr-x', { stage: 'building', repo: 'https://github.com/o/pr-x', milestonesDone: ['M1'], build: { milestone: 'M1', status: 'merged' } });
  buildResult = { ...buildResult, milestone: 'M2', prUrl: 'https://github.com/o/pr-x/pull/2' };
  db = { requests: [{ id: 9, slug: 'passed', status: 'pending' }, { id: 10, slug: 'pr-x', status: 'pending' }], startsLast24h: 1, log: [] };
  await tick();
  assert.equal(db.requests[0].status, 'failed');
  assert.match(db.requests[0].result, /can't build: no repo yet/);
  assert.deepEqual(builds.map((b) => `${b.slug} ${b.milestone}`), ['pr-x M2'], 'a merged M1 moves on to M2');
  assert.equal(db.requests[1].status, 'done');
});

test('a failed build marks the request failed and says so in Slack', async () => {
  idea('pr-x', { stage: 'repo', repo: 'https://github.com/o/pr-x', ownerApproved: true });
  buildResult = { ok: false, milestone: 'M1', reason: 'Claude made no changes' };
  db = { requests: [{ id: 11, slug: 'pr-x', status: 'pending' }], startsLast24h: 0, log: [] };
  const out = await tick();
  assert.equal(db.requests[0].status, 'failed');
  assert.equal(db.requests[0].result, 'Claude made no changes');
  assert.match(sent[0][7], /M1 build for \*pr-x\* failed: Claude made no changes/);
  assert.ok(out.errors.some((e) => /build pr-x M1/.test(e)), 'the tick reports it, so the system log alerts');
});

const readState = (slug) => JSON.parse(fs.readFileSync(path.join(DATA, 'ideas', slug, 'state.json'), 'utf8'));

test('a merged MVP PR is picked up on the next tick and marks only the milestones it completed', async () => {
  idea('pr-x', { stage: 'building', repo: 'https://github.com/o/pr-x', ownerApproved: true,
    build: { milestone: 'MVP', milestones: ['M1'], planned: ['M1', 'M2'], status: 'pr-open', prUrl: 'https://github.com/o/pr-x/pull/3', at: new Date().toISOString() } });
  gh.prs['https://github.com/o/pr-x/pull/3'] = 'MERGED';
  db = { requests: [], startsLast24h: 0, log: [] };
  const out = await tick();
  const s = readState('pr-x');
  assert.equal(s.build.status, 'merged');
  assert.deepEqual(s.milestonesDone, ['M1'], 'M2 failed in that run, so it isn\'t done');
  assert.ok(out.changes.some((c) => c === 'pr-x: MVP (M1) merged'));
});

test('an MVP request builds every remaining milestone in one run', async () => {
  idea('pr-x', { stage: 'repo', repo: 'https://github.com/o/pr-x', ownerApproved: true });
  buildResult = { ...buildResult, milestone: 'MVP', completed: ['M1', 'M2'], stopped: null, prUrl: 'https://github.com/o/pr-x/pull/9' };
  db = { requests: [{ id: 20, slug: 'pr-x', milestone: 'MVP', note: null, status: 'pending' }], startsLast24h: 0, log: [] };
  await tick();
  assert.deepEqual(builds, [{ slug: 'pr-x', milestone: 'MVP', manual: true, note: '', mvp: true }]);
  assert.equal(db.requests[0].status, 'done');
  assert.match(db.requests[0].result, /^MVP \(M1, M2\) PR opened, tests passing/);
  assert.match(sent[0][7], /MVP for \*pr-x\* is ready for review/);
});

test('the launch checklist is written to the record, and the plan is written once M1 is merged', async () => {
  idea('pr-x', { stage: 'building', repo: 'https://github.com/o/pr-x', milestonesDone: ['M1'], build: { milestone: 'M1', status: 'merged' } });
  gh.files = 'src/app.js\npublic/privacy.html\n';
  db = { requests: [], startsLast24h: 0, log: [] };
  const out = await tick();
  assert.deepEqual(revenueRuns, ['pr-x'], 'one plan, on a tick that didn\'t build');
  assert.ok(out.changes.some((c) => /^pr-x: revenue plan: \$9\/month · Indie devs/.test(c)));
  const s = readState('pr-x');
  assert.ok(s.launch, 'checklist saved');
  assert.equal(s.launch.total, 10);
  assert.equal(s.launch.steps.find((x) => x.id === 'legal').evidence, 'privacy ✓ · terms ✗');
  assert.equal(s.launch.steps.find((x) => x.id === 'deployed').done, false, 'nothing answered (fetch is stubbed to 404)');
  await tick();
  assert.deepEqual(revenueRuns, ['pr-x'], 'not written twice');
  assert.equal(readState('pr-x').launch.steps.find((x) => x.id === 'plan').done, true, 'the next tick sees the plan');
});

test('the weekly slot goes to the approved idea closest to money, not the first approved', async () => {
  idea('a-first', { stage: 'repo', repo: 'https://github.com/o/a-first', ownerApproved: true, review: { verdict: 'pass', score: 3 } });
  idea('b-demand', { stage: 'repo', repo: 'https://github.com/o/b-demand', ownerApproved: true, review: { verdict: 'validate', score: 7 }, validation: { decision: 'build' } });
  db = { requests: [], startsLast24h: 0, log: [] };
  await tick();
  assert.deepEqual(builds.map((b) => b.slug), ['b-demand']);
  assert.equal(builds[0].mvp, true);
});

test('a go-live request builds the launch-ready changes; its merge is recorded, not as a milestone', async () => {
  idea('pr-x', { stage: 'building', repo: 'https://github.com/o/pr-x', milestonesDone: ['M1'], build: { milestone: 'M1', status: 'merged' } });
  fs.writeFileSync(path.join(DATA, 'ideas', 'pr-x', 'revenue.json'), '{}'); // no plan run in this test
  buildResult = { ...buildResult, milestone: 'GOLIVE', prUrl: 'https://github.com/o/pr-x/pull/5' };
  db = { requests: [{ id: 30, slug: 'pr-x', milestone: 'GOLIVE', note: null, status: 'pending' }], startsLast24h: 0, log: [] };
  await tick();
  assert.deepEqual(builds, [{ slug: 'pr-x', milestone: 'GOLIVE', manual: true, note: '', golive: true }]);
  assert.match(db.requests[0].result, /^Go-live PR opened/);

  idea('pr-y', { stage: 'building', repo: 'https://github.com/o/pr-y', milestonesDone: ['M1'], build: { milestone: 'GOLIVE', milestones: [], status: 'pr-open', prUrl: 'https://github.com/o/pr-y/pull/6' } });
  fs.writeFileSync(path.join(DATA, 'ideas', 'pr-y', 'revenue.json'), '{}');
  gh.prs['https://github.com/o/pr-y/pull/6'] = 'MERGED';
  db = { requests: [], startsLast24h: 0, log: [] };
  builds.length = 0;
  await tick();
  const y = readState('pr-y');
  assert.equal(y.golive.prUrl, 'https://github.com/o/pr-y/pull/6');
  assert.deepEqual(y.milestonesDone, ['M1'], 'a go-live doesn\'t mark a roadmap milestone done');
});

test("a homepage already set on GitHub is never replaced, even when RepoHQ's copy hasn't synced it", async () => {
  idea('pr-x', { stage: 'building', repo: 'https://github.com/o/pr-x', milestonesDone: ['M1', 'M2'], golive: { mergedAt: 'x' }, build: { milestone: 'GOLIVE', status: 'merged' } });
  fs.writeFileSync(path.join(DATA, 'ideas', 'pr-x', 'revenue.json'), '{}');
  db = { requests: [], startsLast24h: 0, log: [], repos: [{ full_name: 'o/pr-x', mrr: 0, lifecycle_status: null, homepage: '', stripe_product_id: null }] };
  gh.homepage = 'https://pr-x.example.com';
  vercelOut.ls = 'https://pr-x-abc123def-team.vercel.app ● Ready Production';
  vercelOut.inspect = 'Aliases\n  https://pr-x-seven.vercel.app\n';
  await tick();
  assert.deepEqual(gh.edits, [], 'GitHub already has a homepage: leave it');
  gh.homepage = '';
  fs.writeFileSync(path.join(DATA, '.pipeline-state.json'), JSON.stringify({ lastDaily: new Date().toLocaleDateString('en-CA') }));
  await tick();
  assert.deepEqual(gh.edits[0], ['repo', 'edit', 'o/pr-x', '--homepage', 'https://pr-x-seven.vercel.app'], 'empty on GitHub too: set it');
});

test('once the MVP is complete the pipeline starts the go-live itself; then the production URL, homepage and live audit fill in', async () => {
  idea('pr-x', { stage: 'building', repo: 'https://github.com/o/pr-x', milestonesDone: ['M1', 'M2'], build: { milestone: 'MVP', status: 'merged' } });
  fs.writeFileSync(path.join(DATA, 'ideas', 'pr-x', 'revenue.json'), '{}');
  buildResult = { ...buildResult, milestone: 'GOLIVE' };
  db = { requests: [], startsLast24h: 0, log: [] };
  await tick();
  assert.deepEqual(builds, [{ slug: 'pr-x', milestone: 'GOLIVE', golive: true }], 'MVP complete and not launch-ready: go-live starts');

  // After the go-live merged and Vercel deployed: the production URL is found, set as the homepage, audited.
  idea('pr-x', { stage: 'building', repo: 'https://github.com/o/pr-x', milestonesDone: ['M1', 'M2'], golive: { mergedAt: 'x' }, build: { milestone: 'GOLIVE', status: 'merged' } });
  fs.writeFileSync(path.join(DATA, 'ideas', 'pr-x', 'revenue.json'), '{}');
  fs.writeFileSync(path.join(DATA, '.pipeline-state.json'), JSON.stringify({ lastDaily: new Date().toLocaleDateString('en-CA') }));
  vercelOut.ls = 'https://pr-x-abc123def-team.vercel.app ● Ready Production';
  vercelOut.inspect = 'Aliases\n  https://pr-x-seven.vercel.app\n';
  const page = '<title>pr-x — a product</title><meta name="description" content="d"><meta property="og:image" content="/og.png">';
  globalThis.fetch = async (u) => (u.replace(/\/$/, '') === 'https://pr-x-seven.vercel.app' ? { status: 200, text: async () => page } : { status: 404, text: async () => '' });
  builds.length = 0;
  const out = await tick();
  assert.deepEqual(gh.edits[0], ['repo', 'edit', 'o/pr-x', '--homepage', 'https://pr-x-seven.vercel.app']);
  assert.ok(out.changes.some((c) => c === 'pr-x: homepage set to https://pr-x-seven.vercel.app'));
  const s = readState('pr-x');
  assert.equal(s.launch.steps.find((x) => x.id === 'deployed').evidence, 'https://pr-x-seven.vercel.app');
  const ready = s.launch.steps.find((x) => x.id === 'launchReady');
  assert.equal(ready.done, false);
  assert.match(ready.evidence, /^5\/9 launch checks · missing: robots\.txt, sitemap\.xml, Privacy page, Terms page$/);
  assert.equal(builds.length, 0, 'no second go-live: after one, the audit says what\'s left');

  // The missing pages ship; the next audit (6 hours on) says so once, and then a regression is logged too.
  const age = () => { const f = path.join(DATA, '.pipeline-state.json'); const ps = JSON.parse(fs.readFileSync(f, 'utf8')); ps.audit['pr-x'].at = '2000-01-01T00:00:00Z'; fs.writeFileSync(f, JSON.stringify(ps)); };
  globalThis.fetch = async (u) => (u.startsWith('https://pr-x-seven.vercel.app') ? { status: 200, text: async () => page } : { status: 404, text: async () => '' });
  age();
  const fixed = await tick();
  assert.ok(fixed.changes.includes('pr-x: launch-ready: 9/9 launch checks pass on https://pr-x-seven.vercel.app'), fixed.changes.join('\n'));
  assert.equal(readState('pr-x').launch.steps.find((x) => x.id === 'launchReady').done, true);
  assert.ok(!(await tick()).changes.some((c) => /launch/.test(c)), 'a fresh audit is not rerun or relogged');
  globalThis.fetch = async (u) => (/\/terms$/.test(u) ? { status: 404, text: async () => '' } : u.startsWith('https://pr-x-seven.vercel.app') ? { status: 200, text: async () => page } : { status: 404, text: async () => '' });
  age();
  assert.ok((await tick()).changes.includes('pr-x: launch checks regressed on https://pr-x-seven.vercel.app: missing Terms page'));
});
test('the first quiet tick after a failed one is logged, so RepoHQ stops showing the failure', async () => {
  idea('quiet', { stage: 'pass' });
  db = { requests: [], startsLast24h: 0, log: [], failSync: true };
  emitted.length = 0;
  const bad = await tick();
  assert.equal(bad.ok, false);
  assert.equal(emitted.at(-1).status, 'fail');
  db.failSync = false; emitted.length = 0;
  const good = await tick();
  assert.equal(good.ok, true);
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].status, 'ok');
  assert.match(emitted[0].message, /recovered/);
  emitted.length = 0;
  const quiet = await tick();
  if (!quiet.changes.length) assert.equal(emitted.length, 0, 'later quiet ticks stay quiet');
});
