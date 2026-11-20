// TikTok in the loop (2026-11-19): each day's video kit is posted to TikTok by the loop itself, through TikTok Studio
// in the signed-in marketing browser, like Shorts and Reels; the kit no longer waits for David to upload it by hand.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tiktok-'));
process.env.SYSTEM_EVENTS_DIR = path.join(tmp, 'events'); // never the real system log
process.env.CLIPS_DIR = path.join(tmp, 'clips');

const { tiktokCount, tiktokRowStats, tiktokNewPost } = require('../lib/market-io');
const M = require('../lib/market');
const MM = require('../lib/market-media');

// A row of TikTok Studio's content page as innerText reads it (2026-11-19).
const ROW = "00:54\nRudiger and Ottoline meet for the first time, on a silent disco where everyone is on the wrong channel. Would you have said yes to Ottoline? 👀 Every night the audience votes: botchelor.com/vote?s=tiktok #botchelor #aicharacters\nNov 15, 10:02 AM\nEveryone\n62\n0\n0";

test("TikTok Studio's counts read as numbers", () => {
  assert.equal(tiktokCount('62'), 62);
  assert.equal(tiktokCount('1.2K'), 1200);
  assert.equal(tiktokCount('3M'), 3_000_000);
  assert.equal(tiktokCount('1,204'), 1204);
  assert.ok(Number.isNaN(tiktokCount('Everyone')));
  assert.ok(Number.isNaN(tiktokCount('')));
});

test("a content-page row gives views, likes and comments after its who-can-watch line", () => {
  assert.deepEqual(tiktokRowStats(ROW), { views: 62, likes: 0, comments: 0 });
  assert.deepEqual(tiktokRowStats(ROW.replace('Everyone\n62\n0\n0', 'Only you\n1.5K\n12\n3\nEdit')), { views: 1500, likes: 12, comments: 3 });
  assert.equal(tiktokRowStats('00:54\nno numbers here\nEveryone'), null);
  assert.equal(tiktokRowStats(''), null);
});

test('our new post is the newest row holding the start of our caption, never one listed before we posted', () => {
  const caption = 'Rudiger and Ottoline meet for the first time, on a silent disco\nwhere everyone is on the wrong channel.\n\nWould you have said yes to Ottoline? 👀';
  const ours = { href: 'https://www.tiktok.com/@botchelorcom/video/7708460234154593549', text: ROW };
  const older = { href: 'https://www.tiktok.com/@botchelorcom/video/7706986449412951326', text: '01:01\nA swordswoman and a bodyguard fight over the last dryer.\nNov 11\nEveryone\n20\n0\n0' };
  assert.equal(tiktokNewPost([older, ours], caption), '7708460234154593549', 'line breaks fold to spaces');
  assert.equal(tiktokNewPost([ours, older], caption, ['7708460234154593549']), null, 'already there before we posted');
  assert.equal(tiktokNewPost([older], caption), null);
  assert.equal(tiktokNewPost([ours], ''), null);
  assert.equal(tiktokNewPost(undefined, caption), null);
});

test('the loop posts TikTok itself only while an active TikTok channel follows the video channel', () => {
  const now = new Date('2026-11-20T03:00:00Z');
  const cfg = (tiktok) => ({ timezone: 'America/Los_Angeles', channels: [{ id: 'video', kind: 'video', status: 'active' }, { id: 'tiktok', kind: 'tiktok', follows: 'video', status: 'active', ...tiktok }] });
  assert.equal(M.postsTikTok(cfg({}), 'video', now), true);
  assert.equal(M.postsTikTok(cfg({ status: 'off' }), 'video', now), false);
  assert.equal(M.postsTikTok(cfg({ from: '2026-12-01' }), 'video', now), false);
  assert.equal(M.autoPostable('tiktok'), true);
  assert.deepEqual(MM.imagePlan({ kind: 'tiktok', kitDir: '/k/2026-11-19-a-b' }), { source: 'kit', kitDir: '/k/2026-11-19-a-b' });
  assert.equal(MM.imagePlan({ kind: 'tiktok', body: 'botchelor.com' }), null, 'a video without a kit: TikTok picks a frame');
});

function stage(name, episode) {
  const dir = path.join(process.env.CLIPS_DIR, 'cuts', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'post.mp4'), 'mp4');
  fs.writeFileSync(path.join(dir, 'caption.txt'), `Hook for ${name}\n\nVote: botchelor.com/vote?s=tiktok\n`);
  fs.writeFileSync(path.join(dir, 'checklist.md'), `# Posting\n\nEpisode: https://botchelor.com/episodes/${episode}\n`);
}

function fresh() {
  for (const m of ['../lib/market-io', '../bin/idea-market']) delete require.cache[require.resolve(m)];
  const io = require('../lib/market-io');
  const told = [];
  io.tell = (msg, opts) => (told.push({ msg, opts }), { sent: ['test'], failed: [] }); // never David's phone
  return { io, bin: require('../bin/idea-market'), told };
}

test("with TikTok following, the day's kit isn't sent to David: TikTok, Shorts and Reels are queued to post themselves", async () => {
  fs.rmSync(process.env.CLIPS_DIR, { recursive: true, force: true });
  stage('4-numbers', '4bec5555-8e60-459d-ab21-e790c5af53fe');
  const { io, bin, told } = fresh();
  const dir = path.join(tmp, 'idea');
  fs.mkdirSync(dir, { recursive: true });
  const cfg = {
    slug: 'botchelor',
    timezone: 'America/Los_Angeles',
    autoPost: true,
    tiktok: { handle: 'botchelorcom' },
    channels: [
      { id: 'video', kind: 'video', status: 'active' },
      { id: 'tiktok', kind: 'tiktok', status: 'active', follows: 'video', source: 'tiktok' },
      { id: 'youtube_shorts', kind: 'youtube', status: 'active', follows: 'video', source: 'youtube' },
    ],
  };
  const queue = M.emptyQueue();
  const ctx = { dir, cfg, queue, launchLog: { posts: [] } };
  const now = new Date('2026-11-20T02:30:00Z'); // 18:30 in Los Angeles on the 19th
  const item = bin.cutKit(ctx, cfg.channels[0], now);
  assert.equal(item.status, 'kit', 'not an upload request');
  assert.equal(told.length, 0, 'nothing sent to David');
  const tt = queue.items.find((i) => i.channel === 'tiktok');
  assert.equal(tt.status, 'approved');
  assert.equal(tt.kind, 'tiktok');
  assert.match(tt.body, /\?s=tiktok/);
  assert.equal(tt.kitDir, item.kitDir);
  // The kit still fills the day's video slot.
  assert.ok(!M.dueChannels(cfg, { launchLog: ctx.launchLog, queue, now }).some((c) => c.id === 'video'));

  // Posting: the approved TikTok item goes to the uploader with the video, its caption, the kit's cover and the handle.
  const calls = [];
  io.tiktokPost = async (args) => (calls.push(args), { url: 'https://www.tiktok.com/@botchelorcom/video/1', name: '1', image: { ok: true, how: 'cover' } });
  io.youtubeUpload = async () => ({ url: 'https://youtu.be/x', name: 'x' });
  const realPostImage = MM.postImage;
  MM.postImage = async (it) => ({ source: 'kit', file: path.join(it.kitDir, 'cover.jpg') });
  try {
    await bin.handleReply(ctx, `mk post ${tt.id}`, null, { ensure: async () => {} });
  } finally { MM.postImage = realPostImage; }
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { video: tt.media, caption: tt.body, cover: path.join(tt.kitDir, 'cover.jpg'), handle: 'botchelorcom' });
  assert.equal(tt.status, 'posted');
  assert.equal(tt.postUrl, 'https://www.tiktok.com/@botchelorcom/video/1');
  assert.equal(tt.thing, '1', 'the id the daily stats read by');
  assert.deepEqual({ ok: tt.image.ok, how: tt.image.how, source: tt.image.source }, { ok: true, how: 'cover', source: 'kit' });
  assert.ok(told.some((t) => /Posted for you · #\d+ · tiktok/.test(t.msg)), 'David hears once it is up');
});

test('without a TikTok channel the kit still goes to David to upload, as before', () => {
  fs.rmSync(process.env.CLIPS_DIR, { recursive: true, force: true });
  stage('5-soup', 'ed42110f-d7ad-4341-8ce4-c9c20e64dd9f');
  const { bin, told } = fresh();
  const dir = path.join(tmp, 'idea2');
  fs.mkdirSync(dir, { recursive: true });
  const cfg = { slug: 'botchelor', timezone: 'America/Los_Angeles', autoPost: true, channels: [{ id: 'video', kind: 'video', status: 'active' }] };
  const ctx = { dir, cfg, queue: M.emptyQueue(), launchLog: { posts: [] } };
  const item = bin.cutKit(ctx, cfg.channels[0], new Date('2026-11-20T02:30:00Z'));
  assert.equal(item.status, 'sent');
  assert.match(told[0].msg, /Upload it as @botchelorcom/);
});
