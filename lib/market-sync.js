'use strict';
/**
 * The marketing log, sent to the product's public page (botchelor: /marketing, POST /api/admin/marketing; David
 * 2026-11-15: "keep track of all posts ... full transparency to a visitor or investor"). buildFeed is pure: the
 * calendar's channels, every post the loop made (marketing-queue.json) and every post logged by hand
 * (launch-log.json), and the money planned or spent (marketing.json `spend`). The site checks every field again and
 * shows all of it, so only public things go in: links, titles, scores, and each channel's `publicNote` (never the
 * internal `note`/`angle`, which name accounts, keys and people).
 */

const crypto = require('crypto');
const { feedStats } = require('./market-stats');

/** Text that names something private (David's mailbox user name, a keychain path) never goes out. */
const PRIVATE = /1426davejobs|vault\/|keychain|@gmail\.com/i;
const scrub = (s) => (typeof s === 'string' && !PRIVATE.test(s) ? s : null);

/** The source name the site records for a visit from this kind of channel (botchelor lib/engagement.ts sourceOf). */
function sourceFor(kind) {
  if (!kind) return null;
  if (kind.startsWith('reddit')) return 'reddit';
  if (kind === 'video') return 'tiktok';
  return kind;
}

/** Where a channel lives on the web, from its kind and the calendar's handles. */
function channelUrl(cfg, ch) {
  if (ch.url) return ch.url;
  if (ch.sub) return `https://www.reddit.com/r/${ch.sub}/`;
  const h = (k) => cfg[k]?.handle;
  switch (ch.kind) {
    case 'bluesky': return h('bluesky') ? `https://bsky.app/profile/${h('bluesky')}` : null;
    case 'x': return h('x') ? `https://x.com/${h('x')}` : null;
    case 'threads': return h('threads') ? `https://www.threads.com/@${h('threads')}` : null;
    case 'discord': return cfg.discord?.invite || null;
    case 'youtube': return 'https://www.youtube.com/@Botchelor';
    case 'instagram': return 'https://www.instagram.com/botchelor/';
    case 'video':
    case 'tiktok': return `https://www.tiktok.com/@${h('tiktok') || 'botchelorcom'}`;
    case 'hn': return 'https://news.ycombinator.com/';
    case 'producthunt': return 'https://www.producthunt.com/';
    default: return null;
  }
}

function channelName(ch) {
  if (ch.logName) return ch.logName;
  if (ch.sub) return `r/${ch.sub}`;
  const names = { bluesky: 'Bluesky', x: 'X', threads: 'Threads', discord: 'Our Discord', youtube: 'YouTube Shorts', instagram: 'Instagram Reels', video: 'TikTok', tiktok: 'TikTok', hn: 'Hacker News', producthunt: 'Product Hunt' };
  return names[ch.kind] || ch.id;
}

function cadence(ch) {
  if (ch.maxPosts === 1 || (ch.cooldownDays || 0) >= 365) return 'once';
  const d = ch.cooldownDays;
  if (!d) return ch.kind === 'video' || ch.follows ? 'daily' : null;
  if (d === 1) return 'daily';
  if (d === 7) return 'weekly';
  if (d % 7 === 0) return `every ${d / 7} weeks`;
  return `every ${d} days`;
}

const STATUS = { active: 'active', waiting: 'waiting', 'needs-account': 'waiting', off: 'off' };

function postType(item) {
  if (item.helpOn) return 'answer';
  if (item.kind === 'reddit-thread' || item.replyTo) return 'comment';
  if (['video', 'youtube', 'instagram'].includes(item.kind)) return 'video';
  return 'post';
}

/** A post's title: its own, or the body's first line, trimmed. */
function titleOf(item) {
  const t = (item.title || '').trim() || String(item.body || '').split('\n').map((l) => l.trim()).find(Boolean) || '';
  return t.length > 140 ? `${t.slice(0, 137)}…` : t;
}

/** A hand-logged post's channel: the calendar channel it names ("r/mcp" → mcp), or its own slug. */
function logChannel(cfg, name) {
  const n = String(name || '').trim();
  const sub = /^r\/([\w]+)/i.exec(n)?.[1];
  const real = (cfg.channels || []).filter((c) => c.kind !== 'reddit-help');
  const firstWord = (x) => String(x || '').toLowerCase().split(/[\s(/@]/)[0];
  // Hand logs name a channel loosely ("Threads @botchelor", "TikTok @botchelorcom"): by sub, exact name, then kind or first word.
  const byKind = /^tiktok/i.test(n) ? 'video' : /^threads/i.test(n) ? 'threads' : null;
  const hit =
    real.find((c) => (sub && c.sub && c.sub.toLowerCase() === sub.toLowerCase()) || (c.logName && c.logName.toLowerCase() === n.toLowerCase())) ||
    (!sub && byKind && real.find((c) => c.kind === byKind)) ||
    (!sub && real.find((c) => c.logName && firstWord(c.logName) === firstWord(n)));
  if (hit) {
    // A directory listing (kind card) is tagged with its own site's name (utm_source=uneed, devhunt, ...).
    const source = hit.kind === 'card' ? String(hit.logName || hit.id).toLowerCase().split(/[\s(]/)[0].replace(/[^\w]/g, '') : sourceFor(hit.kind);
    return { id: hit.id, name: channelName(hit), kind: hit.kind, source, content: hit.kind.startsWith('reddit') ? hit.id : null };
  }
  const id = n.toLowerCase().replace(/^r\//, 'r-').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'other';
  const first = n.toLowerCase().split(/[\s(@]/)[0];
  const source = sub ? 'reddit' : /tiktok/i.test(n) ? 'tiktok' : /threads/i.test(n) ? 'threads' : /chub/i.test(n) ? 'chub' : /tiktok/i.test(n) ? 'tiktok' : /hacker news|show hn/i.test(n) ? 'hacker_news' : /product hunt/i.test(n) ? 'product_hunt' : first.replace(/[^\w]/g, '') || null;
  return { id, name: n, kind: sub ? 'reddit' : 'other', source, content: null };
}

/** "2 points, 7 comments" in a log note, when it has one. */
function noteNumbers(note) {
  const m = /(-?\d+)\s+points?,\s*(\d+)\s+comments?/i.exec(String(note || ''));
  return m ? { score: Number(m[1]), comments: Number(m[2]) } : { score: null, comments: null };
}

/** A Reddit post's title from its link's slug ("/comments/1x/im_the_developer_a_show/" → "im the developer a show"). */
function titleFromUrl(u) {
  const m = /\/comments\/\w+\/([\w-]+)/.exec(String(u || ''));
  return m ? m[1].replace(/[_-]+/g, ' ').trim() : null;
}

const hashId = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);

/** The whole log as the site takes it (pure). */
function buildFeed(cfg, queue, launchLog) {
  const channels = [];
  for (const ch of cfg.channels || []) {
    if (ch.kind === 'reddit-help') continue; // answers are logged under the subreddit they were in
    channels.push({ id: ch.id, name: channelName(ch), kind: ch.kind, status: STATUS[ch.status] || 'off', url: scrub(channelUrl(cfg, ch)), cadence: cadence(ch), note: scrub(ch.publicNote) });
  }
  for (const s of cfg.skipped || []) channels.push({ id: s.id, name: s.name, kind: s.kind || 'other', status: 'skipped', url: scrub(s.url) || null, cadence: null, note: scrub(s.why) });

  const posts = [];
  const seenUrls = new Set();
  const byId = new Map((cfg.channels || []).map((c) => [c.id, c]));
  for (const it of queue.items || []) {
    if (!['posted', 'done'].includes(it.status)) continue;
    const ch = byId.get(it.channel) || { id: it.channel, kind: it.kind };
    // An answer in someone else's thread is shown under that subreddit, not under the "help" channel.
    const where = it.helpOn || it.sub ? { id: `r-${String(it.sub || ch.sub || it.channel).toLowerCase()}`, name: `r/${it.sub || ch.sub || it.channel}` } : { id: ch.id, name: channelName(ch) };
    const sameChannel = byId.get(where.id.replace(/^r-/, '')) || [...byId.values()].find((c) => c.sub && it.sub && c.sub.toLowerCase() === it.sub.toLowerCase());
    const channelId = it.helpOn ? where.id : sameChannel ? sameChannel.id : ch.id;
    const url = scrub(it.postUrl) || null;
    if (url) seenUrls.add(url);
    const tagged = !it.helpOn && ['reddit', 'reddit-thread', 'bluesky', 'x', 'threads', 'discord'].includes(it.kind);
    // The daily stats (lib/market-stats.js): likes and comments where Reddit's score isn't, and views (an optional
    // field: the site keeps the fields it knows and drops the rest).
    const st = feedStats(it);
    posts.push({
      id: `q-${it.id}`,
      at: it.postedAt || it.sentAt || it.createdAt,
      channel: channelId,
      channel_name: it.helpOn ? where.name : sameChannel ? channelName(sameChannel) : channelName(ch),
      type: postType(it),
      title: scrub(titleOf(it)) || '',
      url,
      status: it.removedSeen ? 'removed' : 'live',
      score: Number.isFinite(it.score) ? it.score : st.score ?? null,
      comments: Number.isFinite(it.comments) ? it.comments : st.comments ?? null,
      ...(st.views != null ? { views: st.views } : {}),
      source: it.helpOn ? null : sourceFor(it.kind),
      content: tagged ? (sameChannel ? sameChannel.id : ch.id) : null,
      note: it.removedSeen ? `Removed there (${it.removedSeen}).` : null,
    });
  }
  const queuedDays = new Set(posts.map((p) => `${p.channel}|${String(p.at).slice(0, 10)}`));
  for (const p of launchLog.posts || []) {
    if (/not a post/i.test(p.channel || '')) continue;
    const url = scrub(p.postUrl) || scrub(p.url) || null;
    if (url && seenUrls.has(url)) continue;
    const ch = logChannel(cfg, p.channel);
    // Logged by hand and also made by the loop the same day (the loop's row has the details).
    if (!p.postUrl && queuedDays.has(`${ch.id}|${String(p.postedAt).slice(0, 10)}`)) continue;
    const nums = noteNumbers(p.note);
    const removed = /removed|spam filter/i.test(p.note || '');
    posts.push({
      id: `log-${hashId(`${p.postedAt}|${p.channel}|${url}`)}`,
      at: p.postedAt,
      channel: ch.id,
      channel_name: ch.name,
      type: /listing|uneed|devhunt|peerlist|directory/i.test(`${p.channel} ${p.note}`) ? 'listing' : /tiktok|reel|short|video/i.test(p.channel) ? 'video' : 'post',
      title: scrub(p.title) || titleFromUrl(p.postUrl) || ch.name,
      url,
      status: removed ? 'removed' : 'live',
      score: nums.score,
      comments: nums.comments,
      source: ch.source,
      content: ch.content,
      // The log's own note is a working note (who clicked what, utm tags); only a `publicNote` is shown.
      note: scrub(p.publicNote) || (removed ? 'Removed there.' : null),
    });
  }
  // Already-planned launches show up as scheduled rows.
  for (const u of cfg.upcoming || []) posts.push({ id: `up-${u.id}`, at: u.at, channel: u.channel, channel_name: u.name, type: u.type || 'post', title: u.title, url: null, status: 'scheduled', score: null, comments: null, source: u.source || null, content: null, note: scrub(u.note) });

  const spend = (cfg.spend || []).map((s) => ({ what: s.what, usd: s.usd, status: s.status === 'paid' ? 'paid' : 'planned', note: scrub(s.note) }));
  return { channels, posts: posts.filter((p) => p.at), spend };
}

module.exports = { buildFeed, sourceFor, channelUrl, channelName, cadence, logChannel, noteNumbers, PRIVATE };
