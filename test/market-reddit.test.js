// Reddit answering this Mac with an HTML page instead of JSON (lib/market.js redditAnswer, lib/market-io.js Reddit):
// help answers and replies #56, #77, #82 and #83 failed on `Unexpected token '<'` (2026-11-16 to 11-19).
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../lib/market');
const io = require('../lib/market-io');

const BLOCK_PAGE = '<!DOCTYPE html><html><head><title>Blocked</title></head><body>You\'ve been blocked by network security. To continue, log in…</body></html>';

test('redditAnswer: JSON passes; a web page is "Reddit blocked this request"', () => {
  assert.deepEqual(M.redditAnswer(200, '{"data":{"name":"Outside_Sir_9341"}}'), { ok: true, value: { data: { name: 'Outside_Sir_9341' } } });
  assert.deepEqual(M.redditAnswer(404, '{"message":"Not Found","error":404}'), { ok: true, value: { status: 404 } }); // as before: "nothing there"
  const blocked = M.redditAnswer(403, BLOCK_PAGE);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.message, 'Reddit blocked this request (HTTP 403, "blocked by network security"); waiting for the next run');
  assert.match(M.redditAnswer(200, '<!DOCTYPE html><p>hi</p>').message, /^Reddit blocked this request \(HTTP 200, a web page instead of JSON\)/);
  assert.match(M.redditAnswer(429, '').message, /HTTP 429/);
});

test('redditAnswer for a POST: Reddit\'s JSON errors come through; a 2xx page may have posted, so it is not retried', () => {
  assert.deepEqual(M.redditAnswer(500, '{"json":{"errors":[["RATELIMIT","later"]]}}', { post: true }).value, { json: { errors: [['RATELIMIT', 'later']] } });
  const blocked = M.redditAnswer(403, BLOCK_PAGE, { post: true });
  assert.equal(blocked.blocked, true);
  const unclear = M.redditAnswer(200, '<!DOCTYPE html><p>?</p>', { post: true });
  assert.equal(unclear.ok, false);
  assert.equal(unclear.blocked, false);
  assert.match(unclear.message, /unclear whether this went through/);
  assert.equal(M.redditBlocked(unclear.message), false);
});

test('a Reddit block waits for the next run for up to a day after approval, then fails with the reason', () => {
  const item = { approvedAt: '2026-11-19T16:09:00Z' };
  const err = new Error(M.redditAnswer(403, BLOCK_PAGE, { post: true }).message);
  assert.equal(M.redditBlocked(err), true);
  assert.equal(M.redditBlocked(new Error('Reddit has blocked this Mac for now ("blocked by network security"); try again in a few hours')), true);
  assert.equal(M.redditBlocked(new Error("SyntaxError: Unexpected token '<'")), false);
  assert.equal(M.postRetryLater(err, { item, now: new Date('2026-11-19T16:10:13Z') }), 'reddit');
  assert.equal(M.postRetryLater(err, { item, now: new Date('2026-11-20T15:00:00Z') }), 'reddit');
  assert.equal(M.postRetryLater(err, { item, now: new Date('2026-11-20T17:00:00Z') }), false);
  assert.equal(M.postRetryLater(err, { item: {} }), false); // no approval time: never wait forever
  assert.equal(M.postRetryLater(new Error('Reddit refused the comment: [["DELETED_LINK"]]'), { item, now: new Date('2026-11-19T16:11:00Z') }), false);
});

test('Reddit.json, post and the HTML listings throw "Reddit blocked this request" on a block page instead of a SyntaxError', async () => {
  const r = new io.Reddit({ account: 'Outside_Sir_9341' });
  r.run = async () => ({ s: 403, t: BLOCK_PAGE });
  await assert.rejects(() => r.json('/r/mcp/about/rules.json'), /^Error: Reddit blocked this request \(HTTP 403, "blocked by network security"\)/);
  await assert.rejects(() => r.comment({ parent: 't3_x', text: 'hi' }), /Reddit blocked this request/);
  r.run = async () => ({ s: 200, t: '{"rules":[{"short_name":"Be kind","description":"x"}]}' });
  assert.deepEqual(await r.rules('mcp'), ['1. Be kind: x']);
  r.run = async () => ({ s: 403, blocked: true, things: [] });
  await assert.rejects(() => r.newPosts('mcp'), /Reddit blocked this request/);
  r.run = async () => ({ s: 200, blocked: false, things: [{ name: 't3_a', stickied: true, locked: false, archived: false, title: 'Weekly Thread: Project Display', permalink: '/r/AI_Agents/comments/a/', ts: Date.now() }] });
  assert.deepEqual(await r.findThread('AI_Agents', 'weekly thread: project display'), { name: 't3_a', title: 'Weekly Thread: Project Display', permalink: 'https://www.reddit.com/r/AI_Agents/comments/a/' });
});
