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
    assert.ok(['active', 'waiting', 'needs-account', 'off'].includes(ch.status), ch.id);
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
  for (const k of ['reddit', 'bluesky', 'x', 'discord', 'youtube', 'instagram']) assert.equal(M.autoPostable(k), true, k);
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
  for (const c of real.channels) assert.ok(['active', 'waiting', 'needs-account', 'off'].includes(c.status), c.id);
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
