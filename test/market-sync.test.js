'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const S = require('../lib/market-sync');

const cfg = {
  site: 'https://botchelor.com/',
  bluesky: { handle: 'botchelor.bsky.social' },
  channels: [
    { id: 'mcp', kind: 'reddit', sub: 'mcp', status: 'active', cooldownDays: 14, note: 'internal: account Outside_Sir', publicNote: 'Showcase flair.' },
    { id: 'help-mcp', kind: 'reddit-help', sub: 'mcp', status: 'active' },
    { id: 'bluesky', kind: 'bluesky', status: 'active', cooldownDays: 1 },
    { id: 'uneed', kind: 'card', status: 'off', logName: 'Uneed' },
    { id: 'video', kind: 'video', status: 'active', logName: 'TikTok/Reels/Shorts (@botchelorcom)' },
    { id: 'pl', kind: 'card', status: 'needs-account', logName: 'Peerlist', publicNote: 'see peerlist.io/1426davejobs' },
  ],
  skipped: [{ id: 'webgames', name: 'r/WebGames', why: 'Watch-only.' }],
  spend: [{ what: 'Uneed fast-track', usd: 19.99, status: 'planned' }],
  upcoming: [{ id: 'ph', at: '2026-12-01T08:01:00Z', channel: 'producthunt', name: 'Product Hunt', title: 'Launch day' }],
};
const queue = {
  items: [
    { id: 1, status: 'posted', kind: 'reddit', channel: 'mcp', sub: 'mcp', title: 'I built a thing', body: 'x', postedAt: '2026-11-10T00:00:00Z', postUrl: 'https://www.reddit.com/r/mcp/comments/a/i_built_a_thing/', score: 5, comments: 2 },
    { id: 2, status: 'posted', kind: 'reddit-help', channel: 'help-mcp', sub: 'mcp', helpOn: 'x', body: 'An answer.\nmore', postedAt: '2026-11-11T00:00:00Z', postUrl: 'https://www.reddit.com/r/mcp/comments/b/q/c1/', removedSeen: 'moderator' },
    { id: 3, status: 'posted', kind: 'bluesky', channel: 'bluesky', body: 'A skeet', postedAt: '2026-11-12T00:00:00Z', postUrl: 'https://bsky.app/profile/x/post/1' },
    { id: 4, status: 'failed', kind: 'bluesky', channel: 'bluesky', body: 'never went out' },
    { id: 5, status: 'done', kind: 'video', channel: 'video', body: 'Clip caption', sentAt: '2026-11-13T00:00:00Z' },
  ],
};
const launchLog = {
  posts: [
    { channel: 'r/mcp', postUrl: 'https://www.reddit.com/r/mcp/comments/a/i_built_a_thing/', postedAt: '2026-11-10T00:00:00Z' },
    { channel: 'r/Chatbots', postUrl: 'https://www.reddit.com/r/Chatbots/comments/z/im_the_developer/', postedAt: '2026-10-24T00:00:00Z', note: "removed by Reddit's spam filter; 1 points, 0 comments" },
    { channel: 'TikTok/Reels/Shorts (@botchelorcom)', postedAt: '2026-11-13T05:00:00Z', note: 'logged by hand too' },
    { channel: 'Uneed', url: 'https://www.uneed.best/tool/botchelor', postedAt: '2026-11-15T00:00:00Z', note: 'Free line.' },
    { channel: 'Peerlist', url: 'https://peerlist.io/1426davejobs', postedAt: '2026-11-15T00:00:00Z', note: 'Saved.' },
    { channel: 'HN (email, not a post)', postedAt: '2026-10-29T00:00:00Z' },
  ],
};

test('buildFeed: channels with public notes only, skipped ones, spend and what is coming', () => {
  const f = S.buildFeed(cfg, queue, launchLog);
  const ch = Object.fromEntries(f.channels.map((c) => [c.id, c]));
  assert.equal(ch['help-mcp'], undefined);
  assert.equal(ch.mcp.note, 'Showcase flair.');
  assert.equal(ch.mcp.url, 'https://www.reddit.com/r/mcp/');
  assert.equal(ch.mcp.cadence, 'every 2 weeks');
  assert.equal(ch.bluesky.url, 'https://bsky.app/profile/botchelor.bsky.social');
  assert.equal(ch.pl.status, 'waiting');
  assert.equal(ch.pl.note, null, 'a note naming the private mailbox name is left out');
  assert.equal(ch.webgames.status, 'skipped');
  assert.deepEqual(f.spend, [{ what: 'Uneed fast-track', usd: 19.99, status: 'planned', note: null }]);
  assert.ok(f.posts.some((p) => p.id === 'up-ph' && p.status === 'scheduled'));
});

test('buildFeed: every post the loop made or David logged, once, with how to recognise its visits', () => {
  const f = S.buildFeed(cfg, queue, launchLog);
  const ids = f.posts.map((p) => p.id);
  assert.ok(!ids.includes('q-4'), 'failed posts are left out');
  assert.equal(f.posts.filter((p) => p.url === 'https://www.reddit.com/r/mcp/comments/a/i_built_a_thing/').length, 1);
  const q1 = f.posts.find((p) => p.id === 'q-1');
  assert.deepEqual([q1.source, q1.content, q1.score, q1.comments, q1.type], ['reddit', 'mcp', 5, 2, 'post']);
  const q2 = f.posts.find((p) => p.id === 'q-2');
  assert.deepEqual([q2.type, q2.status, q2.source, q2.channel_name, q2.title], ['answer', 'removed', null, 'r/mcp', 'An answer.']);
  const chatbots = f.posts.find((p) => p.channel_name === 'r/Chatbots');
  assert.deepEqual([chatbots.status, chatbots.score, chatbots.comments, chatbots.title], ['removed', 1, 0, 'im the developer']);
  assert.equal(f.posts.filter((p) => p.channel === 'video').length, 1, 'the hand log of the same day is the same post');
  assert.equal(f.posts.find((p) => p.channel === 'uneed').source, 'uneed');
  const peer = f.posts.find((p) => p.channel === 'pl');
  assert.equal(peer.url, null);
  assert.ok(!f.posts.some((p) => /not a post/.test(p.channel_name)));
  assert.ok(!S.PRIVATE.test(JSON.stringify(f)));
  assert.equal(f.posts.find((p) => p.channel === 'uneed').note, null, 'working notes stay private');
  assert.equal(chatbots.note, 'Removed there.');
});

test('the live calendar builds a feed with nothing private in it', () => {
  const dir = path.join(__dirname, '..', 'ideas', 'botchelor');
  const read = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return d; } };
  const f = S.buildFeed(read('marketing.json', { channels: [] }), read('marketing-queue.json', { items: [] }), read('launch-log.json', { posts: [] }));
  assert.ok(!S.PRIVATE.test(JSON.stringify(f)));
  for (const c of f.channels) assert.ok(c.id && c.name, JSON.stringify(c));
});
