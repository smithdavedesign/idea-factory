// Hand-edited episode cuts (botchelor scripts/clips/episode-cut.mjs, the December plan of 2026-11-16): staged in
// ${CLIPS}/cuts, released one a day as the day's video kit, sent to David for TikTok and followed on Shorts and Reels.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cuts-'));
process.env.SYSTEM_EVENTS_DIR = path.join(tmp, 'events'); // never the real system log
process.env.CLIPS_DIR = path.join(tmp, 'clips');

const A = '4bec5555-8e60-459d-ab21-e790c5af53fe';
const B = 'ed42110f-d7ad-4341-8ce4-c9c20e64dd9f';

function stage(name, episode, { complete = true } = {}) {
  const dir = path.join(process.env.CLIPS_DIR, 'cuts', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'post.mp4'), 'mp4');
  fs.writeFileSync(path.join(dir, 'caption.txt'), `Hook for ${name}\n\nWatch the whole date: botchelor.com/episodes/${episode}?s=tiktok\n`);
  if (complete) fs.writeFileSync(path.join(dir, 'checklist.md'), `# Posting\n\nEpisode: https://botchelor.com/episodes/${episode}\n`);
}

function fresh() {
  for (const m of ['../lib/market-io', '../bin/idea-market']) delete require.cache[require.resolve(m)];
  const io = require('../lib/market-io');
  const told = [];
  io.tell = (msg, opts) => (told.push({ msg, opts }), { sent: ['test'], failed: [] }); // never David's phone
  return { io, bin: require('../bin/idea-market'), M: require('../lib/market'), told };
}

test('staged cuts wait in name order; a folder missing a file is not ready', () => {
  fs.rmSync(process.env.CLIPS_DIR, { recursive: true, force: true });
  stage('2-she-knew', A);
  stage('1-referee', B);
  stage('0-unfinished', B, { complete: false });
  const { io } = fresh();
  assert.deepEqual(io.stagedCuts().map((d) => path.basename(d)), ['1-referee', '2-she-knew']);
});

test("a release moves the next cut into posts as the day's kit, after the daily kit, and marks it a cut", () => {
  fs.rmSync(process.env.CLIPS_DIR, { recursive: true, force: true });
  stage('1-referee', B);
  stage('2-she-knew', A);
  fs.mkdirSync(path.join(process.env.CLIPS_DIR, 'posts', '2026-11-16-sable-quist-juniper-vale'), { recursive: true });
  const { io } = fresh();
  const kit = io.releaseCut('2026-11-16');
  assert.equal(kit.cut, '1-referee');
  assert.equal(kit.episode, B);
  assert.equal(path.basename(kit.dir), '2026-11-16-zz-cut-1-referee');
  assert.match(kit.caption, /^Hook for 1-referee/);
  assert.ok(!fs.existsSync(path.join(process.env.CLIPS_DIR, 'cuts', '1-referee')), 'moved, not copied');
  assert.deepEqual(io.stagedCuts().map((d) => path.basename(d)), ['2-she-knew']);
  // The newest kit is the cut (sorts after the daily kit), and it says it's a cut.
  assert.deepEqual({ ...io.latestKit(), dir: path.basename(io.latestKit().dir) }, { ...kit, dir: path.basename(kit.dir), video: kit.video });
  // The daily clip never cuts its date again.
  assert.ok(io.madeKitEpisodes().has(B));
  assert.equal(io.releaseCut('2026-11-17').cut, '2-she-knew');
  assert.equal(io.releaseCut('2026-11-18'), null);
});

test('cutKit sends the cut to David for TikTok and to each follower once per cut, even for a date already posted', () => {
  fs.rmSync(process.env.CLIPS_DIR, { recursive: true, force: true });
  stage('1-she-knew', A);
  const { bin, M, told } = fresh();
  const dir = path.join(tmp, 'idea');
  fs.mkdirSync(dir, { recursive: true });
  const cfg = {
    slug: 'botchelor',
    timezone: 'America/Los_Angeles',
    autoPost: true,
    channels: [
      { id: 'video', kind: 'video', status: 'active' },
      { id: 'youtube_shorts', kind: 'youtube', status: 'active', follows: 'video', source: 'youtube' },
      { id: 'instagram_reels', kind: 'instagram', status: 'active', follows: 'video', source: 'instagram' },
    ],
  };
  const queue = M.emptyQueue();
  // The same date already went out as a daily kit on Shorts: the cut is a different video and still goes.
  M.addItem(queue, { channel: 'youtube_shorts', kind: 'youtube', title: 't', body: 'b', episode: A, status: 'posted' });
  const ctx = { dir, cfg, queue, launchLog: { posts: [] } };
  const now = new Date('2026-11-17T02:30:00Z'); // 18:30 in Los Angeles on the 16th
  const item = bin.cutKit(ctx, cfg.channels[0], now);
  assert.equal(item.kind, 'video');
  assert.equal(item.cut, '1-she-knew');
  assert.equal(item.status, 'sent');
  assert.equal(told.length, 1);
  assert.match(told[0].msg, /Upload it as @botchelorcom/);
  assert.deepEqual(told[0].opts.media, [item.media]);
  const followers = queue.items.filter((i) => i.cut === '1-she-knew' && i.channel !== 'video');
  assert.deepEqual(followers.map((i) => [i.channel, i.status]).sort(), [['instagram_reels', 'approved'], ['youtube_shorts', 'approved']]);
  const yt = followers.find((i) => i.channel === 'youtube_shorts');
  assert.match(yt.title, /^Hook for 1-she-knew #Shorts$/);
  assert.match(yt.body, /\?s=youtube/);
  // Again with the same kit (a `draft youtube_shorts` retry from latestKit): nothing new.
  const { io } = fresh();
  assert.equal(require('../bin/idea-market').followKit(ctx, io.latestKit(), 'video', 'youtube_shorts').length, 0);
  // Nothing left: the daily kit has the slot.
  assert.equal(bin.cutKit(ctx, cfg.channels[0], now), null);
});
