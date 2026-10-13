// lib/build-slots.js: how many builds may run at once (policy.build.concurrency). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const BS = require('../lib/build-slots');

const cfg = { ...BS.DEFAULTS }; // max 3, one slot for requests, 2 GB a build, 10% of the Mac free
const docker = (totalMb, containers) => ({ hostFreePct: 40, dockerTotalMb: totalMb, containers });

test('the readings: memory_pressure and docker stats sizes', () => {
  assert.equal(BS.parseFreePct('The system has 17179869184 (4194304 pages with a page size of 4096).\nSystem-wide memory free percentage: 24%'), 24);
  assert.equal(BS.parseFreePct('nothing'), null);
  assert.equal(BS.parseMiB('499.3MiB'), 499.3);
  assert.equal(BS.parseMiB('1.5GiB'), 1536);
  assert.equal(BS.parseMiB('512kB'), 0.5);
  assert.equal(BS.parseMiB('--'), null);
});

test('probe sums every container and reads the Mac and the Docker VM', () => {
  const answers = {
    memory_pressure: 'System-wide memory free percentage: 31%',
    'docker info': String(5.783 * 1024 ** 3),
    'docker stats': 'litellm\t499.3MiB / 5.783GiB\nrepohq-sbx-ab12-worker\t1.2GiB / 4GiB\n',
  };
  const p = BS.probe((cmd, args) => answers[cmd === 'docker' ? `docker ${args[0]}` : cmd]);
  assert.equal(p.hostFreePct, 31);
  assert.equal(p.dockerTotalMb, 5922);
  assert.deepEqual(p.containers, [{ name: 'litellm', mb: 499 }, { name: 'repohq-sbx-ab12-worker', mb: 1229 }]);
  assert.deepEqual(BS.probe(() => { throw new Error('no docker'); }), { hostFreePct: null, dockerTotalMb: null, containers: null });
});

test("today's Mac: Docker's 5.8 GB fits two builds; a third waits for room", () => {
  const idle = docker(5922, [{ name: 'litellm', mb: 500 }, { name: 'nominatim', mb: 45 }]);
  assert.deepEqual(BS.capacity({ running: 0, cfg, probe: idle }), { requests: 2, automatic: 2, reason: 'Docker has 5.3 GB to spare, and a build needs 2.0 GB (0 running)', autoReason: null });
  // Two sandboxes up, one using less than the reserve so far: it still counts as 2 GB (its memory grows).
  const two = docker(5922, [{ name: 'litellm', mb: 500 }, { name: 'repohq-sbx-a-worker', mb: 900 }, { name: 'repohq-sbx-b-worker', mb: 2400 }]);
  const c = BS.capacity({ running: 2, cfg, probe: two });
  assert.equal(c.requests, 0);
  assert.match(c.reason, /^Docker has 1\.0 GB to spare, and a build needs 2\.0 GB \(2 running\)$/);
  // A build started this tick has no sandbox yet: it counts at the reserve too. One running plus one just
  // started leaves 1.4 GB, so no third.
  const one = docker(5922, [{ name: 'litellm', mb: 500 }, { name: 'repohq-sbx-a-worker', mb: 1000 }]);
  assert.equal(BS.capacity({ running: 1, cfg, probe: one }).requests, 1);
  assert.equal(BS.capacity({ running: 2, pending: 1, cfg, probe: one }).requests, 0);
});

test('with room for all three: the limit, and the last slot kept for requests', () => {
  const roomy = docker(16000, []);
  assert.deepEqual(BS.capacity({ running: 0, cfg, probe: roomy }), { requests: 3, automatic: 2, reason: null, autoReason: null });
  const two = BS.capacity({ running: 2, cfg, probe: roomy });
  assert.deepEqual([two.requests, two.automatic], [1, 0]);
  assert.equal(two.autoReason, 'the last slot is kept for builds David asks for');
  const full = BS.capacity({ running: 3, cfg, probe: roomy });
  assert.deepEqual([full.requests, full.automatic, full.reason], [0, 0, '3 builds are running (the limit is 3)']);
});

test('the Mac low on memory stops new builds; an unreadable Docker allows one at a time', () => {
  const low = BS.capacity({ running: 0, cfg, probe: { hostFreePct: 7, dockerTotalMb: 16000, containers: [] } });
  assert.deepEqual([low.requests, low.reason], [0, 'the Mac has 7% of its memory free, and a build needs 10%']);
  const blind = { hostFreePct: null, dockerTotalMb: null, containers: null };
  assert.equal(BS.capacity({ running: 0, cfg, probe: blind }).requests, 3, 'Docker down: the build itself reports it, as before');
  assert.equal(BS.capacity({ running: 1, cfg, probe: blind }).requests, 0);
});

test("a build the pipeline starts itself waits retryAfterHours after a failure or a closed PR", () => {
  const now = new Date('2026-10-13T12:00:00Z');
  const at = (h) => new Date(now - h * 3_600_000).toISOString();
  assert.equal(BS.retryDue({}, cfg, now), true);
  assert.equal(BS.retryDue({ build: { status: 'merged', at: at(1) } }, cfg, now), true);
  assert.equal(BS.retryDue({ build: { status: 'failed', at: at(1) } }, cfg, now), false);
  assert.equal(BS.retryDue({ build: { status: 'closed', at: at(23) } }, cfg, now), false);
  assert.equal(BS.retryDue({ build: { status: 'failed', at: at(24) } }, cfg, now), true);
});

test('slots: live ones are build jobs; a dead or reused pid is stale; results come back oldest first', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slots-'));
  BS.writeSlot(dir, { slug: 'a', milestone: 'MVP', pid: 101, startedAt: 'x' });
  BS.writeSlot(dir, { slug: 'b', milestone: 'GOLIVE', pid: 102, startedAt: 'x' });
  const ps = { 101: 'node /Users/d/idea-factory/bin/idea-build-job.js /x/job-a.json', 102: '/usr/bin/vim notes.txt' };
  const { live, stale } = BS.readSlots(dir, { running: (pid) => BS.isJob(pid, (cmd, args) => ps[args[1]] || '') });
  assert.deepEqual(live.map((s) => s.slug), ['a']);
  assert.deepEqual(stale.map((s) => s.slug), ['b'], 'pid 102 was reused by something else');
  BS.removeSlot(dir, 'b');
  assert.deepEqual(BS.readSlots(dir, { running: () => true }).live.map((s) => s.slug), ['a']);
  BS.writeResult(dir, { slug: 'a', ok: true, at: '2026-10-13T10:00:02Z' });
  BS.writeResult(dir, { slug: 'b', ok: false, at: '2026-10-13T10:00:01Z' });
  assert.deepEqual(BS.takeResults(dir).map((r) => r.slug), ['b', 'a']);
  assert.deepEqual(BS.takeResults(dir), [], 'each result is read once');
  fs.rmSync(dir, { recursive: true, force: true });
});
