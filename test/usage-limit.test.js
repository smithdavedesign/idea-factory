// Builds pause at the Claude usage limit (lib/usage-limit.js), the Mac gets ready for a build (lib/machine.js),
// first builds may start at night (lib/pipeline.js newBuildsHeld 'night'). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const UL = require('../lib/usage-limit');
const M = require('../lib/machine');
const PL = require('../lib/plan');
const P = require('../lib/pipeline');

const REAL = "You've hit your org's monthly spend limit · ask your admin to raise it at claude.ai/admin-settings/usage · your weekly limit resets 4pm (UTC)";

test('the usage limit is recognised, other failures are not', () => {
  assert.equal(UL.isUsageLimit(REAL), true);
  assert.equal(UL.isUsageLimit('Claude AI usage limit reached|1761926400'), true);
  assert.equal(UL.isUsageLimit("You've hit your limit · resets 3am (America/Los_Angeles)"), true);
  assert.equal(UL.isUsageLimit('tests failing'), false);
  assert.equal(UL.isUsageLimit("couldn't start the build sandbox: sandbox open: Docker is not running"), false);
  assert.equal(UL.isUsageLimit(''), false);
});

test('the reset time is the next one named, plus a few minutes', () => {
  const now = new Date('2026-10-31T07:01:33Z');
  assert.equal(UL.resumeAt(REAL, now).toISOString(), '2026-10-31T16:05:00.000Z');
  // Past today's 4pm UTC: tomorrow's.
  assert.equal(UL.resumeAt(REAL, new Date('2026-10-31T17:00:00Z')).toISOString(), '2026-11-01T16:05:00.000Z');
  // A named time zone (PDT is UTC-7 on Oct 31; 07:01Z is 00:01 PDT, so 3:30am is later today).
  assert.equal(UL.resumeAt('limit resets 3:30am (America/Los_Angeles)', now).toISOString(), '2026-10-31T10:35:00.000Z');
  // Nothing named: the 5-hour window.
  assert.equal(UL.resumeAt('usage limit', now).toISOString(), '2026-10-31T12:01:33.000Z');
});

test('the hold takes the latest reset and lapses after it', () => {
  const r = (slug, at) => ({ slug, usageLimited: true, resumeAt: at, reason: REAL });
  let hold = UL.holdAfter(null, [{ slug: 'x', ok: true }]);
  assert.equal(hold, null);
  hold = UL.holdAfter(null, [r('a', '2026-10-31T16:05:00Z'), r('b', '2026-10-31T18:00:00Z')]);
  assert.equal(hold.until, '2026-10-31T18:00:00.000Z');
  assert.equal(hold.slug, 'b');
  assert.equal(UL.holdAfter(hold, [r('c', '2026-10-31T17:00:00Z')]), hold, 'an earlier reset keeps the later hold');
  assert.equal(UL.holdActive(hold, new Date('2026-10-31T17:59:00Z')), true);
  assert.equal(UL.holdActive(hold, new Date('2026-10-31T18:00:01Z')), false);
  assert.equal(UL.holdActive(null), false);
});

test('a plan item paused at the limit is not a failed run, and goes again at once', () => {
  const now = new Date('2026-10-31T16:10:00Z');
  const item = { id: 'etsy', attempts: ['e1', 'e2', 'e3'] };
  const paused = (id) => ({ id, status: 'abandoned', failed: true, paused: true, updatedAt: '2026-10-31T16:00:00Z' });
  const st = PL.itemStatus(item, [paused('e1'), paused('e2'), paused('e3')]);
  assert.equal(st.status, 'failed', 'three pauses never drop it');
  assert.equal(PL.nextItem({ items: [item] }, [paused('e1'), paused('e2'), paused('e3')], now), item, 'no 12-hour wait after a pause');
  const failed = (id) => ({ id, status: 'abandoned', failed: true, updatedAt: '2026-10-31T16:00:00Z' });
  assert.equal(PL.nextItem({ items: [item] }, [failed('e1'), failed('e2'), failed('e3')], now), null, 'real failures still drop it');
});

test("startNew 'night' lifts the focus hold only at night", () => {
  const policy = { build: { startNew: 'night' }, growth: { focus: ['tb'], minVisitorsPerWeek: 50 }, schedule: { night: { from: '22:00', to: '07:00' }, day: { from: '12:00', to: '17:00' } } };
  const at = (h) => { const d = new Date(2026, 9, 31, h, 30); return d; };
  const entries = [['tb', { funnel: { d7: { visit: 3 } } }]];
  assert.equal(P.newBuildsHeld(policy, entries, at(23)), false, 'night: first builds may start');
  assert.equal(P.newBuildsHeld(policy, entries, at(3)), false);
  assert.equal(P.newBuildsHeld(policy, entries, at(13)), true, 'day: still held');
  assert.equal(P.newBuildsHeld(policy, [['tb', { funnel: { d7: { visit: 60 } } }]], at(13)), false, 'traction lifts it any time');
  assert.equal(P.newBuildsHeld({ ...policy, build: { startNew: false } }, entries, at(23)), true, 'false still holds at night');
});

test('ensureDocker starts Docker when it is down and waits for it', async () => {
  const calls = [];
  let up = false;
  const exec = (cmd, args) => {
    calls.push([cmd, ...args].join(' '));
    if (cmd === 'docker' && args[0] === 'info') { if (!up) throw new Error('down'); return '29.7.2'; }
    if (cmd === 'docker' && args[0] === 'desktop') { up = true; return ''; }
    return '';
  };
  const r = await M.ensureDocker({ exec, wait: async () => {}, pollMs: 1, waitMs: 10 });
  assert.equal(r.ok, true);
  assert.equal(r.started, true);
  assert.ok(calls.includes('docker desktop start --detach'));
  assert.deepEqual(await M.ensureDocker({ exec, wait: async () => {} }), { ok: true, started: false });
  const never = await M.ensureDocker({ exec: (cmd, args) => { if (args[0] === 'info') throw new Error('down'); return ''; }, wait: async () => {}, pollMs: 1, waitMs: 3 });
  assert.equal(never.ok, false);
  assert.match(never.reason, /didn't answer/);
});

test('freeOllama unloads each loaded model with keep_alive 0', async () => {
  const posts = [];
  const fetchFn = async (url, opts = {}) => {
    if (url.endsWith('/api/ps')) return { json: async () => ({ models: [{ name: 'qwen2.5-7b-16k:latest' }, { model: 'qwen3:8b' }] }) };
    posts.push(JSON.parse(opts.body));
    return { json: async () => ({}) };
  };
  assert.deepEqual(await M.freeOllama({ fetchFn }), ['qwen2.5-7b-16k:latest', 'qwen3:8b']);
  assert.deepEqual(posts, [{ model: 'qwen2.5-7b-16k:latest', keep_alive: 0 }, { model: 'qwen3:8b', keep_alive: 0 }]);
  assert.deepEqual(await M.freeOllama({ fetchFn: async () => { throw new Error('ECONNREFUSED'); } }), []);
});
