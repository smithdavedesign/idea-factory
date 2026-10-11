// Ideas David sends are researched now, not at 09:00 (lib/seeds.js). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const S = require('../lib/seeds');
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'policy.json'), 'utf8')).research.seeded;
const at = (hhmm, day = '2026-10-11') => new Date(`${day}T${hhmm}:00`); // local time

test('seeded research runs on the next tick, outside the 09:00 window, within the daily cap', () => {
  assert.deepEqual(S.seededDue({ queued: 0, now: at('12:00'), rules }), { due: false, reason: 'no seeds queued' });
  assert.equal(S.seededDue({ queued: 1, now: at('12:00'), rules }).due, true);
  assert.equal(S.seededDue({ queued: 1, now: at('08:29'), rules }).due, true);
  assert.equal(S.seededDue({ queued: 1, now: at('08:30'), rules }).due, false);
  assert.equal(S.seededDue({ queued: 1, now: at('09:44'), rules }).due, false);
  assert.equal(S.seededDue({ queued: 1, now: at('09:45'), rules }).due, true);
  const full = { date: at('12:00').toLocaleDateString('en-CA'), runs: rules.maxPerDay };
  assert.match(S.seededDue({ queued: 2, seeded: full, now: at('12:00'), rules }).reason, /seeded runs today/);
  assert.equal(S.seededDue({ queued: 2, seeded: full, now: at('12:00', '2026-10-12'), rules }).due, true, 'a new day resets the cap');
});

test('a failed run waits retryMinutes; the counter counts runs per local day', () => {
  const failed = S.countRun({}, at('12:00'), { failed: true });
  assert.equal(failed.runs, 1);
  assert.equal(S.seededDue({ queued: 1, seeded: failed, now: at('12:30'), rules }).due, false);
  assert.equal(S.seededDue({ queued: 1, seeded: failed, now: at('13:01'), rules }).due, true);
  const two = S.countRun(failed, at('13:01'));
  assert.equal(two.runs, 2);
  assert.equal(two.lastFailAt, undefined, 'a later good run clears the failure');
  assert.equal(S.countRun(two, at('10:00', '2026-10-12')).runs, 1);
});

test('the seed command takes --source; anything else is the idea text', () => {
  assert.deepEqual(S.parseSeedArgs(['a', 'polls', 'app', '--source', 'slack']), { text: 'a polls app', source: 'slack' });
  assert.deepEqual(S.parseSeedArgs(['--source=WhatsApp', 'vault', 'idea']), { text: 'vault idea', source: 'whatsapp' });
  assert.deepEqual(S.parseSeedArgs(['x', '--source', 'email']), { text: 'x', source: null });
});

test('the reply carries the verdict, the page for a validate, and the Ideas page', () => {
  const idea = { title: 'pollswipe — swipe-to-decide polls', oneLiner: 'Post two options; strangers swipe.' };
  const v = S.seedMessage({ idea, slug: 'pollswipe', review: { verdict: 'validate', score: 7, summary: 'Real pain.' }, pageUrl: 'https://p/pollswipe/' });
  assert.match(v, /^💡 Researched your idea: \*pollswipe\* \(pollswipe\)\nPost two options/);
  assert.match(v, /Review: \*validate\*, 7\/10\. Real pain\.\nDemand test page: https:\/\/p\/pollswipe\//);
  assert.match(v, /Decide: https:\/\/repohq\.vercel\.app\/ideas$/);
  const p = S.seedMessage({ idea, slug: 'pollswipe', review: { verdict: 'pass', score: 3, summary: 'Crowded.' } });
  assert.match(p, /Review: \*pass\*, 3\/10\. Crowded\.\nYour call wins/);
  assert.match(S.seedMessage({ idea, slug: 'pollswipe', reviewError: 'usage limit' }), /review didn't run \(usage limit\); it's reviewed at 09:30/);
});

test('replies go to WhatsApp for WhatsApp seeds, Slack for everything else, from OpenClaw config', () => {
  const config = { channels: { whatsapp: { enabled: true, allowFrom: ['+15550001111'] }, slack: { enabled: true, channels: { C123: {} }, defaultTo: 'C999' } } };
  assert.deepEqual(S.notifyTarget('whatsapp', config), { channel: 'whatsapp', target: '+15550001111' });
  assert.deepEqual(S.notifyTarget('slack', config), { channel: 'slack', target: 'C123' });
  assert.deepEqual(S.notifyTarget(undefined, config), { channel: 'slack', target: 'C123' });
  assert.deepEqual(S.notifyTarget('page', config), { channel: 'slack', target: 'C123' });
  assert.equal(S.notifyTarget('slack', { channels: {} }), null);
  const calls = [];
  const to = S.notify('whatsapp', 'hi', { config, exec: (cmd, args) => calls.push([cmd, ...args]) });
  assert.equal(to.channel, 'whatsapp');
  assert.deepEqual(calls[0], ['openclaw', 'message', 'send', '--channel', 'whatsapp', '--target', '+15550001111', '--message', 'hi']);
  assert.throws(() => S.notify('slack', 'hi', { config: null, exec: () => {} }), /no Slack or WhatsApp target/);
});
