// When the pipeline starts work by itself (lib/schedule.js). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../lib/schedule');

const at = (iso) => new Date(iso); // local time: no Z

test('the night is named by the date it starts on', () => {
  assert.deepEqual(S.windowAt(at('2026-10-19T23:30:00')), { name: 'night', key: 'night:2026-10-19' });
  assert.deepEqual(S.windowAt(at('2026-10-20T02:00:00')), { name: 'night', key: 'night:2026-10-19' });
  assert.equal(S.windowAt(at('2026-10-20T07:00:00')).name, 'quiet');
  assert.deepEqual(S.windowAt(at('2026-10-20T13:00:00')), { name: 'day', key: 'day:2026-10-20' });
  assert.equal(S.windowAt(at('2026-10-20T19:00:00')).name, 'quiet');
});

test('most work starts at night, some in the day, none in quiet hours', () => {
  assert.equal(S.capFor('feature', 'night'), 2);
  assert.equal(S.capFor('feature', 'day'), 1);
  assert.equal(S.capFor('plan', 'day'), 0);
  assert.equal(S.capFor('auto', 'quiet'), 0);
  const quiet = S.mayStart('feature', at('2026-10-20T09:00:00'));
  assert.equal(quiet.ok, false);
  assert.match(quiet.reason, /quiet hours/);
});

test('caps count per window and reset with the next one', () => {
  const n1 = at('2026-10-19T22:10:00');
  let st = S.counted('feature', n1, {});
  st = S.counted('feature', at('2026-10-20T01:00:00'), st);
  assert.deepEqual(st, { key: 'night:2026-10-19', starts: { feature: 2 } });
  assert.equal(S.mayStart('feature', at('2026-10-20T03:00:00'), st).ok, false);
  // Growth builds have their own count in the same window.
  assert.equal(S.mayStart('growth', at('2026-10-20T03:00:00'), st).ok, true);
  // The next day window starts fresh.
  assert.equal(S.mayStart('feature', at('2026-10-20T12:30:00'), st).ok, true);
});

test('policy overrides the defaults', () => {
  const sched = { night: { from: '23:00', to: '06:00' }, starts: { feature: { night: 4, day: 0 } } };
  assert.equal(S.windowAt(at('2026-10-19T22:30:00'), sched).name, 'quiet');
  assert.equal(S.capFor('feature', 'night', sched), 4);
  assert.equal(S.capFor('feature', 'day', sched), 0);
  assert.equal(S.capFor('auto', 'night', sched), 6); // kinds left out keep their default
});

test('off switches the windows off', () => {
  assert.equal(S.mayStart('feature', at('2026-10-20T09:00:00'), {}, { off: true }).ok, true);
});
