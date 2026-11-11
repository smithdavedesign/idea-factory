// market.js — the marketing loop's pure parts (bin/idea-market.js; David 2026-11-09: "create an automation to run
// the social media and marketing for botchelor", approvals from his phone).
//
// The loop drafts what's due from ideas/<slug>/marketing.json, sends each draft to David on WhatsApp and Slack, and
// posts only what he approves ("mk post <id>"). Nothing here does I/O: the queue, the calendar and the launch log
// come in as values, so every rule is testable.
//
//   queue (ideas/<slug>/marketing-queue.json):
//     { nextId, paused, items: [{ id, channel, kind, sub, title, body, flair, link, status, createdAt, sentAt,
//       approvedAt, postedAt, postUrl, replyTo, media, error, rev }], seen: { inbox: [names] }, last: { watch, report, … } }
//   item.status: drafted → sent → approved → posted, or skipped / failed / expired. Only "approved" ever posts,
//   and it posts the exact title and body David saw (item.hash is checked before posting).

const crypto = require('crypto');

const OPEN = new Set(['drafted', 'sent', 'approved']);
const DAY_MS = 86_400_000;
const DAYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

/** The YYYY-MM-DD of `date` in `timeZone` (pure). */
function localDay(date, timeZone = 'UTC') {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** The hour (0–23) of `date` in `timeZone` (pure). */
function localHour(date, timeZone = 'UTC') {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hour12: false }).format(date)) % 24;
}

/** The weekday (0 = Sunday) of `date` in `timeZone` (pure). */
function localWeekday(date, timeZone = 'UTC') {
  const w = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date).toLowerCase().slice(0, 3);
  return DAYS[w];
}

/** "Sat 10:00" → minutes since Sunday 00:00 UTC; null when it doesn't parse (pure). */
function weekMinute(spec) {
  const m = /^\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*\s+(\d{1,2}):(\d{2})\s*$/i.exec(String(spec || ''));
  if (!m) return null;
  return DAYS[m[1].toLowerCase()] * 1440 + Number(m[2]) * 60 + Number(m[3]);
}

/** Whether `date` falls in a channel's weekly UTC window {fromUtc, toUtc}; no window means always (pure). */
function inWindow(window, date) {
  if (!window) return true;
  const from = weekMinute(window.fromUtc);
  const to = weekMinute(window.toUtc);
  if (from == null || to == null) return true;
  const w = date.getUTCDay() * 1440 + date.getUTCHours() * 60 + date.getUTCMinutes();
  return from <= to ? w >= from && w <= to : w >= from || w <= to;
}

/**
 * Whether an approved item may post now (pure): inside its window and, on the window's first day, not before the
 * preferred UTC hour (r/ChatbotRefugees: after 19:00 UTC Saturday, when the reveal vote is open).
 */
function mayPostNow(channel, date) {
  const win = channel?.window;
  if (!win) return true;
  if (!inWindow(win, date)) return false;
  const first = weekMinute(win.fromUtc);
  if (win.preferUtcHour == null || first == null) return true;
  return date.getUTCDay() !== Math.floor(first / 1440) || date.getUTCHours() >= win.preferUtcHour;
}

/** The launch-log channel name for a calendar channel: "r/indiehackers", its logName, or its id (pure). */
function logChannel(channel) {
  return channel.sub ? `r/${channel.sub}` : channel.logName || channel.id;
}

/** Whether a launch-log entry belongs to a calendar channel (pure). Threads match "r/<sub> (…)". */
function logMatches(channel, entry) {
  const name = String(entry?.channel || '').toLowerCase();
  if (channel.sub) return name === `r/${channel.sub}`.toLowerCase() || name.startsWith(`r/${channel.sub} (`.toLowerCase());
  return name === String(channel.logName || channel.id).toLowerCase();
}

/**
 * When each channel last had a post that stayed up, and how many it had (pure): from the launch log (posts made by
 * hand or by this loop) and the queue. Removed posts count too: a community's cooldown starts at the attempt.
 */
function history(cfg, launchLog, queue) {
  const out = {};
  for (const ch of cfg.channels || []) {
    const times = [];
    // Help answers only count themselves: our launch post in the same sub isn't one of them.
    if (ch.kind !== 'reddit-help') for (const p of launchLog?.posts || []) if (logMatches(ch, p) && Date.parse(p.postedAt)) times.push(Date.parse(p.postedAt));
    for (const it of queue?.items || []) if (it.channel === ch.id && it.status === 'posted' && !it.replyTo && Date.parse(it.postedAt)) times.push(Date.parse(it.postedAt));
    const uniq = [...new Set(times)].sort((a, b) => a - b);
    out[ch.id] = { last: uniq.length ? uniq[uniq.length - 1] : null, count: uniq.length };
  }
  return out;
}

/**
 * The channels to draft for now (pure), in calendar order. A channel is due when it is active, its `from` day has
 * come, its cooldown since the last post has passed, its lifetime cap isn't reached, nothing of it is already open in
 * the queue, its window is open now or opens within a day, and its kind's daily cap (perDay) isn't used up today.
 */
function dueChannels(cfg, { launchLog, queue, now = new Date() }) {
  const tz = cfg.timezone || 'UTC';
  const today = localDay(now, tz);
  const hist = history(cfg, launchLog, queue);
  const usedToday = {};
  for (const it of queue?.items || []) {
    if (it.replyTo || !it.createdAt || localDay(new Date(it.createdAt), tz) !== today) continue;
    if (it.status === 'skipped' && !it.postedAt) continue; // a skipped draft frees its slot
    usedToday[it.kind] = (usedToday[it.kind] || 0) + 1;
  }
  const out = [];
  for (const ch of cfg.channels || []) {
    if (ch.status !== 'active') continue;
    if (ch.follows) continue; // rides on another channel's item (YouTube Shorts and Reels go out with the day's video kit)
    if (ch.from && today < ch.from) continue;
    if ((queue?.items || []).some((it) => it.channel === ch.id && !it.replyTo && OPEN.has(it.status))) continue;
    const h = hist[ch.id];
    if (ch.maxPosts != null && h.count >= ch.maxPosts) continue;
    if (h.last && now.getTime() - h.last < (ch.cooldownDays ?? 7) * DAY_MS - 3 * 3_600_000) continue; // 3 h slack: drafting runs before the hour it posted
    if (ch.window && !inWindow(ch.window, now) && !inWindow(ch.window, new Date(now.getTime() + DAY_MS))) continue;
    const cap = cfg.perDay?.[ch.kind] ?? 1;
    if ((usedToday[ch.kind] || 0) >= cap) continue;
    usedToday[ch.kind] = (usedToday[ch.kind] || 0) + 1;
    out.push(ch);
  }
  return out;
}

/**
 * The order to draft due channels in (pure): our own posts first, Reddit help answers last. Each run has a small
 * Reddit fetch budget, and help answers spend most of it reading threads; on 2026-11-11 they used it up before the
 * r/MCPservers post could read its rules, so the post failed. Stable within each group.
 */
function draftOrder(channels) {
  return [...channels.filter((c) => c.kind !== 'reddit-help'), ...channels.filter((c) => c.kind === 'reddit-help')];
}

/** The tagged link a post carries (pure): utm_source from the kind, utm_content from the channel id. */
function utmLink(cfg, channel, path = '') {
  const base = new URL(path || '/', cfg.site || 'https://example.com/');
  const source = channel.kind.startsWith('reddit') ? 'reddit' : channel.kind;
  base.searchParams.set('utm_source', source);
  base.searchParams.set('utm_medium', cfg.utm?.medium || 'social');
  base.searchParams.set('utm_campaign', cfg.utm?.campaign || 'launch');
  base.searchParams.set('utm_content', channel.id);
  return base.toString();
}

/** A stable fingerprint of what David approves: title and body exactly (pure). */
function draftHash(item) {
  return crypto.createHash('sha256').update(`${item.title || ''}\n\u0000\n${item.body || ''}`).digest('hex').slice(0, 16);
}

/**
 * David's reply (pure): "mk post 12", "mk edit 12 shorter, drop the price", "mk skip 12", "mk done 12" (he posted a
 * video kit himself), "mk list", "mk pause", "mk resume", "mk help". A Slack @-mention or a pasted "Reply:" in
 * front is ignored. Returns {cmd, id?, text?} or null when it isn't an mk reply.
 */
function parseReply(text) {
  const t = String(text || '').replace(/^\s*(?:<@[A-Z0-9]+>\s*)?(?:↩️\s*)?(?:reply:\s*)?/i, '');
  const m = /^mk\b[:,]?\s*(post|edit|skip|done|list|status|pause|resume|help)\b\s*#?(\d+)?[:,]?\s*([\s\S]*)$/i.exec(t.trim());
  if (!m) return /^mk\b/i.test(t.trim()) ? { cmd: 'help' } : null;
  const cmd = m[1].toLowerCase() === 'status' ? 'list' : m[1].toLowerCase();
  const id = m[2] ? Number(m[2]) : undefined;
  const rest = m[3].trim();
  if (['post', 'edit', 'skip', 'done'].includes(cmd) && id == null) return { cmd: 'help', error: `"mk ${cmd}" needs the draft's number, e.g. mk ${cmd} 12` };
  if (cmd === 'edit' && !rest) return { cmd: 'help', error: 'Say what to change, e.g. mk edit 12 shorter, and drop the price' };
  return { cmd, ...(id != null ? { id } : {}), ...(rest ? { text: rest } : {}) };
}

const HELP = 'Marketing replies: mk post <n> (post it as shown) · mk edit <n> <what to change> · mk skip <n> · mk done <n> (you posted it yourself) · mk list · mk pause / mk resume';

/** The model's draft from its final message (pure): the first JSON object with a body, or null. */
function extractDraft(text) {
  const s = String(text || '');
  for (let i = s.indexOf('{'); i !== -1; i = s.indexOf('{', i + 1)) {
    for (let j = s.lastIndexOf('}'); j > i; j = s.lastIndexOf('}', j - 1)) {
      try {
        const o = JSON.parse(s.slice(i, j + 1));
        if (o && typeof o.body === 'string' && o.body.trim()) return { title: typeof o.title === 'string' ? o.title.trim() : '', body: o.body.trim(), ...(o.why ? { why: String(o.why).slice(0, 300) } : {}), ...(typeof o.post === 'string' && o.post ? { post: o.post.trim() } : {}) };
      } catch { /* try a shorter span */ }
    }
  }
  return null;
}

const LIMITS = { youtube: { title: 100, body: 5000 }, instagram: { body: 2200 }, hn: { title: 80, body: 4000 }, reddit: { title: 300, body: 40000 }, 'reddit-thread': { body: 10000 }, 'reddit-reply': { body: 10000 }, 'reddit-help': { body: 2500 }, bluesky: { body: 300 }, x: { body: 280 }, discord: { body: 2000 } };
const BANNED = [/after\s*dark/i, /\b18\+/, /\bupvote/i, /\bdm me\b/i];

/**
 * What's wrong with a draft before it goes to David (pure): [] when fine. A post or thread comment must carry the
 * channel's tagged link exactly; nothing may mention After Dark or ask for votes; each kind has its length limits.
 */
function checkDraft(item) {
  const errs = [];
  const kind = item.replyTo ? 'reddit-reply' : item.kind;
  const lim = LIMITS[kind] || {};
  if (!item.body || !item.body.trim()) errs.push('empty body');
  if (item.kind === 'reddit' && !item.replyTo && !(item.title || '').trim()) errs.push('a Reddit post needs a title');
  if (lim.title && (item.title || '').length > lim.title) errs.push(`title longer than ${lim.title} characters`);
  if (lim.body && [...(item.body || '')].length > lim.body) errs.push(`body longer than ${lim.body} characters`);
  if (item.link && !item.replyTo && !(item.body || '').includes(item.link)) errs.push('the tagged link is missing or changed');
  for (const re of BANNED) if (re.test(`${item.title || ''}\n${item.body || ''}`)) errs.push(`contains "${re.source}"`);
  if (item.kind === 'reddit-help') {
    // A help answer is plain participation: no link, no product, nothing to sell.
    if (/https?:\/\/|www\.|\.com\b|\.ai\b/i.test(item.body || '')) errs.push('a help answer carries no links');
    if (/botchelor/i.test(item.body || '')) errs.push("a help answer doesn't mention the product");
    if (!item.helpOn?.name) errs.push('a help answer needs the post it answers');
  }
  return errs;
}

/**
 * The kinds the loop posts itself (bin/idea-market.js publish()). Everything else (a TikTok kit, Show HN, Product
 * Hunt, a character card) goes to David to post by hand, even with autoPost on (pure).
 */
const AUTO_KINDS = new Set(['reddit', 'reddit-thread', 'reddit-help', 'bluesky', 'discord', 'x', 'youtube', 'instagram']);
const autoPostable = (kind) => AUTO_KINDS.has(kind);

/** The channels that go out with the day's video kit (`follows: "video"`), active and past their `from` day (pure). */
function followers(cfg, of, now = new Date()) {
  const today = localDay(now, cfg.timezone || 'UTC');
  return (cfg.channels || []).filter((c) => c.follows === of && c.status === 'active' && !(c.from && today < c.from));
}

/**
 * A video kit's caption (scripts/clips/post-kit.mjs, written for TikTok) re-tagged for another channel (pure): the
 * vote link's `?s=tiktok` becomes `?s=<source>` so the site counts where each visit came from. For YouTube it also
 * makes the title: the caption's first sentence, at most 100 characters, with #Shorts when it fits.
 */
function kitPost(caption, source, kind) {
  const body = String(caption || '').trim().replace(/([?&]s=)tiktok\b/gi, `$1${source}`);
  if (kind !== 'youtube') return { title: '', body };
  const first = body.split('\n')[0].replace(/\s+/g, ' ').trim();
  let title = first.length <= 100 ? first : `${first.slice(0, 99).replace(/\s+\S*$/, '')}…`;
  if (title.length + 8 <= 100) title += ' #Shorts';
  return { title, body };
}

/** The phone message for a draft (pure): where it goes, the exact text, and how to answer. */
function draftMessage(item, channel) {
  const where = item.helpOn ? `answer in r/${item.sub} (karma building, no link)` : item.replyTo ? `reply on ${item.sub ? `r/${item.sub}` : 'Reddit'} to u/${item.replyTo.author}` : channel?.sub ? `r/${channel.sub}${item.kind === 'reddit-thread' ? ` (comment in "${item.thread?.title || 'thread'}")` : ''}` : item.channel;
  const lines = [`📣 Botchelor #${item.id} · ${where}${item.flair ? ` · flair: ${item.flair}` : ''}${item.rev ? ` · edit ${item.rev}` : ''}`];
  if (item.replyTo) lines.push('', `They wrote: "${String(item.replyTo.body || '').slice(0, 600)}"`, '');
  if (item.helpOn) lines.push('', `u/${item.helpOn.author} asked: "${item.helpOn.title}"`, String(item.helpOn.excerpt || '').slice(0, 500), item.helpOn.permalink, '');
  if (channel?.window && !mayPostNow(channel, new Date())) lines.push(`(Posts when the window opens: ${channel.window.fromUtc}${channel.window.preferUtcHour != null ? `, after ${channel.window.preferUtcHour}:00` : ''} UTC)`);
  if (item.title) lines.push(`Title: ${item.title}`);
  lines.push('———', item.body, '———');
  if (item.why) lines.push(`Why this angle: ${item.why}`);
  lines.push(!autoPostable(item.kind) && item.kind !== 'video' ? `This one is yours to post (${item.kind}). Post it, then: mk done ${item.id} · or mk skip ${item.id}` : item.kind === 'video' ? `Upload it as @botchelorcom with the AI-generated label on, then: mk done ${item.id} · or mk skip ${item.id}` : `mk post ${item.id} · mk edit ${item.id} <changes> · mk skip ${item.id}`);
  return lines.join('\n');
}

/** "Mon 2026-11-09" style ISO week key: the Monday of `date`'s UTC week (pure). */
function weekOf(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/**
 * The Friday report (pure): the funnel's four numbers, visitors per tagged link, and what went out this week.
 * `engagement` is botchelor's /api/admin/engagement for the last 7 days (null when it couldn't be read).
 */
function reportMessage({ engagement, posted, from, to }) {
  const lines = [`📊 Botchelor marketing, ${from} to ${to}`];
  if (engagement) {
    const t = engagement.totals || {};
    lines.push(`Visitors ${t.visitors ?? '?'} (week before ${engagement.previous?.visitors ?? '?'}) · came back ${engagement.returning?.returned ?? '?'} of ${engagement.returning?.new_visitors ?? '?'} new`);
    const f = (engagement.funnel || []).map((s) => `${s.label} ${s.visitors}`).join(' → ');
    if (f) lines.push(`Funnel: ${f}`);
    const tagged = (engagement.campaigns || []).filter((c) => c.key && c.key.trim()).slice(0, 10);
    if (tagged.length) lines.push('', 'Visitors by tagged link:', ...tagged.map((c) => `· ${c.key}: ${c.visitors ?? c.count}`));
  } else lines.push('(Couldn\'t read the engagement numbers this week.)');
  lines.push('', posted.length ? `Posted this week (${posted.length}):` : 'Nothing posted this week.', ...posted.map((p) => `· ${p.channel}${p.postUrl ? ` ${p.postUrl}` : ''}`));
  return lines.join('\n');
}

/** A new queue item (pure apart from the clock): the next id, and the queue's counter moved on. */
function addItem(queue, fields, now = new Date()) {
  const id = queue.nextId || 1;
  queue.nextId = id + 1;
  const item = { id, status: 'drafted', createdAt: now.toISOString(), ...fields };
  item.hash = draftHash(item);
  (queue.items ||= []).push(item);
  return item;
}

/** An empty queue (pure). */
const emptyQueue = () => ({ nextId: 1, paused: false, items: [], seen: { inbox: [] }, last: {} });

/**
 * Inbox entries worth David's attention (pure): new (not seen), not from a moderator bot. Replies to our posts and
 * comments come back as `reply` (a reply gets drafted); anything else (mod mail, a mention) as `forward`.
 */
function inboxNews(children, seen, me = '') {
  const known = new Set(seen || []);
  const out = [];
  for (const c of children || []) {
    const d = c?.data || {};
    if (!d.name || known.has(d.name)) continue;
    // AutoModerator-style bots post the same notice on every post: skipped. A moderator's own words are forwarded.
    const bot = /automod|bot$/i.test(d.author || '') && d.author !== 'mod-reply';
    if (bot || (me && d.author === me)) { out.push({ name: d.name, skip: true }); continue; }
    const mod = d.distinguished === 'moderator' || d.distinguished === 'admin' || d.author === 'mod-reply';
    if (d.was_comment && !mod) out.push({ name: d.name, kind: 'reply', author: d.author, body: d.body || '', sub: d.subreddit || '', context: d.context || '', parent: d.name, linkTitle: d.link_title || '' });
    else out.push({ name: d.name, kind: 'forward', author: d.author || d.subreddit_name_prefixed || '?', subject: d.subject || '', body: d.body || '', sub: d.subreddit || '' });
  }
  return out;
}

/**
 * Which new posts in a sub are worth answering (pure), best first: self posts that aren't pinned, locked or ours,
 * 30 minutes to `maxAgeHours` (default 48) old, with at most `maxComments` (default 30) comments, not already answered or offered. Fewer comments first, then newer.
 */
function pickHelpPosts(things, { now = Date.now(), me = '', skip = new Set(), max = 5, maxAgeHours = 48, maxComments = 30 } = {}) {
  const lower = String(me).toLowerCase();
  return (things || [])
    .filter((t) => t && t.name && t.self && !t.stickied && !t.locked && !t.archived && !t.nsfw)
    .filter((t) => String(t.author || '').toLowerCase() !== lower && !skip.has(t.name))
    .filter((t) => { const age = now - (t.ts || 0); return age >= 30 * 60_000 && age <= maxAgeHours * 3_600_000; })
    .filter((t) => (t.comments ?? 0) <= maxComments)
    .sort((a, b) => (a.comments ?? 0) - (b.comments ?? 0) || (b.ts || 0) - (a.ts || 0))
    .slice(0, max);
}

module.exports = {
  OPEN, HELP, localDay, localHour, localWeekday, weekMinute, inWindow, mayPostNow, logChannel, logMatches, history, dueChannels,
  AUTO_KINDS, autoPostable, followers, kitPost, draftOrder, utmLink, draftHash, parseReply, extractDraft, checkDraft, draftMessage, weekOf, reportMessage, addItem, emptyQueue, inboxNews, pickHelpPosts,
};
