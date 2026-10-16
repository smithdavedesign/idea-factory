// System test of one pipeline tick for "Start build now" (RepoHQ idea_build_requests): a temporary
// record (IDEA_PIPELINE_DATA), RepoHQ's database faked in memory, the builder and OpenClaw stubbed. Checks the request is claimed, the build runs with the owner's note, the row and Slack get
// the result, builds run side by side up to the concurrency limit, and an idea that can't be built is refused. Run: npm test
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
let db = null; // per test: { requests, startsLast24h, log, decisions }
// What idea-publish's promote reports: the repos it created for ideas at stage "build".
let promoteResult = { promoted: [], errors: [] };

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
  if (/FROM idea_decisions WHERE status = 'pending'/.test(q)) return Promise.resolve((db.decisions || []).filter((d) => d.status === 'pending'));
  if (/UPDATE idea_decisions SET status = 'applied'/.test(q)) {
    const d = (db.decisions || []).find((x) => x.id === values[1] && x.status === 'pending');
    if (d) Object.assign(d, { status: 'applied', result: values[0] });
    return Promise.resolve(d ? [{ id: d.id }] : []);
  }
  if (/UPDATE idea_decisions SET status = \?/.test(q)) {
    const d = (db.decisions || []).find((x) => x.id === values[2]);
    if (d) Object.assign(d, { status: values[0], result: values[1] });
    return Promise.resolve([]);
  }
  if (/FROM repositories WHERE full_name = ANY/.test(q)) return Promise.resolve(db.repos || []);
  return Promise.resolve([]); // decisions, seeds, signals, ideas sync, heartbeat: nothing to do here
}
// The funnel queries (lib/repohq.js funnelBySlug, funnelWindow) go through sql.query: their burst filter is a shared CTE.
fakeSql.query = (text, values = []) => {
  const q = text.replace(/\s+/g, ' ');
  db.log.push({ q, values });
  if (/created_at >= \$2 AND created_at < \$3 GROUP BY kind/.test(q)) return Promise.resolve(db.window ? db.window(values[1], values[2]) : []);
  if (/FROM clean GROUP BY slug, kind/.test(q)) return Promise.resolve(db.funnelRows || []);
  if (/AS host/.test(q)) return Promise.resolve(db.referrerRows || []);
  return Promise.resolve([]);
};

// GitHub answers: PR states by URL, and the files in a repo (for the legal-pages check).
const gh = { prs: {}, files: '', edits: [], homepage: '', info: {}, calls: [] };
const vercelOut = { ls: '', inspect: '' };
const revenueRuns = [];
const kitRuns = [];
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
    readSeeds: () => [], seed: () => ({ id: 's' }), promote: async () => promoteResult, git: () => '',
  },
  '../lib/events': { emit: (e) => emitted.push(e) },
  '@neondatabase/serverless': { neon: () => fakeSql },
  './idea-build': { ...realBuild, buildOne: async (slug, opts) => { builds.push({ slug, ...opts }); return { slug, ...buildResult }; } },
  // The growth loop's launch kit (bin/idea-growth.js): a kit with two channels, as the launch skill writes it.
  './idea-growth': { distributionKitOne: async (slug) => {
    kitRuns.push(slug);
    fs.writeFileSync(path.join(DATA, 'ideas', slug, 'LAUNCH-KIT.md'), '# Launch kit\n\n## Order\n1. **r/SideProject**, Tue.\n2. **Indie Hackers**: Thu.\n');
    return { ok: true, slug, channels: ['r/SideProject', 'Indie Hackers'] };
  } },
  // idea-review reads the real record (not IDEA_PIPELINE_DATA): a test that forces the daily steps reviews nothing.
  './idea-review': { pendingSlugs: () => [], reviewOne: async () => ({ ok: false, reason: 'not in tests' }) },
};
const realLoad = Module._load;
Module._load = function (request, parent, ...rest) {
  if (parent && parent.filename.startsWith(ROOT) && !parent.filename.includes(`${path.sep}test${path.sep}`)) {
    if (stubs[request]) return stubs[request];
    if (request === 'child_process') return { execFileSync: (cmd, args) => {
      if (cmd === 'openclaw') sent.push(args);
      if (cmd === 'gh' && args[0] === 'pr' && args[1] === 'view') {
        const fields = args[args.indexOf('--json') + 1] || '';
        if (fields.includes('mergeCommit')) return JSON.stringify({ number: 9, title: 'Growth: test', mergeCommit: { oid: 'abc1234def5678' } });
        if (fields.includes('statusCheckRollup')) return JSON.stringify({ state: gh.prs[args[2]] || 'OPEN', mergeable: 'MERGEABLE', createdAt: '2026-10-01T00:00:00Z', files: [{ path: 'app/page.tsx' }], statusCheckRollup: [], ...(gh.info[args[2]] || {}) });
        return JSON.stringify({ state: gh.prs[args[2]] || 'OPEN' });
      }
      if (cmd === 'gh' && args[0] === 'pr' && ['ready', 'merge', 'close', 'create'].includes(args[1])) {
        gh.calls.push(args.slice(0, 3).join(' '));
        if (args[1] === 'merge' && /^https:/.test(args[2])) gh.prs[args[2]] = 'MERGED';
        if (args[1] === 'close') gh.prs[args[2]] = 'CLOSED';
        return args[1] === 'create' ? 'https://github.com/o/revert/pull/99' : '';
      }
      if (cmd === 'git' && args.includes('revert')) { gh.calls.push('git revert'); gh.revertArgs = args; return ''; }
      if (cmd === 'gh' && args[0] === 'api' && args[1] === 'user') return '7\towner\n';
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
// Build jobs run in this process (bin/idea-build-job.js runJob), and memory is plentiful unless a test says otherwise.
process.env.IDEA_BUILD_INLINE = '1';
const ROOMY = JSON.stringify({ hostFreePct: 50, dockerTotalMb: 16000, containers: [] });
process.env.IDEA_BUILD_PROBE = ROOMY;
process.env.IDEA_DATABASE_URL = 'postgres://fake';
process.env.HOME = HOME;
// The launch checklist probes live URLs: never reach the network from tests.
globalThis.fetch = async () => ({ status: 404 });
const { tick, policy } = require('../bin/idea-pipeline');

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
  // These tests build new ideas in the weekly slot; the new-build hold (policy.build.startNew) has its own test.
  policy.build.startNew = true;
  // Three builds at once, one slot kept for requests (the real policy); no build running.
  policy.build.concurrency = { max: 3, reserveForRequests: 1, reserveMemoryMb: 2000, minFreeMemoryPct: 10, retryAfterHours: 24, hungAfterHours: 6 };
  process.env.IDEA_BUILD_PROBE = ROOMY;
  fs.rmSync(path.join(DATA, '.builds'), { recursive: true, force: true });
  // No focus products unless a growth test names one (policy.growth.focus is tiebreak in the real policy).
  policy.growth.focus = [];
  policy.growth.auto = true;
  kitRuns.length = 0;
  // Autonomy has its own tests: the others run with David merging, as before.
  policy.autonomy.merge = false;
  policy.autonomy.revert = false;
  gh.info = {}; gh.calls = [];
  promoteResult = { promoted: [], errors: [] };
});
test.after(() => { Module._load = realLoad; fs.rmSync(DATA, { recursive: true, force: true }); fs.rmSync(HOME, { recursive: true, force: true }); });

const readState = (slug) => JSON.parse(fs.readFileSync(path.join(DATA, 'ideas', slug, 'state.json'), 'utf8'));
// A build already running: its slot, with a live pid (this process; the tick tests check pids, not ps).
function running(slug, extra = {}) {
  fs.mkdirSync(path.join(DATA, '.builds'), { recursive: true });
  fs.writeFileSync(path.join(DATA, '.builds', `slot-${slug}.json`), JSON.stringify({ slug, milestone: 'MVP', kind: 'request', requestId: null, pid: process.pid, startedAt: new Date().toISOString(), ...extra }));
}

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

test('with three builds running, a request waits, with the reason on the row', async () => {
  idea('pr-x', { stage: 'repo', repo: 'https://github.com/o/pr-x', ownerApproved: true });
  for (const slug of ['b1', 'b2', 'b3']) running(slug);
  db = { requests: [{ id: 8, slug: 'pr-x', status: 'pending' }], log: [] };
  await tick();
  assert.equal(builds.length, 0);
  assert.equal(db.requests[0].status, 'pending');
  assert.match(db.requests[0].result, /waiting: 3 builds are running \(the limit is 3\)/);
  assert.equal(sent.length, 0);
});

test('a request waits while Docker or the Mac is short on memory', async () => {
  idea('pr-x', { stage: 'repo', repo: 'https://github.com/o/pr-x', ownerApproved: true });
  // A 2.4 GB Docker VM with LiteLLM using 600 MB: 1.8 GB to spare, and a build needs 2 GB.
  process.env.IDEA_BUILD_PROBE = JSON.stringify({ hostFreePct: 40, dockerTotalMb: 2400, containers: [{ name: 'litellm', mb: 600 }] });
  db = { requests: [{ id: 8, slug: 'pr-x', status: 'pending' }], log: [] };
  await tick();
  assert.equal(builds.length, 0);
  assert.match(db.requests[0].result, /waiting: Docker has 1\.8 GB to spare, and a build needs 2\.0 GB/);
  process.env.IDEA_BUILD_PROBE = JSON.stringify({ hostFreePct: 6, dockerTotalMb: 16000, containers: [] });
  await tick();
  assert.equal(builds.length, 0);
  assert.match(db.requests[0].result, /waiting: the Mac has 6% of its memory free, and a build needs 10%/);
});

test('three requests start side by side on one tick; a fourth waits for a slot', async () => {
  const slugs = ['pr-a', 'pr-b', 'pr-c', 'pr-d'];
  for (const slug of slugs) idea(slug, { stage: 'repo', repo: `https://github.com/o/${slug}`, ownerApproved: true });
  db = { requests: slugs.map((slug, i) => ({ id: 60 + i, slug, status: 'pending' })), log: [] };
  await tick();
  assert.deepEqual(builds.map((b) => b.slug), ['pr-a', 'pr-b', 'pr-c'], 'no daily cap: as many as there are slots');
  assert.deepEqual(db.requests.map((r) => r.status), ['done', 'done', 'done', 'pending']);
  assert.match(db.requests[3].result, /waiting: 3 builds are running \(the limit is 3\)/);
});

test('a request for an idea that is building waits for that build', async () => {
  idea('pr-x', { stage: 'building', repo: 'https://github.com/o/pr-x', milestonesDone: ['M1'], build: { milestone: 'M2', status: 'running' } });
  running('pr-x');
  db = { requests: [{ id: 12, slug: 'pr-x', status: 'pending' }], log: [] };
  await tick();
  assert.equal(builds.length, 0);
  assert.equal(db.requests[0].status, 'pending');
  assert.match(db.requests[0].result, /waiting: pr-x is building now/);
});

test("a request waits while the idea's last PR is open, instead of being refused", async () => {
  idea('pr-x', { stage: 'live', repo: 'https://github.com/o/pr-x', milestonesDone: ['M1', 'M2'], build: { milestone: 'GROWTH', status: 'pr-open', prUrl: 'https://github.com/o/pr-x/pull/7' } });
  db = { requests: [{ id: 31, slug: 'pr-x', milestone: 'GOLIVE', status: 'pending' }], log: [] };
  await tick();
  assert.equal(builds.length, 0);
  assert.equal(db.requests[0].status, 'pending', 'not failed: the growth PR merges itself soon');
  assert.match(db.requests[0].result, /waiting: pr-x's GROWTH PR is open; this starts once it's merged or closed/);
});

test("a build the pipeline started itself isn't retried within a day of failing", async () => {
  const failedAt = (hours) => ({ stage: 'repo', repo: 'https://github.com/o/pr-x', ownerApproved: true, build: { milestone: 'MVP', status: 'failed', at: new Date(Date.now() - hours * 3_600_000).toISOString(), reason: 'tests failing' } });
  idea('pr-x', failedAt(1));
  db = { requests: [], log: [] };
  await tick();
  assert.deepEqual(builds, [], 'failed an hour ago: it waits, instead of failing again every tick');
  idea('pr-x', failedAt(25));
  await tick();
  assert.deepEqual(builds.map((b) => b.slug), ['pr-x'], 'a day later it is tried again');
});

test('a build whose process died is recorded as failed, and its request answered', async () => {
  idea('pr-x', { stage: 'repo', repo: 'https://github.com/o/pr-x', ownerApproved: true, build: { milestone: 'M1', status: 'running', at: new Date().toISOString() } });
  running('pr-x', { pid: 4_206_649, requestId: 70, milestone: 'M1' }); // no such process
  db = { requests: [{ id: 70, slug: 'pr-x', status: 'running' }], log: [] };
  const out = await tick();
  const s = readState('pr-x');
  assert.equal(s.build.status, 'failed');
  assert.match(s.build.reason, /stopped before it finished/);
  assert.equal(db.requests[0].status, 'failed');
  assert.ok(out.errors.some((e) => /build pr-x M1/.test(e)), 'the tick reports it, so the system log alerts');
  assert.equal(fs.existsSync(path.join(DATA, '.builds', 'slot-pr-x.json')), false, 'its slot is freed');
  assert.deepEqual(builds, [], 'and it is not retried right away');
});

test("the tick leaves a building idea's record alone until its build is done", async () => {
  idea('pr-x', { stage: 'repo', repo: 'https://github.com/o/pr-x', ownerApproved: true, build: { milestone: 'M1', status: 'running' } });
  running('pr-x');
  db = { requests: [], log: [], decisions: [{ id: 3, slug: 'pr-x', decision: 'pass', status: 'pending' }] };
  await tick();
  assert.equal(readState('pr-x').stage, 'repo', 'not passed in the middle of its build');
  assert.equal(db.decisions[0].status, 'pending', 'applied once the build is done');
  assert.equal(readState('pr-x').launch, undefined, 'nor its launch checklist written');
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
  policy.build.concurrency.max = 0; // no builds: this one is about the checklist and the plan
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

test('automatic builds go to the approved ideas closest to money first, and leave a slot for requests', async () => {
  idea('a-first', { stage: 'repo', repo: 'https://github.com/o/a-first', ownerApproved: true, review: { verdict: 'pass', score: 3 } });
  idea('b-demand', { stage: 'repo', repo: 'https://github.com/o/b-demand', ownerApproved: true, review: { verdict: 'validate', score: 7 }, validation: { decision: 'build' } });
  idea('c-third', { stage: 'repo', repo: 'https://github.com/o/c-third', ownerApproved: true, review: { verdict: 'validate', score: 5 } });
  db = { requests: [], log: [] };
  await tick();
  assert.equal(builds[0].slug, 'b-demand', 'closest to money first');
  assert.equal(builds[0].mvp, true);
  assert.equal(builds.length, 2, 'two of the three slots: the last is kept for "Start build now"');
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

test("a homepage on one of the project's login-protected Vercel addresses moves to its public URL, once", async () => {
  idea('pr-x', { stage: 'building', repo: 'https://github.com/o/pr-x', milestonesDone: ['M1', 'M2'], golive: { mergedAt: 'x' }, build: { milestone: 'GOLIVE', status: 'merged' } });
  fs.writeFileSync(path.join(DATA, 'ideas', 'pr-x', 'revenue.json'), '{}');
  const teamAddress = 'https://pr-x-david-smiths-projects.vercel.app';
  // RepoHQ still has the old homepage after the move; GitHub has the last word.
  db = { requests: [], startsLast24h: 0, log: [], repos: [{ full_name: 'o/pr-x', mrr: 0, lifecycle_status: null, homepage: teamAddress, stripe_product_id: null }] };
  gh.homepage = teamAddress;
  vercelOut.ls = 'https://pr-x-abc123def-david-smiths-projects.vercel.app ● Ready Production';
  vercelOut.inspect = `Aliases\n  https://pr-x-seven.vercel.app\n  ${teamAddress}\n`;
  const out = await tick();
  assert.deepEqual(gh.edits, [['repo', 'edit', 'o/pr-x', '--homepage', 'https://pr-x-seven.vercel.app']]);
  assert.ok(out.changes.includes(`pr-x: homepage moved to https://pr-x-seven.vercel.app (${teamAddress} is behind Vercel's login)`), out.changes.join('\n'));
  gh.homepage = 'https://pr-x-seven.vercel.app';
  gh.edits = [];
  await tick();
  assert.deepEqual(gh.edits, [], 'moved once: RepoHQ lagging behind GitHub moves nothing');
  // A homepage of the owner's own (a custom domain) is never touched.
  db.repos[0].homepage = 'https://pr-x.example.com';
  gh.homepage = 'https://pr-x.example.com';
  fs.writeFileSync(path.join(DATA, '.pipeline-state.json'), JSON.stringify({ lastDaily: new Date().toLocaleDateString('en-CA') }));
  await tick();
  assert.deepEqual(gh.edits, []);
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

test('a merged build PR is logged ok, so a failure from when it opened stops showing as failing now', async () => {
  idea('pr-m', { stage: 'building', repo: 'https://github.com/o/pr-m', milestonesDone: [], build: { milestone: 'MVP', milestones: ['M1', 'M2'], planned: ['M1', 'M2', 'M3'], stopped: 'M3: tests failing', status: 'pr-open', prUrl: 'https://github.com/o/pr-m/pull/1', testsPassing: false } });
  fs.writeFileSync(path.join(DATA, 'ideas', 'pr-m', 'revenue.json'), '{}');
  gh.prs['https://github.com/o/pr-m/pull/1'] = 'MERGED';
  db = { requests: [], startsLast24h: 0, log: [] };
  emitted.length = 0;
  await tick();
  const ok = emitted.find((e) => e.component === 'build' && e.event === 'MVP' && e.status === 'ok');
  assert.ok(ok, JSON.stringify(emitted.map((e) => [e.component, e.event, e.status])));
  assert.equal(ok.message, 'pr-m: MVP (M1, M2) PR merged https://github.com/o/pr-m/pull/1');
  assert.deepEqual(ok.subject, { idea: 'pr-m' });
});

test("the daily steps run once a day: a later write of the pipeline state keeps today's date", async () => {
  // Daily steps due; then step 5c writes a road-to-revenue plan, which writes the pipeline state again.
  idea('pr-d', { stage: 'building', repo: 'https://github.com/o/pr-d', milestonesDone: ['M1', 'M2'], golive: { mergedAt: 'x' }, build: { milestone: 'GOLIVE', status: 'merged' } });
  fs.writeFileSync(path.join(DATA, '.pipeline-state.json'), JSON.stringify({ lastDaily: '2000-01-01' }));
  db = { requests: [], startsLast24h: 0, log: [] };
  const out = await tick({ forceDaily: true });
  assert.equal(out.daily, true);
  assert.deepEqual(revenueRuns, ['pr-d'], 'the plan was written after the daily steps');
  const ps = JSON.parse(fs.readFileSync(path.join(DATA, '.pipeline-state.json'), 'utf8'));
  assert.equal(ps.lastDaily, new Date().toLocaleDateString('en-CA'), 'otherwise the daily steps run again on the next tick');
});

test('a go-live PR on a live product is followed: its merge is recorded and the product stays live', async () => {
  idea('pr-l', { stage: 'live', repo: 'https://github.com/o/pr-l', milestonesDone: ['M1', 'M2'], build: { milestone: 'GOLIVE', milestones: [], status: 'pr-open', prUrl: 'https://github.com/o/pr-l/pull/7', beacon: 'funnel' } });
  fs.writeFileSync(path.join(DATA, 'ideas', 'pr-l', 'revenue.json'), '{}');
  gh.prs['https://github.com/o/pr-l/pull/7'] = 'MERGED';
  db = { requests: [], startsLast24h: 0, log: [] };
  await tick();
  const s = readState('pr-l');
  assert.equal(s.build.status, 'merged');
  assert.equal(s.golive.prUrl, 'https://github.com/o/pr-l/pull/7');
  assert.equal(s.golive.beacon, 'funnel', 'built with the funnel beacon: the growth loop needn\'t wait for a visit');
  assert.equal(s.stage, 'live');
});

test('while new builds are held, an approved idea waits but a started MVP carries on', async () => {
  policy.build.startNew = false; // growth.focus is tiebreak, which has no traction in this record
  idea('fresh', { stage: 'repo', repo: 'https://github.com/o/fresh', ownerApproved: true });
  idea('started', { stage: 'building', repo: 'https://github.com/o/started', milestonesDone: ['M1'], build: { milestone: 'M1', status: 'merged' } });
  fs.writeFileSync(path.join(DATA, 'ideas', 'started', 'revenue.json'), '{}');
  db = { requests: [], log: [] };
  await tick();
  assert.deepEqual(builds.map((b) => `${b.slug} ${b.milestone}`), ['started MVP'], 'the approval waits for a focus product with traction; the started MVP carries on, on any tick');
});

test("a built product's funnel is saved, and rewritten only when it changes; a demand test's signals are as before", async () => {
  idea('pr-f', { stage: 'building', repo: 'https://github.com/o/pr-f', milestonesDone: ['M1', 'M2'], golive: { mergedAt: 'x' }, build: { milestone: 'GOLIVE', status: 'merged' } });
  fs.writeFileSync(path.join(DATA, 'ideas', 'pr-f', 'revenue.json'), '{}');
  idea('pr-v', { stage: 'validate', page: { url: 'https://idea-pages/pr-v/' }, validation: { startedAt: new Date().toISOString(), decideAfter: new Date(Date.now() + 5 * 86_400_000).toISOString() } });
  db = { requests: [], startsLast24h: 0, log: [],
    funnelRows: [
      { slug: 'pr-f', kind: 'view', events: 4, all_time: 2, d7: 2, prev7: 0 },
      { slug: 'pr-f', kind: 'reach', events: 4, all_time: 2, d7: 2, prev7: 0 },
      { slug: 'pr-v', kind: 'view', events: 5, all_time: 3, d7: 3, prev7: 0 },
      { slug: 'pr-v', kind: 'signup', events: 1, all_time: 1, d7: 1, prev7: 0 },
      { slug: 'pr-v', kind: 'reach', events: 5, all_time: 3, d7: 3, prev7: 0 },
    ],
    referrerRows: [{ slug: 'pr-f', host: 'news.ycombinator.com', visitors: 2 }] };
  const out = await tick();
  assert.deepEqual(out.errors, []);
  const f = readState('pr-f').funnel;
  assert.deepEqual(f.d7, { visit: 2, signup: 0, activate: 0, checkout: 0 });
  assert.deepEqual(f.referrers7d, [{ host: 'news.ycombinator.com', visitors: 2 }]);
  assert.ok(out.changes.includes('pr-f: funnel: 2 visitors this week (0 the week before), 0 activations, 0 Buy clicks'), out.changes.join('\n'));
  const v = readState('pr-v');
  assert.deepEqual([v.signals.views, v.signals.uniqueVisitors, v.signals.signups], [5, 3, 1]);
  assert.equal(v.funnel, undefined, 'a demand test has no funnel');
  const again = await tick();
  assert.ok(!again.changes.some((c) => c.startsWith('pr-f: funnel')), 'unchanged: not rewritten');
});

// ── The growth loop (step 5d) ─────────────────────────────────────────────────────────────────────────
// A live, launch-ready product: the pipeline's cached production URL, live probe, legal pages and a 9/9 audit.
function liveProduct(slug, extra = {}) {
  idea(slug, { stage: 'building', repo: `https://github.com/o/${slug}`, milestonesDone: ['M1', 'M2'], golive: { mergedAt: 'x' }, build: { milestone: 'GOLIVE', status: 'merged' }, ...extra });
  fs.writeFileSync(path.join(DATA, 'ideas', slug, 'revenue.json'), '{}');
  const at = new Date().toISOString();
  const url = `https://${slug}.vercel.app`;
  fs.writeFileSync(path.join(DATA, '.pipeline-state.json'), JSON.stringify({ lastDaily: new Date().toLocaleDateString('en-CA'),
    prod: { [slug]: { at, url, homepageSet: true } }, live: { [slug]: { at, url } }, legal: { [slug]: { at, found: { privacy: true, terms: true } } },
    audit: { [slug]: { at, url, result: { ready: true, passed: 9, total: 9, missing: [], checks: [{ id: 'privacy', ok: true }, { id: 'terms', ok: true }] } } } }));
}
const visitsOf = (slug, kind, n) => [{ slug, kind, events: n, all_time: n, d7: n, prev7: 0 }, { slug, kind: 'reach', events: n, all_time: n, d7: n, prev7: 0 }];

test('a focus product gets one growth mission a day: the funnel beacon first, as a draft PR', async () => {
  policy.growth.focus = ['pr-g'];
  liveProduct('pr-g');
  buildResult = { ...buildResult, milestone: 'GROWTH', prUrl: 'https://github.com/o/pr-g/pull/9' };
  db = { requests: [], startsLast24h: 0, log: [], funnelRows: visitsOf('pr-g', 'view', 3) };
  const out = await tick({ forceGrowth: true });
  assert.deepEqual(out.errors, []);
  assert.deepEqual(builds.map((b) => [b.slug, b.milestone, b.growth?.experiment.kind]), [['pr-g', 'GROWTH', 'instrumentation']]);
  assert.match(builds[0].growth.brief, /^# Growth brief: pr-g, funnel beacon/);
  assert.match(builds[0].growth.task, /"activate" the first time/);
  const g = readState('pr-g').growth;
  assert.equal(g.stage, 'instrument');
  assert.deepEqual(g.experiments.map((e) => [e.kind, e.status, e.prUrl]), [['instrumentation', 'proposed', 'https://github.com/o/pr-g/pull/9']]);
  assert.ok(out.changes.some((c) => /^pr-g: growth mission: funnel beacon \(a draft PR\)/.test(c)), out.changes.join('\n'));
  await tick({ forceGrowth: true });
  assert.equal(builds.length, 1, 'one mission per product per day, and nothing new while its PR waits');
});

test('no growth mission for a product outside the focus, or while every slot is taken', async () => {
  liveProduct('pr-g');
  db = { requests: [], log: [], funnelRows: visitsOf('pr-g', 'view', 3) };
  await tick({ forceGrowth: true });
  assert.deepEqual(builds, [], 'not in policy.growth.focus');
  assert.equal(readState('pr-g').growth, undefined);
  policy.growth.focus = ['pr-g'];
  running('other-1'); running('other-2'); // two builds running: the third slot is kept for requests
  await tick({ forceGrowth: true });
  assert.deepEqual(builds, [], 'the mission waits for a free slot');
  const g = readState('pr-g').growth;
  assert.equal(g.next.kind, 'instrumentation', 'still recorded as the next mission');
  assert.deepEqual(g.experiments, [], 'nothing started, so nothing recorded as proposed');
  fs.rmSync(path.join(DATA, '.builds'), { recursive: true, force: true });
  await tick({ forceGrowth: true });
  assert.deepEqual(builds.map((b) => `${b.slug} ${b.milestone}`), ['pr-g GROWTH'], 'a slot is free: the mission starts');
});

test('a merged growth PR starts its experiment; a closed one abandons it', async () => {
  const proposed = (slug, n) => ({ stage: 'live', repo: `https://github.com/o/${slug}`, milestonesDone: ['M1'],
    build: { milestone: 'GROWTH', milestones: [], experiment: `${slug}-20261013-seo`, kind: 'seo', status: 'pr-open', prUrl: `https://github.com/o/${slug}/pull/${n}` },
    growth: { experiments: [{ id: `${slug}-20261013-seo`, kind: 'seo', executor: 'build', status: 'proposed', windowDays: 28, createdAt: '2026-10-13T10:00:00Z', prUrl: `https://github.com/o/${slug}/pull/${n}` }] } });
  idea('pr-m', proposed('pr-m', 3));
  idea('pr-c', proposed('pr-c', 4));
  for (const s of ['pr-m', 'pr-c']) fs.writeFileSync(path.join(DATA, 'ideas', s, 'revenue.json'), '{}');
  gh.prs['https://github.com/o/pr-m/pull/3'] = 'MERGED';
  gh.prs['https://github.com/o/pr-c/pull/4'] = 'CLOSED';
  db = { requests: [], startsLast24h: 0, log: [] };
  emitted.length = 0;
  const out = await tick();
  const m = readState('pr-m');
  assert.deepEqual([m.stage, m.build.status, m.growth.experiments[0].status], ['live', 'merged', 'running']);
  assert.equal(new Date(m.growth.experiments[0].endsAt) - new Date(m.growth.experiments[0].startedAt), 28 * 86_400_000, 'its window, from the merge');
  assert.deepEqual(m.milestonesDone, ['M1'], 'a growth merge marks no milestone');
  const c = readState('pr-c');
  assert.deepEqual([c.build.status, c.growth.experiments[0].status], ['closed', 'abandoned']);
  assert.ok(out.changes.some((x) => /^pr-m: growth PR merged: the seo experiment runs until \d{4}-\d{2}-\d{2}$/.test(x)), out.changes.join('\n'));
  assert.ok(emitted.some((e) => e.component === 'build' && e.event === 'GROWTH' && e.status === 'ok'));
});

test('short of visitors with no kit: a launch kit for David, whose experiment runs from his first post', async () => {
  policy.growth.focus = ['pr-k'];
  liveProduct('pr-k');
  db = { requests: [], startsLast24h: 0, log: [], funnelRows: visitsOf('pr-k', 'visit', 3) };
  const out = await tick({ forceGrowth: true });
  assert.deepEqual(builds, []);
  assert.deepEqual(kitRuns, ['pr-k']);
  const e = readState('pr-k').growth.experiments[0];
  assert.deepEqual([e.kind, e.executor, e.status, e.channels, e.artifact], ['kit', 'claude', 'proposed', 2, 'LAUNCH-KIT.md']);
  assert.ok(out.changes.includes('pr-k: launch kit ready for David: r/SideProject, Indie Hackers'), out.changes.join('\n'));
  fs.writeFileSync(path.join(DATA, 'ideas', 'pr-k', 'launch-log.json'), JSON.stringify({ posts: [{ channel: 'r/SideProject', postedAt: new Date(Date.now() + 1000).toISOString() }] }));
  await tick({ forceGrowth: true });
  const g = readState('pr-k').growth;
  assert.equal(g.experiments[0].status, 'running', "the kit's experiment runs from the first post");
  assert.equal(g.next.kind, 'seo', 'with a kit out, search pages are next (tomorrow: one mission a day)');
  assert.deepEqual([kitRuns, builds], [['pr-k'], []]);
});

// ── Autonomy (4a0) and Phase 3 (the judge in 5d) ───────────────────────────────────────────────────────
const growthPr = (slug, n, extra = {}) => ({ stage: 'live', repo: `https://github.com/o/${slug}`, milestonesDone: ['M1'],
  build: { milestone: 'GROWTH', kind: 'seo', experiment: `${slug}-x-seo`, status: 'pr-open', prUrl: `https://github.com/o/${slug}/pull/${n}`, testsPassing: true, ...extra },
  growth: { experiments: [{ id: `${slug}-x-seo`, kind: 'seo', executor: 'build', metric: 'visit', status: 'proposed', windowDays: 28, createdAt: '2026-10-13T10:00:00Z', prUrl: `https://github.com/o/${slug}/pull/${n}` }] } });
const green = [{ __typename: 'CheckRun', name: 'web', status: 'COMPLETED', conclusion: 'SUCCESS' }];

test('the pipeline merges its own green PR, and its experiment starts in the same tick', async () => {
  policy.autonomy.merge = true;
  idea('pr-a', growthPr('pr-a', 5));
  fs.writeFileSync(path.join(DATA, 'ideas', 'pr-a', 'revenue.json'), '{}');
  gh.info['https://github.com/o/pr-a/pull/5'] = { statusCheckRollup: green };
  db = { requests: [], startsLast24h: 0, log: [] };
  emitted.length = 0;
  const out = await tick();
  assert.deepEqual(gh.calls, ['pr ready https://github.com/o/pr-a/pull/5', 'pr merge https://github.com/o/pr-a/pull/5']);
  const s = readState('pr-a');
  assert.deepEqual([s.build.status, s.build.mergedBy, s.growth.experiments[0].status], ['merged', 'agent', 'running']);
  assert.ok(out.changes.some((c) => c.startsWith('pr-a: merged its own PR https://github.com/o/pr-a/pull/5 (1 check green, tests passing)')), out.changes.join('\n'));
  assert.ok(emitted.some((e) => e.component === 'autonomy' && e.event === 'merge'));
});

test("a growth PR whose checks fail is closed by the loop, and its mission comes back the next day", async () => {
  policy.autonomy.merge = true;
  idea('pr-r', growthPr('pr-r', 6));
  fs.writeFileSync(path.join(DATA, 'ideas', 'pr-r', 'revenue.json'), '{}');
  gh.info['https://github.com/o/pr-r/pull/6'] = { statusCheckRollup: [{ __typename: 'CheckRun', name: 'web', status: 'COMPLETED', conclusion: 'FAILURE' }] };
  db = { requests: [], startsLast24h: 0, log: [] };
  await tick();
  assert.deepEqual(gh.calls, ['pr close https://github.com/o/pr-r/pull/6']);
  const e = readState('pr-r').growth.experiments[0];
  assert.deepEqual([readState('pr-r').build.status, e.status, e.failed, e.reason], ['closed', 'abandoned', true, 'web failed']);
});

test('a PR that touches CI, or a roadmap build with failing tests, waits for David', async () => {
  policy.autonomy.merge = true;
  idea('pr-h', { stage: 'building', repo: 'https://github.com/o/pr-h', milestonesDone: [], build: { milestone: 'M1', status: 'pr-open', prUrl: 'https://github.com/o/pr-h/pull/1', testsPassing: true } });
  idea('pr-f', { stage: 'building', repo: 'https://github.com/o/pr-f', milestonesDone: [], build: { milestone: 'MVP', status: 'pr-open', prUrl: 'https://github.com/o/pr-f/pull/2', testsPassing: false } });
  gh.info['https://github.com/o/pr-h/pull/1'] = { statusCheckRollup: green, files: [{ path: 'src/a.js' }, { path: '.github/workflows/ci.yml' }] };
  db = { requests: [], startsLast24h: 0, log: [] };
  await tick();
  assert.deepEqual(gh.calls, [], 'nothing merged or closed');
  assert.equal(readState('pr-h').build.held, 'it changes .github/workflows/ci.yml, which only David merges');
  assert.equal(readState('pr-f').build.held, "its tests failed in the pipeline's run");
  assert.equal(readState('pr-f').build.status, 'pr-open', 'a roadmap PR stays open for David');
});

test("an agent's merge that breaks the live site's launch checks is reverted, and Slack is told", async () => {
  policy.autonomy.revert = true;
  const url = 'https://github.com/o/pr-v/pull/7';
  liveProduct('pr-v', { stage: 'live', build: { milestone: 'GROWTH', experiment: 'pr-v-x-seo', status: 'merged', prUrl: url, mergedBy: 'agent', mergedAt: new Date(Date.now() - 3_600_000).toISOString() },
    growth: { experiments: [{ id: 'pr-v-x-seo', kind: 'seo', executor: 'build', metric: 'visit', status: 'running', windowDays: 28, createdAt: '2026-10-13T10:00:00Z', startedAt: new Date().toISOString(), endsAt: '2099-01-01T00:00:00Z', prUrl: url }] } });
  const ps = JSON.parse(fs.readFileSync(path.join(DATA, '.pipeline-state.json'), 'utf8'));
  ps.audit['pr-v'].at = '2000-01-01T00:00:00Z'; // re-audited this tick, as after a merge
  fs.writeFileSync(path.join(DATA, '.pipeline-state.json'), JSON.stringify(ps));
  db = { requests: [], startsLast24h: 0, log: [] };
  emitted.length = 0;
  const out = await tick(); // fetch answers 404: the home page is down
  assert.deepEqual(gh.calls, ['git revert', 'pr create --base', 'pr merge revert-9']);
  const s = readState('pr-v');
  assert.equal(s.build.reverted.url, 'https://github.com/o/revert/pull/99');
  assert.deepEqual(gh.revertArgs.slice(0, 4), ['-c', 'user.name=idea-factory', '-c', 'user.email=7+owner@users.noreply.github.com'], "the revert is by the owner's GitHub account, so Vercel builds it");
  assert.deepEqual([s.growth.experiments[0].status, s.growth.experiments[0].decision], ['decided', 'revert']);
  assert.ok(emitted.some((e) => e.component === 'autonomy' && e.event === 'revert' && e.status === 'fail'), 'a revert alerts Slack');
  assert.ok(out.changes.some((c) => c.startsWith(`pr-v: reverted its own merge ${url}`)), out.changes.join('\n'));

  // The revert deployed: the next tick audits again, and the alert is closed ("recovered" on Slack), once.
  const page = '<title>pr-v — a product</title><meta name="description" content="d"><meta property="og:image" content="/og.png">';
  globalThis.fetch = async (u) => (u.startsWith('https://pr-v.vercel.app') ? { status: 200, text: async () => page } : { status: 404, text: async () => '' });
  emitted.length = 0;
  const after = await tick();
  assert.ok(emitted.some((e) => e.component === 'autonomy' && e.event === 'revert' && e.status === 'ok'), emitted.map((e) => `${e.event} ${e.status}`).join(', '));
  assert.ok(after.changes.includes('pr-v: the live site passes its launch checks again after the revert'), after.changes.join('\n'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(DATA, '.pipeline-state.json'), 'utf8')).revertAlerts, {});
  emitted.length = 0;
  await tick();
  assert.ok(!emitted.some((e) => e.event === 'revert'), 'closed once');
});

test('a first-screen experiment the judge finds clearly worse is reverted, as news for the morning email, not an alert', async () => {
  policy.autonomy.revert = true;
  policy.growth.focus = ['pr-w'];
  policy.growth.auto = false;
  const url = 'https://github.com/o/pr-w/pull/4';
  const e = { id: 'pr-w-20260901-landing', kind: 'landing', executor: 'build', metric: 'activate', hypothesis: 'A clearer first screen gets more people to try it.', baseline: 0.2, target: 0.3, windowDays: 14,
    status: 'running', createdAt: '2026-09-01T00:00:00Z', startedAt: '2026-09-01T00:00:00Z', endsAt: '2026-09-15T00:00:00Z', prUrl: url };
  liveProduct('pr-w', { growth: { experiments: [e] } });
  // 20 of 100 visitors activated before it, 5 of 100 after: 75% worse.
  db = { requests: [], startsLast24h: 0, log: [], window: (from, to) => (to === '2026-09-01T00:00:00Z' ? [{ kind: 'reach', n: 100 }, { kind: 'activate', n: 20 }] : [{ kind: 'reach', n: 100 }, { kind: 'activate', n: 5 }]) };
  emitted.length = 0;
  await tick();
  assert.deepEqual(gh.calls, ['git revert', 'pr create --base', 'pr merge revert-9']);
  const decided = readState('pr-w').growth.experiments[0];
  assert.deepEqual([decided.status, decided.decision, decided.reverted.url], ['decided', 'revert', 'https://github.com/o/revert/pull/99']);
  const rv = emitted.filter((x) => x.component === 'autonomy' && x.event === 'revert');
  assert.deepEqual(rv.map((x) => x.status), ['info'], 'a planned revert is not a failure: no Slack alert left open');
  assert.equal(JSON.parse(fs.readFileSync(path.join(DATA, '.pipeline-state.json'), 'utf8')).revertAlerts, undefined);
});

test('an experiment past its window is judged: a line in LEARNINGS.md, and a kept one proposed for the playbook', async () => {
  policy.growth.focus = ['pr-j'];
  policy.growth.auto = false; // the judge runs every tick; no new mission in this test
  const e = { id: 'pr-j-20260901-seo', kind: 'seo', executor: 'build', metric: 'visit', hypothesis: 'Search pages bring visitors.', baseline: 3, target: 50, windowDays: 14,
    status: 'running', createdAt: '2026-09-01T00:00:00Z', startedAt: '2026-09-01T00:00:00Z', endsAt: '2026-09-15T00:00:00Z', prUrl: 'https://github.com/o/pr-j/pull/3' };
  liveProduct('pr-j', { growth: { experiments: [e] } });
  db = { requests: [], startsLast24h: 0, log: [], window: (from, to) => (to === '2026-09-01T00:00:00Z' ? [{ kind: 'reach', n: 6 }] : [{ kind: 'reach', n: 120 }]) };
  await tick();
  const decided = readState('pr-j').growth.experiments[0];
  assert.deepEqual([decided.status, decided.decision, decided.result.value, decided.result.before], ['decided', 'keep', 60, 3]);
  assert.match(fs.readFileSync(path.join(DATA, 'ideas', 'pr-j', 'LEARNINGS.md'), 'utf8'), /· search pages \(pr-j-20260901-seo\) · keep: 3 visitors a week → 60 visitors a week \(target 50 visitors a week\)\. Search pages bring visitors\./);
  assert.match(fs.readFileSync(path.join(DATA, 'PLAYBOOK.md'), 'utf8'), /## Proposed\n\n- Search pages bring visitors\. \(kept on pr-j, \d{4}-\d{2}-\d{2}: 3 visitors a week → 60 visitors a week\)/);
  fs.rmSync(path.join(DATA, 'PLAYBOOK.md'), { force: true });
});

test('decisions from the Ideas page apply on this tick: Build gets its repo now, and a refused one says why', async () => {
  idea('d-build', { stage: 'pass', review: { verdict: 'pass', score: 4 } });
  idea('d-pass', { stage: 'idea' });
  idea('d-late', { stage: 'building', repo: 'https://github.com/o/d-late' });
  db = { requests: [], startsLast24h: 0, log: [], decisions: [
    { id: 1, slug: 'd-build', decision: 'build', note: 'ship the CLI first', status: 'pending' },
    { id: 2, slug: 'd-pass', decision: 'pass', note: null, status: 'pending' },
    { id: 3, slug: 'd-late', decision: 'validate', note: null, status: 'pending' },
    { id: 4, slug: 'd-gone', decision: 'pass', note: null, status: 'pending' },
  ] };
  promoteResult = { promoted: [{ slug: 'd-build', title: 'd-build', repoUrl: 'https://github.com/o/d-build' }], errors: [] };
  const out = await tick();
  const st = (slug) => JSON.parse(fs.readFileSync(path.join(DATA, 'ideas', slug, 'state.json'), 'utf8'));
  assert.deepEqual([st('d-build').repo, st('d-build').ownerApproved, st('d-build').ownerDecision.note], ['https://github.com/o/d-build', true, 'ship the CLI first']);
  assert.deepEqual([st('d-pass').stage, st('d-pass').passReason, st('d-pass').ownerDecision.source], ['pass', 'owner', 'repohq']);
  assert.equal(st('d-late').stage, 'building');
  assert.deepEqual(db.decisions.map((d) => d.status), ['applied', 'applied', 'failed', 'failed']);
  assert.equal(db.decisions[0].result, 'owner set Build (RepoHQ Ideas page)');
  assert.match(db.decisions[2].result, /not yet being built/);
  assert.match(db.decisions[3].result, /no such idea/);
  assert.ok(out.changes.some((c) => c === 'd-build: repo created https://github.com/o/d-build'));
});
