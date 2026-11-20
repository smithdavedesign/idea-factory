// market-stats.js — how the loop's posts do, measured once a day (David 2026-11-19: "nothing records how posts
// perform"). Pure: which posts to measure, recording a day's numbers on the queue item (`item.stats`) and in a
// day-by-day history (ideas/<slug>/marketing-stats.json, so growth over days is visible), and the Friday report's
// "views per post" lines. The numbers themselves come from one fetcher per post kind (lib/market-io.js
// STATS_FETCHERS: youtube, instagram, bluesky; a new channel such as TikTok adds its own there).
//
//   history: { posts: { "<queue id>": { channel, kind, url, postedAt, days: { "YYYY-MM-DD": { views, likes, comments, … } } } } }
//   a fetcher: async (items) => ({ stats: { "<queue id>": { views?, likes?, comments?, … } }, notes: [{ key, message }] })
//   a note's key is "stats:<kind>:<what>" (e.g. stats:instagram:insights): told to David once, forgotten when it clears.

const DAY_MS = 86_400_000;
// Each post is measured daily for its first month; after that its last numbers stay on the queue item.
const TRACK_DAYS = 30;
const FIELDS = ['views', 'likes', 'comments', 'reposts', 'shares', 'saved', 'reach'];

/** A post's numbers with only the known count fields, each a finite number (pure). */
function cleanStats(s) {
  const out = {};
  for (const k of FIELDS) if (Number.isFinite(s?.[k])) out[k] = s[k];
  return out;
}

/**
 * The posted items to measure today, by kind (pure): posted by the loop, of a kind that has a fetcher, with an id
 * there (item.thing) and at most `trackDays` old. {kind: [items]}.
 */
function statsTargets(items, kinds, { now = new Date(), trackDays = TRACK_DAYS } = {}) {
  const want = new Set(kinds);
  const out = {};
  for (const it of items || []) {
    if (it.status !== 'posted' || !want.has(it.kind) || !it.thing) continue;
    const at = Date.parse(it.postedAt || '');
    if (!at || now.getTime() - at > trackDays * DAY_MS) continue;
    (out[it.kind] ||= []).push(it);
  }
  return out;
}

/**
 * Record one day's numbers (pure apart from mutating its arguments): each item gets `stats` (the latest numbers and
 * when they were read) and the history gets the day's row. Returns how many posts were recorded.
 */
function recordStats(items, history, day, stats, now = new Date()) {
  history.posts ||= {};
  let n = 0;
  for (const it of items || []) {
    const s = stats?.[it.id] ?? stats?.[String(it.id)];
    if (!s) continue;
    const clean = cleanStats(s);
    if (!Object.keys(clean).length) continue;
    it.stats = { ...clean, at: now.toISOString() };
    const h = (history.posts[String(it.id)] ||= { channel: it.channel, kind: it.kind, url: it.postUrl || null, postedAt: it.postedAt || null, days: {} });
    h.url = it.postUrl || h.url;
    h.days[day] = clean;
    n++;
  }
  history.updatedAt = now.toISOString();
  return n;
}

/** A post's numbers on or before `day` in the history (pure), or null. */
function statsOn(history, id, day) {
  const days = history?.posts?.[String(id)]?.days || {};
  const keys = Object.keys(days).filter((d) => d <= day).sort();
  return keys.length ? days[keys[keys.length - 1]] : null;
}

/**
 * The week's numbers per post (pure), for the Friday report: every measured post that went up in [from, to] or was
 * still being measured, with its latest numbers and the views it gained since `from` (null when unknown). Most
 * viewed first.
 */
function weekRows(items, history, { from, to }) {
  const rows = [];
  for (const it of items || []) {
    if (it.status !== 'posted' || !it.stats) continue;
    const day = String(it.postedAt || '').slice(0, 10);
    const latestDay = String(it.stats.at || '').slice(0, 10);
    if (latestDay < from && day < from) continue;
    if (day > to) continue;
    const before = day >= from ? { views: 0 } : statsOn(history, it.id, from);
    const gained = Number.isFinite(it.stats.views) && Number.isFinite(before?.views) ? it.stats.views - before.views : null;
    rows.push({ id: it.id, channel: it.channel, kind: it.kind, day, url: it.postUrl || null, new: day >= from, ...cleanStats(it.stats), gained });
  }
  return rows.sort((a, b) => (b.views ?? -1) - (a.views ?? -1) || (b.likes ?? -1) - (a.likes ?? -1) || b.id - a.id);
}

const KIND_NAMES = { youtube: 'YouTube Shorts', instagram: 'Instagram Reels', bluesky: 'Bluesky', x: 'X', threads: 'Threads', discord: 'Discord', tiktok: 'TikTok' };
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** One post's numbers in words (pure): "33 views · 1 like · 0 comments". */
function statsWords(s) {
  const parts = [];
  if (Number.isFinite(s.views)) parts.push(plural(s.views, 'view'));
  if (Number.isFinite(s.likes)) parts.push(plural(s.likes, 'like'));
  if (Number.isFinite(s.reposts)) parts.push(plural(s.reposts, 'repost'));
  if (Number.isFinite(s.comments)) parts.push(plural(s.comments, 'comment'));
  return parts.join(' · ');
}

/**
 * The Friday report's "Views per post this week" section (pure): totals per channel, then each post (at most `max`),
 * then what couldn't be measured (`notes`, e.g. Instagram's insights permission). [] when nothing was measured.
 */
function statsReportLines(rows, { notes = [], max = 12 } = {}) {
  if (!rows.length && !notes.length) return [];
  const lines = ['', 'Views per post this week:'];
  const byKind = {};
  for (const r of rows) {
    const k = (byKind[r.kind] ||= { posts: 0, views: null, gained: null, likes: 0 });
    k.posts++;
    if (Number.isFinite(r.views)) k.views = (k.views ?? 0) + r.views;
    if (Number.isFinite(r.gained)) k.gained = (k.gained ?? 0) + r.gained;
    if (Number.isFinite(r.likes)) k.likes += r.likes;
  }
  const totals = Object.entries(byKind).map(([kind, k]) => `${KIND_NAMES[kind] || kind} ${k.views != null ? `${plural(k.views, 'view')}${k.gained != null ? ` (+${k.gained} this week)` : ''}` : plural(k.likes, 'like')} over ${plural(k.posts, 'post')}`);
  if (totals.length) lines.push(`Totals: ${totals.join(' · ')}`);
  for (const r of rows.slice(0, max)) lines.push(`· ${KIND_NAMES[r.kind] || r.kind} #${r.id} (${r.day.slice(5)}${r.new ? '' : ', older'}): ${statsWords(r) || 'no numbers'}${!r.new && Number.isFinite(r.gained) ? ` (+${r.gained})` : ''}${r.url ? ` ${r.url}` : ''}`);
  if (rows.length > max) lines.push(`· …and ${rows.length - max} more`);
  for (const n of notes) lines.push(`(${n.message})`);
  return lines;
}

/**
 * What the public marketing log (lib/market-sync.js) shows from a post's stats (pure): `score` (likes there) and
 * `comments` when the post has no Reddit score of its own, and `views` (an optional field the site may show).
 */
function feedStats(item) {
  const s = item?.stats;
  if (!s) return {};
  return {
    ...(Number.isFinite(s.likes) && !Number.isFinite(item.score) ? { score: s.likes } : {}),
    ...(Number.isFinite(s.comments) && !Number.isFinite(item.comments) ? { comments: s.comments } : {}),
    ...(Number.isFinite(s.views) ? { views: s.views } : {}),
  };
}

/**
 * Notes to tell David about (pure): the ones not told yet. `told` ({key: day}) is kept in the queue. A key this run
 * speaks for (`covers(key)`, e.g. the stats of the kinds that were measured) that is no longer reported is forgotten,
 * so if the problem comes back it's told again. Mutates `told`; returns the notes to send.
 */
function notesToTell(told, notes, day, { covers = () => true } = {}) {
  const now = new Set((notes || []).map((n) => n.key));
  for (const k of Object.keys(told)) if (covers(k) && !now.has(k)) delete told[k];
  const out = [];
  for (const n of notes || []) {
    if (told[n.key]) continue;
    told[n.key] = day;
    out.push(n);
  }
  return out;
}

/** The standing "can't do this yet" notes, in a line each for the Friday report (by their key in queue.last.told). */
const NOTE_SHORT = {
  'stats:instagram:insights': 'Instagram views, reach and saves wait on the insights permission for the Meta app',
  'cover:youtube:verify': 'Shorts covers wait on the YouTube channel\'s phone verification (youtube.com/verify)',
};

module.exports = { NOTE_SHORT, TRACK_DAYS, FIELDS, cleanStats, statsTargets, recordStats, statsOn, weekRows, statsWords, statsReportLines, feedStats, notesToTell, KIND_NAMES };
