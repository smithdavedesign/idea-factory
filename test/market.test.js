// The marketing loop's rules (lib/market.js): what's due, windows, David's replies, draft checks, inbox triage.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const M = require('../lib/market');

const cfg = {
  site: 'https://botchelor.com/', utm: { campaign: 'season1', medium: 'social' }, timezone: 'UTC',
  perDay: { reddit: 1, 'reddit-thread': 2, video: 1 },
  channels: [
    { id: 'indiehackers', kind: 'reddit', sub: 'indiehackers', status: 'active', from: '2026-11-10', cooldownDays: 3650, maxPosts: 1 },
    { id: 'jai', kind: 'reddit', sub: 'JanitorAI_Refuges', status: 'active', from: '2026-11-01', cooldownDays: 7 },
    { id: 'sunday', kind: 'reddit', sub: 'ChatbotRefugees', status: 'active', cooldownDays: 6, window: { fromUtc: 'Sat 10:00', toUtc: 'Mon 11:59', preferUtcHour: 19 } },
    { id: 'agents', kind: 'reddit-thread', sub: 'AI_Agents', status: 'active', cooldownDays: 7 },
    { id: 'nofilter', kind: 'reddit', sub: 'CharacterAI_No_Filter', status: 'waiting' },
    { id: 'video', kind: 'video', status: 'active', cooldownDays: 1, logName: 'TikTok' },
  ],
};
const at = (s) => new Date(s);
const ids = (chs) => chs.map((c) => c.id);

test('weekly windows, including one that wraps past Sunday', () => {
  const w = { fromUtc: 'Sat 10:00', toUtc: 'Mon 11:59' };
  assert.equal(M.inWindow(w, at('2026-11-14T09:59:00Z')), false); // Sat before 10:00
  assert.equal(M.inWindow(w, at('2026-11-14T10:00:00Z')), true);
  assert.equal(M.inWindow(w, at('2026-11-15T23:00:00Z')), true); // Sunday
  assert.equal(M.inWindow(w, at('2026-11-16T11:59:00Z')), true); // Monday 11:59
  assert.equal(M.inWindow(w, at('2026-11-16T12:00:00Z')), false);
  assert.equal(M.inWindow(w, at('2026-11-11T12:00:00Z')), false); // Wednesday
  assert.equal(M.inWindow(null, at('2026-11-11T12:00:00Z')), true);
  assert.equal(M.inWindow({ fromUtc: 'Mon 09:00', toUtc: 'Mon 17:00' }, at('2026-11-16T12:00:00Z')), true);
});

test('a window\'s preferred hour holds a post on its first day only', () => {
  const ch = cfg.channels[2];
  assert.equal(M.mayPostNow(ch, at('2026-11-14T16:00:00Z')), false); // Sat, before 19:00
  assert.equal(M.mayPostNow(ch, at('2026-11-14T19:05:00Z')), true);
  assert.equal(M.mayPostNow(ch, at('2026-11-15T08:00:00Z')), true); // Sunday morning is fine
  assert.equal(M.mayPostNow(ch, at('2026-11-17T20:00:00Z')), false); // Tuesday: closed
  assert.equal(M.mayPostNow(cfg.channels[1], at('2026-11-17T20:00:00Z')), true); // no window
});

test('due channels: from-day, cooldown, lifetime cap, open drafts, waiting status, window, daily cap', () => {
  const launchLog = { posts: [{ channel: 'r/JanitorAI_Refuges', postedAt: '2026-11-09T18:00:06+00:00' }] };
  // Monday 9 Nov, 17:00 UTC: indiehackers not yet (from 10th); JAI just posted; Sunday window closed; thread due.
  assert.deepEqual(ids(M.dueChannels(cfg, { launchLog, queue: M.emptyQueue(), now: at('2026-11-09T17:00:00Z') })), ['agents', 'video']);
  // Tuesday: indiehackers due (one reddit post a day, so JAI's cooldown aside, only it).
  assert.deepEqual(ids(M.dueChannels(cfg, { launchLog, queue: M.emptyQueue(), now: at('2026-11-10T16:00:00Z') })), ['indiehackers', 'agents', 'video']);
  // JAI's 7 days are up on the 16th (3 h slack lets the morning draft go out before the hour it posted).
  const mon16 = M.dueChannels(cfg, { launchLog: { posts: [...launchLog.posts, { channel: 'r/indiehackers', postedAt: '2026-11-10T17:00:00Z' }] }, queue: M.emptyQueue(), now: at('2026-11-16T16:00:00Z') });
  assert.ok(ids(mon16).includes('jai'));
  assert.ok(!ids(mon16).includes('indiehackers'), 'maxPosts 1 reached');
  // Friday: the Sunday window opens within a day, so it can be drafted (and posts only once it opens).
  assert.ok(ids(M.dueChannels(cfg, { launchLog: { posts: [...launchLog.posts, { channel: 'r/indiehackers', postedAt: '2026-11-10T17:00:00Z' }] }, queue: M.emptyQueue(), now: at('2026-11-13T16:00:00Z') })).includes('sunday'));
  // An open draft for a channel holds it back.
  const q = M.emptyQueue();
  M.addItem(q, { channel: 'agents', kind: 'reddit-thread', body: 'x' }, at('2026-11-09T16:00:00Z')).status = 'sent';
  assert.ok(!ids(M.dueChannels(cfg, { launchLog, queue: q, now: at('2026-11-09T17:00:00Z') })).includes('agents'));
  // Today's reddit post slot is used by a draft made today, but not by a skipped one.
  const q2 = M.emptyQueue();
  const it = M.addItem(q2, { channel: 'jai', kind: 'reddit', body: 'x' }, at('2026-11-10T15:00:00Z'));
  it.status = 'posted'; it.postedAt = '2026-11-10T15:30:00Z';
  assert.ok(!ids(M.dueChannels(cfg, { launchLog: { posts: [] }, queue: q2, now: at('2026-11-10T16:00:00Z') })).includes('indiehackers'));
  it.status = 'skipped'; delete it.postedAt;
  assert.ok(ids(M.dueChannels(cfg, { launchLog: { posts: [] }, queue: q2, now: at('2026-11-10T16:00:00Z') })).includes('indiehackers'));
});

test('history matches the launch log by sub (threads included) and by log name', () => {
  const h = M.history(cfg, { posts: [
    { channel: 'r/AI_Agents (weekly thread)', postedAt: '2026-10-30T10:00:00Z' },
    { channel: 'r/ai_agents', postedAt: '2026-11-02T10:00:00Z' },
    { channel: 'TikTok', postedAt: '2026-11-08T10:00:00Z' },
    { channel: 'r/AI_AgentsX', postedAt: '2026-11-05T10:00:00Z' },
  ] }, M.emptyQueue());
  assert.equal(h.agents.count, 2);
  assert.equal(new Date(h.agents.last).toISOString(), '2026-11-02T10:00:00.000Z');
  assert.equal(h.video.count, 1);
});

test('David\'s replies', () => {
  assert.deepEqual(M.parseReply('mk post 12'), { cmd: 'post', id: 12 });
  assert.deepEqual(M.parseReply('MK post #12'), { cmd: 'post', id: 12 });
  assert.deepEqual(M.parseReply('<@U0C7F2ZUB8C> mk skip 3'), { cmd: 'skip', id: 3 });
  assert.deepEqual(M.parseReply('Reply: mk edit 4 shorter, and drop the price'), { cmd: 'edit', id: 4, text: 'shorter, and drop the price' });
  assert.deepEqual(M.parseReply('mk done 5 https://www.tiktok.com/@botchelorcom/video/1'), { cmd: 'done', id: 5, text: 'https://www.tiktok.com/@botchelorcom/video/1' });
  assert.deepEqual(M.parseReply('mk status'), { cmd: 'list' });
  assert.deepEqual(M.parseReply('mk pause'), { cmd: 'pause' });
  assert.equal(M.parseReply('mk post').cmd, 'help');
  assert.match(M.parseReply('mk edit 4').error, /what to change/);
  assert.equal(M.parseReply('mk whatever').cmd, 'help');
  assert.equal(M.parseReply('make it so'), null);
  assert.equal(M.parseReply('cc mk post 1'), null);
});

test('drafts come back as JSON, possibly wrapped in prose', () => {
  assert.deepEqual(M.extractDraft('Here it is:\n{"title":"T","body":"B {x}","why":"w"}\nDone.'), { title: 'T', body: 'B {x}', why: 'w' });
  assert.equal(M.extractDraft('{"title":"T","body":""}'), null);
  assert.equal(M.extractDraft('no json'), null);
});

test('draft checks: link kept exactly, no After Dark, no vote-asking, lengths', () => {
  const link = M.utmLink(cfg, cfg.channels[1]);
  assert.equal(link, 'https://botchelor.com/?utm_source=reddit&utm_medium=social&utm_campaign=season1&utm_content=jai');
  // A channel's own landing page keeps the same tags.
  assert.equal(M.utmLink(cfg, cfg.channels[1], '/alternatives/janitor-ai'), 'https://botchelor.com/alternatives/janitor-ai?utm_source=reddit&utm_medium=social&utm_campaign=season1&utm_content=jai');
  const ok = { kind: 'reddit', title: 'T', body: `hi ${link}`, link };
  assert.deepEqual(M.checkDraft(ok), []);
  assert.match(M.checkDraft({ ...ok, body: 'hi https://botchelor.com/' }).join(), /link/);
  assert.match(M.checkDraft({ ...ok, body: `${link} and After Dark` }).join(), /after/);
  assert.match(M.checkDraft({ ...ok, body: `${link} please upvote` }).join(), /upvote/);
  // A creator's date link (only works with a character of your own) and Chud by name: never in a post.
  assert.match(M.checkDraft({ ...ok, body: `${link} or date Chud at https://botchelor.com/date/dfc77e4eb130` }).join(), /date/);
  assert.match(M.checkDraft({ ...ok, body: `${link} Chud says hi` }).join(), /chud/);
  assert.deepEqual(M.checkDraft({ ...ok, body: `${link} https://botchelor.com/create?meet=house-juniper` }), []);
  assert.match(M.checkDraft({ ...ok, title: '' }).join(), /title/);
  assert.match(M.checkDraft({ ...ok, title: 'x'.repeat(301) }).join(), /title longer/);
  assert.match(M.checkDraft({ kind: 'bluesky', body: `${'x'.repeat(290)} ${link}`, link }).join(), /longer than 300/);
  assert.deepEqual(M.checkDraft({ kind: 'reddit', body: 'thanks!', replyTo: { name: 't1_a' } }), [], 'replies need no title or link');
  assert.deepEqual(M.checkDraft({ ...ok, body: `${link}\n\n- Dates are PG. No NSFW` }), []);
});

test('the hash covers exactly the title and body David saw', () => {
  const q = M.emptyQueue();
  const a = M.addItem(q, { channel: 'jai', kind: 'reddit', title: 'T', body: 'B' });
  const b = M.addItem(q, { channel: 'jai', kind: 'reddit', title: 'T', body: 'B ' });
  assert.equal(a.id, 1);
  assert.equal(b.id, 2);
  assert.notEqual(a.hash, b.hash);
  assert.equal(a.hash, M.draftHash({ title: 'T', body: 'B' }));
});

test('the phone message shows the exact text and the commands', () => {
  const item = { id: 7, channel: 'jai', kind: 'reddit', title: 'Title here', body: 'Body here', flair: 'self advertising' };
  const msg = M.draftMessage(item, cfg.channels[1]);
  assert.match(msg, /#7 · r\/JanitorAI_Refuges · flair: self advertising/);
  assert.match(msg, /Title: Title here\n———\nBody here\n———/);
  assert.match(msg, /mk post 7 · mk edit 7 <changes> · mk skip 7/);
  assert.match(M.draftMessage({ id: 8, kind: 'video', channel: 'video', body: 'cap' }, cfg.channels[5]), /mk done 8/);
});

test('inbox triage: bots skipped, mods forwarded, replies drafted, seen ones ignored', () => {
  const kids = [
    { data: { name: 't1_a', author: 'AutoModerator', was_comment: true, body: 'Welcome' } },
    { data: { name: 't1_b', author: 'mod-reply', was_comment: true, body: 'Use the flair', subreddit: 'ChatbotRefugees' } },
    { data: { name: 't1_c', author: 'AntNagi', was_comment: true, body: 'Nice idea', subreddit: 'SillyTavernAI', context: '/r/x/c/1/', link_title: 'T' } },
    { data: { name: 't4_d', author: 'someone', was_comment: false, subject: 'hi', body: 'msg' } },
    { data: { name: 't1_e', author: 'Outside_Sir_9341', was_comment: true, body: 'me' } },
    { data: { name: 't1_f', author: 'x', was_comment: true, body: 'old' } },
  ];
  const n = M.inboxNews(kids, ['t1_f'], 'Outside_Sir_9341');
  assert.deepEqual(n.map((x) => [x.name, x.skip ? 'skip' : x.kind]), [['t1_a', 'skip'], ['t1_b', 'forward'], ['t1_c', 'reply'], ['t4_d', 'forward'], ['t1_e', 'skip']]);
  assert.equal(n[2].parent, 't1_c');
});

test('the Friday report reads the engagement numbers and the week\'s posts', () => {
  const msg = M.reportMessage({
    from: '2026-11-07', to: '2026-11-13',
    engagement: { totals: { visitors: 40 }, previous: { visitors: 20 }, returning: { new_visitors: 30, returned: 3 },
      funnel: [{ label: 'Landed', visitors: 40 }, { label: 'Created', visitors: 4 }], campaigns: [{ key: 'reddit / social / season1 / jai', visitors: 9 }] },
    posted: [{ channel: 'r/JanitorAI_Refuges', postUrl: 'https://r/1' }],
  });
  assert.match(msg, /Visitors 40 \(week before 20\) · came back 3 of 30 new/);
  assert.match(msg, /Funnel: Landed 40 → Created 4/);
  assert.match(msg, /reddit \/ social \/ season1 \/ jai: 9/);
  assert.match(msg, /Posted this week \(1\)/);
  assert.match(M.reportMessage({ from: 'a', to: 'b', engagement: null, posted: [] }), /Couldn't read/);
});

test('botchelor\'s calendar is valid', () => {
  const real = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ideas', 'botchelor', 'marketing.json'), 'utf8'));
  const seen = new Set();
  for (const ch of real.channels) {
    assert.ok(!seen.has(ch.id), `duplicate channel ${ch.id}`);
    seen.add(ch.id);
    // Kinds the loop posts (M.AUTO_KINDS), the TikTok kit, and the ones David posts by hand or that aren't built yet.
    assert.ok([...M.AUTO_KINDS, 'video', 'hn', 'producthunt', 'card', 'stream', 'facebook', 'threads'].includes(ch.kind), ch.id);
    if (ch.follows) assert.ok(real.channels.some((o) => o.id === ch.follows), `${ch.id} follows a channel that doesn't exist`);
    assert.ok(['active', 'hand', 'paused', 'waiting', 'needs-account', 'off'].includes(ch.status), ch.id);
    if (ch.kind.startsWith('reddit')) assert.ok(ch.sub, `${ch.id} needs a sub`);
    if (ch.kind === 'reddit-thread') assert.doesNotThrow(() => new RegExp(ch.match), ch.id), assert.ok(ch.match, `${ch.id} needs a match`);
    if (ch.window) assert.ok(M.weekMinute(ch.window.fromUtc) != null && M.weekMinute(ch.window.toUtc) != null, ch.id);
  }
  assert.ok(real.reddit?.account);
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'ideas', 'botchelor', 'MARKETING-FACTS.md')));
});

test('pickHelpPosts keeps fresh, open self posts by others, fewest comments first', () => {
  const now = Date.parse('2026-11-10T20:00:00Z');
  const base = { self: true, author: 'someone', comments: 3, ts: now - 2 * 3_600_000 };
  const things = [
    { ...base, name: 't3_a', comments: 9 },
    { ...base, name: 't3_b', comments: 1 },
    { ...base, name: 't3_link', self: false },
    { ...base, name: 't3_pinned', stickied: true },
    { ...base, name: 't3_ours', author: 'Outside_Sir_9341' },
    { ...base, name: 't3_new', ts: now - 5 * 60_000 },
    { ...base, name: 't3_old', ts: now - 60 * 3_600_000 },
    { ...base, name: 't3_busy', comments: 80 },
    { ...base, name: 't3_done' },
  ];
  const got = M.pickHelpPosts(things, { now, me: 'outside_sir_9341', skip: new Set(['t3_done']) }).map((t) => t.name);
  assert.deepStrictEqual(got, ['t3_b', 't3_a']);
});

test('a help answer may not carry a link or name the product', () => {
  const ok = { kind: 'reddit-help', body: 'Ship the boring version first; I lost a week on caching nobody needed.', helpOn: { name: 't3_x' } };
  assert.deepStrictEqual(M.checkDraft(ok), []);
  assert.ok(M.checkDraft({ ...ok, body: 'See https://example.com for how' }).some((e) => /no links/.test(e)));
  assert.ok(M.checkDraft({ ...ok, body: 'I hit this building Botchelor.' }).some((e) => /product/.test(e)));
  assert.ok(M.checkDraft({ ...ok, helpOn: null }).some((e) => /needs the post/.test(e)));
});

test('extractDraft keeps the chosen post id', () => {
  assert.strictEqual(M.extractDraft('{"post":"t3_q","title":"","body":"Answer."}').post, 't3_q');
});

// ─── 2026-11-11: channels that follow the video kit, and kinds David posts by hand ─────────────────────────
test('follower channels ride on the video kit, never drafted on their own', () => {
  const c = { ...cfg, perDay: { ...cfg.perDay, youtube: 1 }, channels: [
    { id: 'video', kind: 'video', status: 'active', cooldownDays: 1, logName: 'TikTok' },
    { id: 'yt', kind: 'youtube', follows: 'video', status: 'active' },
    { id: 'ig', kind: 'instagram', follows: 'video', status: 'needs-account' },
    { id: 'late', kind: 'instagram', follows: 'video', status: 'active', from: '2026-12-01' },
  ] };
  const now = at('2026-11-12T20:00:00Z');
  assert.deepEqual(M.dueChannels(c, { launchLog: { posts: [] }, queue: M.emptyQueue(), now }).map((x) => x.id), ['video']);
  assert.deepEqual(M.followers(c, 'video', now).map((x) => x.id), ['yt']);
});

test('only kinds the loop can post are auto-approved', () => {
  for (const k of ['reddit', 'bluesky', 'x', 'threads', 'discord', 'youtube', 'instagram']) assert.equal(M.autoPostable(k), true, k);
  for (const k of ['video', 'hn', 'producthunt', 'card', 'stream']) assert.equal(M.autoPostable(k), false, k);
  const msg = M.draftMessage({ id: 7, channel: 'show_hn', kind: 'hn', title: 'Show HN: x', body: 'b' }, { id: 'show_hn', kind: 'hn' });
  assert.match(msg, /yours to post \(hn\)/);
  assert.match(msg, /mk done 7/);
});

test('kitPost re-tags the vote link and makes a Shorts title', () => {
  const cap = 'Kaede and Malachar meet for the first time, on a night ferry crossing the bay.\n\nVote: botchelor.com/vote?s=tiktok\n#botchelor';
  const yt = M.kitPost(cap, 'youtube', 'youtube');
  assert.equal(yt.title, 'Kaede and Malachar meet for the first time, on a night ferry crossing the bay. #Shorts');
  assert.match(yt.body, /vote\?s=youtube/);
  assert.doesNotMatch(yt.body, /s=tiktok/);
  assert.deepEqual(M.checkDraft({ kind: 'youtube', ...yt }), []);
  const long = M.kitPost('word '.repeat(40).trim(), 'youtube', 'youtube');
  assert.ok(long.title.length <= 100, long.title);
  assert.ok(long.title.endsWith('…'));
  const ig = M.kitPost(cap, 'instagram', 'instagram');
  assert.equal(ig.title, '');
  assert.match(ig.body, /s=instagram/);
});

test('the botchelor calendar parses and its new channels are wired', () => {
  const real = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ideas', 'botchelor', 'marketing.json'), 'utf8'));
  const byId = Object.fromEntries(real.channels.map((c) => [c.id, c]));
  assert.equal(byId.youtube_shorts.follows, 'video');
  assert.equal(byId.instagram_reels.follows, 'video');
  assert.equal(M.autoPostable(byId.show_hn.kind), false);
  for (const c of real.channels) assert.ok(['active', 'hand', 'paused', 'waiting', 'needs-account', 'off'].includes(c.status), c.id);
});

test('posts draft before help answers, so help answers cannot spend the Reddit budget first', () => {
  const chs = [{ id: 'h1', kind: 'reddit-help' }, { id: 'p1', kind: 'reddit' }, { id: 'h2', kind: 'reddit-help' }, { id: 'b', kind: 'bluesky' }, { id: 't', kind: 'reddit-thread' }];
  assert.deepEqual(M.draftOrder(chs).map((c) => c.id), ['p1', 'b', 't', 'h1', 'h2']);
});

test('stepRecovered: a tick step logs ok once when it works again, and once when nothing is known yet', () => {
  const h = {};
  assert.equal(M.stepRecovered(h, 'watch', true), true);
  assert.equal(M.stepRecovered(h, 'watch', true), false);
  assert.equal(M.stepRecovered(h, 'watch', false), false);
  assert.equal(h.watch, 'fail');
  assert.equal(M.stepRecovered(h, 'watch', true), true);
  assert.deepEqual(h, { watch: 'ok' });
});

test('postRetryLater: a spent Reddit budget, or a browser that won\'t start (8 h after approval), waits for the next run', () => {
  assert.equal(M.postRetryLater(new Error('Reddit fetch budget (15) used up for this run')), 'budget');
  assert.equal(M.postRetryLater('Reddit fetch budget (3) used up for this run'), 'budget');
  assert.equal(M.postRetryLater(new Error('the text changed after David saw it; resend it first')), false);
  assert.equal(M.postRetryLater(new Error('SUBREDDIT_NOTALLOWED')), false);
  assert.equal(M.postRetryLater(undefined), false);
  // 2026-11-14: another session's headed browse held port 34567; #33 x was failed 3 s after its approval.
  const busy = new Error('the automated browser won\'t start: [browse] Connect failed: Server failed to start: [browse] Failed to start: [browse] Port 34567 (from BROWSE_PORT env) is in use');
  const item = { approvedAt: '2026-11-14T16:21:27.215Z' };
  assert.equal(M.postRetryLater(busy, { item, now: at('2026-11-14T16:24:50Z') }), 'browser');
  assert.equal(M.postRetryLater(busy, { item, now: at('2026-11-14T23:00:00Z') }), 'browser');
  assert.equal(M.postRetryLater(busy, { item, now: at('2026-11-15T01:00:00Z') }), false, 'after 8 h the post has missed its day');
  assert.equal(M.postRetryLater(busy, { item: {}, now: at('2026-11-14T16:24:50Z') }), false, 'no approval time: never wait forever');
  assert.equal(M.postRetryLater(busy), false);
  assert.equal(M.postRetryLater(new Error('X\'s composer didn\'t take the text exactly (tried twice); nothing was posted'), { item, now: at('2026-11-14T16:24:50Z') }), false);
});

test('postRetryLater: a TikTok post that stopped before Post goes again next run, three more times at most', () => {
  // 2026-11-22: #115, the day's TikTok, 37 s after it was approved; nothing was up, and it waited for a hand retry.
  const label = new Error('couldn\'t turn on TikTok\'s AI-generated content label (off); nothing was posted');
  const item = { kind: 'tiktok', channel: 'tiktok', approvedAt: '2026-11-22T02:23:25.000Z' };
  const now = at('2026-11-22T02:24:02Z');
  assert.equal(M.postRetryLater(label, { item, now }), 'tiktok');
  // Every message tiktokPost throws before its Post button takes the click (lib/market-io.js).
  for (const msg of [
    'TikTok\'s upload page has no file picker; nothing was posted', // 2026-11-21, #98
    'couldn\'t open TikTok\'s upload page: [browse] Headed server running (PID 8637) but not responding.\n[browse] Run \'/open-gstack-browser\' to restart.', // 2026-11-21, #102
    'couldn\'t open TikTok Studio: [browse] timeout',
    'TikTok didn\'t take the video file: [browse] no such element',
    'TikTok didn\'t finish uploading the video within 3 minutes; nothing was posted',
    'TikTok\'s caption box didn\'t take the caption exactly (tried twice); nothing was posted',
    'TikTok\'s caption changed while setting the cover; nothing was posted',
    'TikTok\'s Post button was disabled; nothing was posted',
  ]) {
    assert.equal(M.tiktokStoppedShort(msg), true, msg);
    assert.equal(M.postRetryLater(new Error(msg), { item, now }), 'tiktok', msg);
  }
  // The caller counts the waits in item.postTries: the first try and TIKTOK_RETRIES more, then it fails as before.
  assert.equal(M.TIKTOK_RETRIES, 3);
  assert.equal(M.postRetryLater(label, { item: { ...item, postTries: 2 }, now }), 'tiktok');
  assert.equal(M.postRetryLater(label, { item: { ...item, postTries: 3 }, now }), false, 'the fourth try was the last');
  // Inside the browser's 8 h only, and never without an approval time.
  assert.equal(M.postRetryLater(label, { item, now: at('2026-11-22T10:30:00Z') }), false, 'the day\'s clip has missed its day');
  assert.equal(M.postRetryLater(label, { item: { kind: 'tiktok' }, now }), false);
  // Not signed in needs David, and another channel's "nothing was posted" keeps its own rule (X: no retry).
  const signedOut = new Error('the automated browser isn\'t signed in to TikTok (sign in at tiktok.com in Chrome as @botchelorcom and it copies the sign-in next run)');
  assert.equal(M.tiktokStoppedShort(signedOut), false);
  assert.equal(M.postRetryLater(signedOut, { item, now }), false);
  assert.equal(M.postRetryLater(label, { item: { ...item, kind: 'x', channel: 'x' }, now }), false);
  assert.equal(M.postRetryLater(new Error('X\'s Post button was disabled; nothing was posted'), { item, now }), false);
  assert.equal(M.postRetryLater(new Error('no caption'), { item, now }), false);
});

test('the loop has words for every reason postRetryLater gives for waiting', () => {
  // bin/idea-market.js postApproved looks the reason up in a map; a reason with no entry would log "undefined".
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'bin', 'idea-market.js'), 'utf8');
  const map = /const why = \{([\s\S]*?)\}\[wait\];/.exec(src);
  assert.ok(map, 'the why map is in postApproved');
  for (const reason of ['budget', 'browser', 'reddit', 'tiktok']) assert.match(map[1], new RegExp(`\\b${reason}:`), reason);
  assert.match(src, /if \(wait === 'tiktok'\) item\.postTries = \(item\.postTries \|\| 0\) \+ 1;/);
});

// ─── 2026-11-14: the daily clip is daily ───────────────────────────────────────────────────────────────────
test('the video kit is due once a local day, whatever David answered to the earlier one', () => {
  const c = { ...cfg, timezone: 'America/Los_Angeles' };
  const q = M.emptyQueue();
  // 11 Nov 18:36 PT: the kit for the 12th goes to David, who says nothing for 38 h.
  const kit = M.addItem(q, { channel: 'video', kind: 'video', body: 'x', episode: 'e1' }, at('2026-11-12T02:36:00Z'));
  kit.status = 'sent';
  assert.ok(!ids(M.dueChannels(c, { launchLog: { posts: [] }, queue: q, now: at('2026-11-12T02:40:00Z') })).includes('video'), 'one kit a day');
  assert.ok(ids(M.dueChannels(c, { launchLog: { posts: [] }, queue: q, now: at('2026-11-13T02:30:00Z') })).includes('video'), '12 Nov evening: the open kit does not hold the day\'s clip back');
  // 13 Nov 08:39 PT: mk done. The hour he logged it is no cooldown on the 13th's clip.
  kit.status = 'posted'; kit.postedAt = '2026-11-13T16:39:09Z';
  const launchLog = { posts: [{ channel: 'TikTok', postedAt: '2026-11-13T16:39:09Z' }] };
  assert.ok(ids(M.dueChannels(c, { launchLog, queue: q, now: at('2026-11-14T02:30:00Z') })).includes('video'), '13 Nov evening');
  // A kit cut today holds the rest of the day.
  M.addItem(q, { channel: 'video', kind: 'video', body: 'y', episode: 'e2' }, at('2026-11-14T02:31:00Z')).status = 'sent';
  assert.ok(!ids(M.dueChannels(c, { launchLog, queue: q, now: at('2026-11-14T04:30:00Z') })).includes('video'));
  // Every other channel keeps the open-draft rule and its cooldown.
  const q2 = M.emptyQueue();
  M.addItem(q2, { channel: 'agents', kind: 'reddit-thread', body: 'x' }, at('2026-11-09T16:00:00Z')).status = 'sent';
  assert.ok(!ids(M.dueChannels(c, { launchLog: { posts: [] }, queue: q2, now: at('2026-11-09T17:00:00Z') })).includes('agents'));
  assert.ok(!ids(M.dueChannels(c, { launchLog: { posts: [{ channel: 'r/JanitorAI_Refuges', postedAt: '2026-11-09T18:00:06Z' }] }, queue: M.emptyQueue(), now: at('2026-11-10T17:00:00Z') })).includes('jai'));
});

test('automationRule: sub rules that forbid automated or AI-written posts (2026-11-23 rule texts)', () => {
  const banned = [
    "2. Don't spam: Please avoid spam and repetitive content. This includes the use of bots, scripts, or automated programs to post, comment, or artificially manipulate engagement.",
    '11. No Bots, Farming, or Artificial Engagement: Do not use automated scripts ("bots") to post, comment, or interact. Accounts must be operated by a human for genuine community participation.',
    "12. No Automated Content: Please keep this subreddit mostly human (despite the content of it). Do your part as a human",
    "6. No Spam or Off-Topic: Spammers are members who copy and paste recommendations, generate them via AI, or repeatedly promote the same service regardless of context.",
    '6. Human posts only: Posts must be human-written.',
    '3. No AI-generated posts or comments.',
  ];
  for (const r of banned) assert.equal(M.automationRule(['1. Be kind: no harassment.', r]), r, r);
  const fine = [
    '1. Be kind: no harassment.',
    '4. App Promotions Allowed (Use Flair): You\'re welcome to promote your bots, apps, or characters, but use the "Bot Promotion" or "App Promotion" flair.',
    'JAI bot promotion is only allowed on Thursday/Friday.',
    '8. Self-promotion limited: Developers are only allowed to make promotional posts on Sundays, using the "Promotion Sunday" post flair.',
    '5. AI-generated images must be flaired as AI art.',
    '2. Share your chatbot screenshots and roleplay logs; generated media must remain SFW.',
    '6. No bypassing automatic removals: some topics are removed by automod.',
  ];
  for (const r of fine) assert.equal(M.automationRule([r]), null, r);
  assert.equal(M.automationRule([]), null);
  assert.equal(M.automationRule(undefined), null);
});

test('hand channels: due like any channel, one reminder per cooldown, never drafted for the loop to post', () => {
  const c = { timezone: 'UTC', perDay: { reddit: 2 }, channels: [
    { id: 'jai', kind: 'reddit', sub: 'JanitorAI_Refuges', status: 'hand', cooldownDays: 7, handWhy: 'rule 12: No Automated Content' },
    { id: 'off', kind: 'reddit', sub: 'Nope', status: 'paused', cooldownDays: 7 },
  ] };
  const now = at('2026-11-30T12:00:00Z');
  assert.deepEqual(ids(M.dueChannels(c, { launchLog: { posts: [] }, queue: M.emptyQueue(), now })), ['jai']);
  // A reminder two days ago, expired unanswered: not due again until the cooldown passes.
  const q = M.emptyQueue();
  const it = M.addItem(q, { channel: 'jai', kind: 'reddit', sub: 'JanitorAI_Refuges', title: '', body: '', hand: true }, at('2026-11-28T12:00:00Z'));
  it.status = 'expired';
  assert.deepEqual(ids(M.dueChannels(c, { launchLog: { posts: [] }, queue: q, now })), []);
  assert.deepEqual(ids(M.dueChannels(c, { launchLog: { posts: [] }, queue: q, now: at('2026-12-06T12:00:00Z') })), ['jai']);
  // A post David logged three days ago holds it for the cooldown too.
  const log = { posts: [{ channel: 'r/JanitorAI_Refuges', postedAt: '2026-11-27T12:00:00Z' }] };
  assert.deepEqual(ids(M.dueChannels(c, { launchLog: log, queue: M.emptyQueue(), now })), []);
});

test('handMessage: where, why, window, last post and how to log it, with no draft text', () => {
  const ch = { id: 'sunday', kind: 'reddit', sub: 'ChatbotRefugees', status: 'hand', flair: 'Promotion Sunday', handWhy: 'rule 2 bans automated posting', window: { fromUtc: 'Sat 10:00', toUtc: 'Mon 11:59' } };
  const msg = M.handMessage({ id: 42, sub: 'ChatbotRefugees' }, ch, { lastPostedAt: '2026-11-21T19:00:00.000Z', now: at('2026-11-29T12:00:00Z') });
  assert.match(msg, /#42 · your turn on r\/ChatbotRefugees/);
  assert.match(msg, /rule 2 bans automated posting/);
  assert.match(msg, /Sat 10:00 to Mon 11:59 UTC \(open now\)/);
  assert.match(msg, /Flair: Promotion Sunday/);
  assert.match(msg, /Last post there: 2026-11-21/);
  assert.match(msg, /mk done 42 <link>/);
  const t = M.handMessage({ id: 7, sub: 'CharacterAIrunaways', thread: { title: 'November megathread', permalink: 'https://www.reddit.com/r/CharacterAIrunaways/comments/x/' } }, { sub: 'CharacterAIrunaways' });
  assert.match(t, /Comment in: November megathread https:\/\/www\.reddit\.com/);
  assert.match(t, /No post there yet/);
});

test('pickAskThreads: fresh threads asking for an app or how to keep characters, newest first', () => {
  const now = at('2026-11-23T20:00:00Z').getTime();
  const t = (name, title, hoursAgo, extra = {}) => ({ name, title, author: 'someone', permalink: `/r/CharacterAIrunaways/comments/${name}/x/`, ts: now - hoursAgo * 3_600_000, comments: 3, self: true, ...extra });
  const things = [
    t('a', 'Anyone else looking for a SFW Character.AI alternative?', 2),
    t('b', "Is Character.AI down or shutting down? What's a good backup", 5),
    t('c', 'My favourite bot said the funniest thing', 1),
    t('d', 'Looking for the best alternative', 20), // too old
    t('e', 'Please stop advertising your apps in here', 1),
    t('f', 'How do I export my chats before the auction?', 3, { comments: 80 }), // too busy
    t('g', 'Where do we go now?', 0.2), // too new (under 30 min)
    t('h', 'Recommend me something like c.ai', 4, { author: 'Outside_Sir_9341' }), // our own
  ];
  assert.deepEqual(M.pickAskThreads(things, { now, me: 'Outside_Sir_9341' }).map((x) => x.name), ['a', 'b']);
  assert.deepEqual(M.pickAskThreads(things, { now, skip: new Set(['a']) }).map((x) => x.name), ['h', 'b']);
  assert.equal(M.refusesPitch("I don't want new sites made by random people, just tell me if c.ai stays"), true);
  assert.equal(M.refusesPitch('No self promo please, I want real opinions'), true);
  assert.equal(M.refusesPitch('What app do you all use now? I liked the group chats.'), false);
  const msg = M.asksMessage({ sub: 'CharacterAIrunaways', handWhy: 'rule 6', handTip: 'never Companions' }, M.pickAskThreads(things, { now, me: 'Outside_Sir_9341' }), now);
  assert.match(msg, /2 new threads in r\/CharacterAIrunaways/);
  assert.match(msg, /"Anyone else looking for a SFW Character.AI alternative\?" \(2 h ago, 3 comments\) https:\/\/www\.reddit\.com\/r\/CharacterAIrunaways\/comments\/a\/x\//);
  assert.match(msg, /Rule: rule 6/);
  assert.match(msg, /Tip: never Companions/);
});

test('rssItems reads a Ghost feed; newsHoldLine holds drafts until the facts file is newer', () => {
  const xml = `<?xml version="1.0"?><rss><channel><title><![CDATA[Character.AI Blog]]></title>
    <item><title><![CDATA[Chapter 11 Update &amp; Transaction Notice]]></title><link>https://blog.character.ai/chapter-11-update-and-transaction-notice/</link><guid isPermaLink="false">abc</guid><pubDate>Wed, 05 Nov 2026 17:00:00 GMT</pubDate></item>
    <item><title><![CDATA[An Update on Character&#x2019;s Future]]></title><link>https://blog.character.ai/an-update-on-character-ai/</link><pubDate>Mon, 12 Oct 2026 16:00:00 GMT</pubDate></item>
  </channel></rss>`;
  const items = M.rssItems(xml);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { title: 'Chapter 11 Update & Transaction Notice', link: 'https://blog.character.ai/chapter-11-update-and-transaction-notice/', date: 'Wed, 05 Nov 2026 17:00:00 GMT' });
  assert.equal(items[1].title, 'An Update on Character’s Future');
  assert.deepEqual(M.rssItems(''), []);

  const hold = { name: 'Character.AI', topic: 'Character.AI', title: 'Auction results', link: 'https://blog.character.ai/x/', since: '2026-12-01T18:00:00.000Z' };
  assert.match(M.newsHoldLine(hold, Date.parse('2026-11-23T10:00:00Z')), /say NOTHING about Character.AI's situation/);
  assert.equal(M.newsHoldLine(hold, Date.parse('2026-12-02T09:00:00Z')), null); // facts updated after the news
  assert.equal(M.newsHoldLine(null, 0), null);
});

test('handDraftBlock: a ready draft for David to change and post himself, or why there is none', () => {
  const block = M.handDraftBlock({ id: 9, title: "I'm the dev: my OC show now imports Character.AI characters", body: 'Hi all, I made Botchelor…\n\nhttps://botchelor.com/import?from=cai', flair: 'Promotion Sunday' });
  assert.match(block, /A draft to change as you like and post yourself \(flair: Promotion Sunday\):/);
  assert.match(block, /Title: I'm the dev/);
  assert.match(block, /Hi all, I made Botchelor/);
  assert.match(block, /mk edit 9 <what to change>/);
  assert.equal(M.handDraftBlock({ id: 3, body: '' }), '');
  assert.match(M.handDraftBlock({ id: 3 }, { error: 'drafting failed: timeout' }), /No draft this time: drafting failed: timeout/);
});

test('replies in a hand sub go to David: the channel lookup and his note', () => {
  const c = { channels: [
    { id: 'sunday', kind: 'reddit', sub: 'ChatbotRefugees', status: 'hand', handDraft: true },
    { id: 'mcp', kind: 'reddit', sub: 'mcp', status: 'active' },
  ] };
  assert.equal(M.handChannelFor(c, 'chatbotrefugees').id, 'sunday');
  assert.equal(M.handChannelFor(c, 'mcp'), null);
  assert.equal(M.handChannelFor(c, ''), null);
  const n = { author: 'someone', sub: 'ChatbotRefugees', body: 'Does it keep the definition?', context: '/r/ChatbotRefugees/comments/x/y/z/' };
  const plain = M.handReplyMessage(n, { why: 'rule 2 bans automated posting' });
  assert.match(plain, /u\/someone replied in r\/ChatbotRefugees: "Does it keep the definition\?"/);
  assert.match(plain, /https:\/\/www\.reddit\.com\/r\/ChatbotRefugees\/comments\/x\/y\/z\//);
  assert.match(plain, /yours to answer by hand \(rule 2 bans automated posting\); the loop won't reply there/);
  assert.doesNotMatch(plain, /A draft/);
  assert.match(M.handReplyMessage(n, { draft: 'Yes, all of it goes into the builder.' }), /A draft to change as you like and post yourself:\n\nYes, all of it/);
});
