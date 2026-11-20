// How the loop's posts do (lib/market-stats.js), the Friday report's lines, and the public feed's numbers.
const test = require('node:test');
const assert = require('node:assert/strict');
const MS = require('../lib/market-stats');
const M = require('../lib/market');
const S = require('../lib/market-sync');
const io = require('../lib/market-io');

const now = new Date('2026-11-20T17:00:00Z');
const items = () => [
  { id: 15, status: 'posted', kind: 'youtube', channel: 'youtube_shorts', thing: 'YaGFdaM4VyY', postedAt: '2026-11-11T21:51:46Z', postUrl: 'https://www.youtube.com/shorts/YaGFdaM4VyY' },
  { id: 79, status: 'posted', kind: 'youtube', channel: 'youtube_shorts', thing: 'K8mqI22-SNw', postedAt: '2026-11-19T02:02:48Z', postUrl: 'https://www.youtube.com/shorts/K8mqI22-SNw' },
  { id: 80, status: 'posted', kind: 'instagram', channel: 'instagram_reels', thing: '17899540023418840', postedAt: '2026-11-19T02:05:00Z' },
  { id: 84, status: 'posted', kind: 'bluesky', channel: 'bluesky', thing: 'at://did:plc:x/app.bsky.feed.post/3n2o', postedAt: '2026-11-19T16:00:00Z' },
  { id: 85, status: 'posted', kind: 'x', channel: 'x', thing: '2123487376618230157', postedAt: '2026-11-19T17:00:00Z' },
  { id: 86, status: 'failed', kind: 'youtube', channel: 'youtube_shorts', thing: null },
  { id: 2, status: 'posted', kind: 'youtube', channel: 'youtube_shorts', thing: 'old', postedAt: '2026-09-01T00:00:00Z' },
];

test('statsTargets: posted items of a measured kind with an id there, in their first 30 days, by kind', () => {
  const t = MS.statsTargets(items(), ['youtube', 'instagram', 'bluesky'], { now });
  assert.deepEqual(Object.keys(t).sort(), ['bluesky', 'instagram', 'youtube']);
  assert.deepEqual(t.youtube.map((i) => i.id), [15, 79]); // not the failed one, not the 80-day-old one
  assert.equal(t.x, undefined); // no fetcher for X
});

test('recordStats keeps the latest numbers on the item and a row per day in the history', () => {
  const its = items();
  const history = {};
  const n1 = MS.recordStats(its, history, '2026-11-19', { 15: { views: 2, likes: 0, comments: 0 }, 79: { views: 3, likes: 0, comments: 0, junk: 'x', bad: NaN } }, new Date('2026-11-19T15:00:00Z'));
  assert.equal(n1, 2);
  const n2 = MS.recordStats(its, history, '2026-11-20', { 15: { views: 5, likes: 1, comments: 0 }, 79: { views: 40, likes: 2, comments: 1 } }, now);
  assert.equal(n2, 2);
  assert.deepEqual(its[1].stats, { views: 40, likes: 2, comments: 1, at: now.toISOString() });
  assert.deepEqual(history.posts['79'].days, { '2026-11-19': { views: 3, likes: 0, comments: 0 }, '2026-11-20': { views: 40, likes: 2, comments: 1 } });
  assert.equal(history.posts['79'].channel, 'youtube_shorts');
  assert.deepEqual(MS.statsOn(history, 15, '2026-11-19'), { views: 2, likes: 0, comments: 0 });
  assert.equal(MS.statsOn(history, 15, '2026-11-18'), null);
  assert.equal(MS.recordStats(its, history, '2026-11-20', { 80: { nothing: 1 } }, now), 0); // no known numbers: nothing recorded
});

test('weekRows: this week\'s posts and older ones still measured, with the views they gained since the week began', () => {
  const its = items();
  const history = {};
  MS.recordStats(its, history, '2026-11-13', { 15: { views: 1 } }, new Date('2026-11-13T15:00:00Z'));
  MS.recordStats(its, history, '2026-11-20', { 15: { views: 9, likes: 0 }, 79: { views: 33, likes: 1, comments: 0 }, 84: { likes: 2, reposts: 0, comments: 1 } }, now);
  const rows = MS.weekRows(its, history, { from: '2026-11-14', to: '2026-11-20' });
  assert.deepEqual(rows.map((r) => r.id), [79, 15, 84]); // most viewed first; Bluesky has no views
  assert.equal(rows[0].gained, 33); // new this week: all its views are this week's
  assert.equal(rows[1].new, false);
  assert.equal(rows[1].gained, 8); // 9 now, 1 on 11-13 (the last reading before the week)
  assert.equal(rows[2].gained, null);
});

test('statsReportLines: totals per channel, then each post, then what can\'t be measured', () => {
  const rows = [
    { id: 79, kind: 'youtube', day: '2026-11-19', url: 'https://www.youtube.com/shorts/K8mqI22-SNw', new: true, views: 33, likes: 1, comments: 0, gained: 33 },
    { id: 15, kind: 'youtube', day: '2026-11-11', url: null, new: false, views: 9, likes: 0, gained: 8 },
    { id: 80, kind: 'instagram', day: '2026-11-19', url: null, new: true, likes: 0, comments: 0, gained: null },
    { id: 84, kind: 'bluesky', day: '2026-11-19', url: null, new: true, likes: 2, reposts: 1, comments: 1, gained: null },
  ];
  const lines = MS.statsReportLines(rows, { notes: [{ key: 'stats:instagram:insights', message: 'Instagram views wait on the insights permission' }] });
  assert.equal(lines[0], '');
  assert.equal(lines[1], 'Views per post this week:');
  assert.equal(lines[2], 'Totals: YouTube Shorts 42 views (+41 this week) over 2 posts · Instagram Reels 0 likes over 1 post · Bluesky 2 likes over 1 post');
  assert.equal(lines[3], '· YouTube Shorts #79 (11-19): 33 views · 1 like · 0 comments https://www.youtube.com/shorts/K8mqI22-SNw');
  assert.equal(lines[4], '· YouTube Shorts #15 (11-11, older): 9 views · 0 likes (+8)');
  assert.equal(lines[6], '· Bluesky #84 (11-19): 2 likes · 1 repost · 1 comment');
  assert.equal(lines[7], '(Instagram views wait on the insights permission)');
  assert.deepEqual(MS.statsReportLines([], {}), []);
  assert.match(MS.statsReportLines(rows, { max: 1 }).join('\n'), /…and 3 more/);
});

test('the Friday report carries the views section after what was posted', () => {
  const msg = M.reportMessage({ engagement: null, posted: [{ channel: 'YouTube Shorts', postUrl: 'https://www.youtube.com/shorts/a' }], from: '2026-11-14', to: '2026-11-20', statsLines: ['', 'Views per post this week:', '· YouTube Shorts #79 (11-19): 33 views'] });
  assert.match(msg, /Posted this week \(1\):\n· YouTube Shorts https:\/\/www\.youtube\.com\/shorts\/a\n\nViews per post this week:\n· YouTube Shorts #79/);
  assert.doesNotMatch(M.reportMessage({ engagement: null, posted: [], from: 'a', to: 'b' }), /Views per post/);
});

test('notesToTell: each problem is told once, and told again only after it cleared and came back', () => {
  const told = {};
  const note = { key: 'stats:instagram:insights', message: 'add instagram_manage_insights' };
  const ig = { covers: (k) => k.startsWith('stats:instagram:') };
  assert.deepEqual(MS.notesToTell(told, [note], '2026-11-19', ig), [note]);
  assert.deepEqual(MS.notesToTell(told, [note], '2026-11-20', ig), []);
  assert.equal(told['stats:instagram:insights'], '2026-11-19');
  // A run that didn't measure Instagram says nothing about it.
  assert.deepEqual(MS.notesToTell(told, [], '2026-11-21', { covers: (k) => k.startsWith('stats:bluesky:') }), []);
  assert.ok(told['stats:instagram:insights']);
  // Fixed: forgotten; broken again: told again.
  MS.notesToTell(told, [], '2026-11-22', ig);
  assert.equal(told['stats:instagram:insights'], undefined);
  assert.deepEqual(MS.notesToTell(told, [note], '2026-11-23', ig), [note]);
});

test('feedStats and buildFeed: likes as the score where Reddit has none, and views as an optional field', () => {
  assert.deepEqual(MS.feedStats({ stats: { views: 33, likes: 1, comments: 0 } }), { score: 1, comments: 0, views: 33 });
  assert.deepEqual(MS.feedStats({ score: 5, comments: 2, stats: { likes: 1, comments: 0 } }), {});
  assert.deepEqual(MS.feedStats({}), {});
  const cfg = { site: 'https://botchelor.com/', channels: [{ id: 'youtube_shorts', kind: 'youtube', follows: 'video', status: 'active', logName: 'YouTube Shorts' }] };
  const queue = { items: [
    { id: 79, status: 'posted', kind: 'youtube', channel: 'youtube_shorts', title: 'A Short', body: 'x', postedAt: '2026-11-19T02:02:48Z', postUrl: 'https://www.youtube.com/shorts/K8mqI22-SNw', stats: { views: 33, likes: 1, comments: 0, at: '2026-11-20T15:00:00Z' } },
    { id: 81, status: 'posted', kind: 'threads', channel: 'threads', body: 'y', postedAt: '2026-11-19T03:00:00Z' },
  ] };
  const feed = S.buildFeed(cfg, queue, { posts: [] });
  const short = feed.posts.find((p) => p.id === 'q-79');
  assert.equal(short.views, 33);
  assert.equal(short.score, 1);
  assert.equal(short.comments, 0);
  const thread = feed.posts.find((p) => p.id === 'q-81');
  assert.equal('views' in thread, false);
  assert.equal(thread.score, null);
});

test('blueskyStats reads likes, reposts and replies from the public AppView', async () => {
  const realFetch = global.fetch;
  let asked = '';
  global.fetch = async (url) => {
    asked = String(url);
    return { ok: true, status: 200, json: async () => ({ posts: [{ uri: 'at://did:plc:x/app.bsky.feed.post/3n2o', likeCount: 2, repostCount: 1, quoteCount: 1, replyCount: 0 }] }) };
  };
  try {
    const r = await io.blueskyStats([{ id: 84, thing: 'at://did:plc:x/app.bsky.feed.post/3n2o' }, { id: 75, thing: 'at://did:plc:x/app.bsky.feed.post/gone' }]);
    assert.match(asked, /^https:\/\/public\.api\.bsky\.app\/xrpc\/app\.bsky\.feed\.getPosts\?uris=at%3A%2F%2F/);
    assert.deepEqual(r.stats, { 84: { likes: 2, reposts: 2, comments: 0 } });
    assert.deepEqual(r.notes, []);
  } finally { global.fetch = realFetch; }
});

test('Instagram\'s "(#10) no permission" is the insights permission, and the fix names the right one per token', () => {
  assert.equal(io.insightsBlocked({ message: '(#10) Application does not have permission for this action', code: 10 }), true);
  assert.equal(io.insightsBlocked({ message: 'Unsupported get request', code: 100 }), false);
  assert.equal(io.insightsBlocked(null), false);
  assert.match(io.insightsFix(true), /instagram_manage_insights.*Botchelor marketing.*2226376481650794/);
  assert.match(io.insightsFix(false), /instagram_business_manage_insights/);
});

test('YouTube\'s 403 on a thumbnail means verify the channel; quota trouble doesn\'t', () => {
  assert.equal(io.thumbnailNeedsVerify(403, { error: { message: "The authenticated user doesn't have permissions to upload and set custom video thumbnails.", errors: [{ reason: 'forbidden' }] } }), true);
  assert.equal(io.thumbnailNeedsVerify(403, { error: { errors: [{ reason: 'quotaExceeded' }] } }), false);
  assert.equal(io.thumbnailNeedsVerify(400, { error: { errors: [{ reason: 'invalidImage' }] } }), false);
  assert.ok(io.STATS_FETCHERS.youtube && io.STATS_FETCHERS.instagram && io.STATS_FETCHERS.bluesky);
});
