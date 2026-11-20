// market-media.js — the picture each social post carries (David 2026-11-19: "cover images on every social post").
// YouTube Shorts and Instagram Reels get their video kit's designed cover (cover.png) as the thumbnail; X, Bluesky,
// Threads and Discord posts get the kit's cover when the post is about a kit's date, or else the linked botchelor.com
// page's og:image. Reddit posts stay text (subreddit rules). The choice is pure (imagePlan, kitAbout, ogTags); the file
// work behind it (a JPEG of the cover with ffmpeg, the linked page's og:image) is here too, so lib/market-io.js only
// posts. A picture that can't be made never stops the post: the caller posts the text and logs why (bin/idea-market.js).
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const HOME = os.homedir();
const CLIPS = process.env.CLIPS_DIR || path.join(HOME, 'BotchelorClips');
// launchd's PATH has no /opt/homebrew/bin.
const FFMPEG = process.env.FFMPEG_BIN || (fs.existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg');
// gstack's `browse upload` only takes files under /tmp or its server's folder, so pictures for X and Threads go here.
const MEDIA_TMP = process.env.MARKET_MEDIA_TMP || '/tmp/idea-market';
const UA = 'Mozilla/5.0 (Macintosh) idea-market';

/** The kinds whose posts carry a picture (pure). Reddit stays text; videos (Shorts, Reels, TikTok) get the kit's cover. */
const IMAGE_KINDS = new Set(['youtube', 'instagram', 'tiktok', 'bluesky', 'x', 'threads', 'discord']);

// ─── pure ────────────────────────────────────────────────────────────────────────────────────────────────────

const ENTITIES = { amp: '&', quot: '"', apos: "'", '#39': "'", '#x27': "'", lt: '<', gt: '>', nbsp: ' ' };
const unescape = (s) => String(s).replace(/&(amp|quot|apos|#39|#x27|lt|gt|nbsp);/gi, (m, e) => ENTITIES[e.toLowerCase()] ?? m);

/** A page's Open Graph / Twitter card tags (pure): {image, imageAlt, title, description}, each null when missing. */
function ogTags(html) {
  const tags = {};
  for (const m of String(html || '').matchAll(/<meta\b[^>]*>/gi)) {
    const attr = (name) => {
      const a = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(m[0]);
      return a ? unescape(a[2] ?? a[3] ?? a[4] ?? '') : null;
    };
    const key = (attr('property') || attr('name') || '').toLowerCase();
    const content = attr('content');
    if (key && content != null && !(key in tags)) tags[key] = content.trim();
  }
  return {
    image: tags['og:image'] || tags['og:image:url'] || tags['twitter:image'] || null,
    imageAlt: tags['og:image:alt'] || tags['twitter:image:alt'] || null,
    title: tags['og:title'] || tags['twitter:title'] || null,
    description: tags['og:description'] || tags['twitter:description'] || null,
  };
}

/** The absolute http(s) URL of a page's og:image (pure), or null. */
function ogImageFrom(html, pageUrl) {
  const { image } = ogTags(html);
  if (!image) return null;
  try {
    const u = new URL(image, pageUrl);
    return /^https?:$/.test(u.protocol) ? u.toString() : null;
  } catch { return null; }
}

/** The first http(s) link in a post's text (pure), or null. */
function firstLink(text) {
  const m = /https?:\/\/[^\s)>\]]+/.exec(String(text || ''));
  return m ? m[0].replace(/[.,;:!?'"]+$/, '') : null;
}

/** A kit's characters from its checklist's heading, "# Posting Sable Quist × Juniper Vale" (pure); [] for a cut. */
function kitNames(checklist) {
  const h = /^#\s*Posting\s+(.+)$/m.exec(String(checklist || ''));
  if (!h || /episode cut/i.test(h[1])) return [];
  const names = h[1].split(/\s+(?:×|x|&|and)\s+/i).map((s) => s.trim()).filter(Boolean);
  return names.length >= 2 ? names : [];
}

/** Alt text for a kit's cover (pure), from its checklist's heading. */
function kitAlt(checklist) {
  const h = /^#\s*Posting\s+(.+)$/m.exec(String(checklist || ''));
  const what = h ? h[1].trim() : '';
  const cut = /^the episode cut:\s*(.+)$/i.exec(what);
  if (cut) return `Cover of a Botchelor episode cut: ${cut[1]}. AI characters on an AI-written blind date.`;
  return what ? `Cover of a Botchelor blind date: ${what}. AI characters on an AI-written date.` : 'Cover of a Botchelor blind date: AI characters on an AI-written date.';
}

/**
 * The newest kit whose two characters are both named in a post's text (pure), or null: a Bluesky, X or Threads post
 * quoting a date from the day's kit shows that kit's cover. `kits` is [{dir, names}], newest first.
 */
function kitAbout(text, kits) {
  const t = String(text || '').toLowerCase();
  if (!t) return null;
  return (kits || []).find((k) => (k.names || []).length >= 2 && k.names.every((n) => t.includes(String(n).toLowerCase()))) || null;
}

/**
 * Which picture a post gets (pure): {source: 'kit', kitDir} for a post that rides on a video kit (Shorts, Reels, TikTok) or
 * is about one (names both its characters), {source: 'og', page} for a post with a link, or null (no picture: Reddit,
 * a reply or answer, a post with neither).
 */
function imagePlan(item, { kits = [] } = {}) {
  if (!item || !IMAGE_KINDS.has(item.kind) || item.replyTo || item.helpOn) return null;
  if (item.kitDir) return { source: 'kit', kitDir: item.kitDir };
  if (['youtube', 'instagram', 'tiktok'].includes(item.kind)) return null; // a video without a kit folder: the platform picks a frame
  const kit = kitAbout(item.body, kits);
  if (kit) return { source: 'kit', kitDir: kit.dir };
  const page = item.link || firstLink(item.body);
  return page ? { source: 'og', page } : null;
}

/**
 * What to record on a queue item about its picture (pure): {source, ok, how?, error?} from the plan, the picture
 * (or why it couldn't be made) and what the platform did with it (`res.image` from market-io). Null when the post had
 * no picture planned.
 */
function imageOutcome(plan, picture, pictureError, platform) {
  if (!plan) return null;
  const base = { source: plan.source, ...(plan.source === 'kit' ? { kit: path.basename(plan.kitDir) } : { page: plan.page }) };
  if (pictureError || !picture) return { ...base, ok: false, error: `couldn't make the picture: ${String(pictureError || 'none found').slice(0, 300)}` };
  if (!platform) return { ...base, ok: false, error: 'the poster took no picture' };
  return platform.ok ? { ...base, ok: true, how: platform.how || 'attached' } : { ...base, ok: false, error: String(platform.error || 'refused').slice(0, 300), ...(platform.verify ? { verify: true } : {}) };
}

// ─── files ─────────────────────────────────────────────────────────────────────────────────────────────────

const ffmpeg = (args) => spawnSync(FFMPEG, ['-loglevel', 'error', '-y', ...args], { encoding: 'utf8', timeout: 120_000 });

/**
 * A kit's cover as a JPEG of at most `maxBytes` (YouTube takes 2 MB, Bluesky 1 MB), 1080×1920: cover.png when the kit
 * has one, else the video's opening card (1.2 s in, past the fade from black). Returns its path; throws why not.
 */
function coverJpeg(kitDir, { maxBytes = 2_000_000, width = 1080, height = 1920 } = {}) {
  const png = path.join(kitDir, 'cover.png');
  const video = path.join(kitDir, 'post.mp4');
  const from = fs.existsSync(png) ? ['-i', png] : fs.existsSync(video) ? ['-ss', '1.2', '-i', video] : null;
  if (!from) throw new Error(`no cover.png or post.mp4 in ${kitDir}`);
  fs.mkdirSync(MEDIA_TMP, { recursive: true });
  const out = path.join(MEDIA_TMP, `cover-${path.basename(kitDir)}-${maxBytes}.jpg`);
  for (const q of [3, 5, 8, 12]) {
    const r = ffmpeg([...from, '-frames:v', '1', '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`, '-q:v', String(q), out]);
    if (r.status !== 0) throw new Error(`ffmpeg couldn't make the cover: ${String(r.stderr || r.error || '').trim().slice(-200)}`);
    if (fs.statSync(out).size <= maxBytes) return out;
  }
  throw new Error(`the cover stays over ${maxBytes} bytes even at low quality`);
}

/** The recent video kits in ${CLIPS}/posts, newest first: [{dir, names, alt}] (the last `days` days). */
function recentKits({ days = 7, now = new Date() } = {}) {
  const root = path.join(CLIPS, 'posts');
  const since = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  let dirs = [];
  try { dirs = fs.readdirSync(root).filter((d) => /^\d{4}-\d{2}-\d{2}-/.test(d) && d.slice(0, 10) >= since).sort().reverse(); } catch { return []; }
  const out = [];
  for (const d of dirs) {
    try {
      const checklist = fs.readFileSync(path.join(root, d, 'checklist.md'), 'utf8');
      out.push({ dir: path.join(root, d), names: kitNames(checklist), alt: kitAlt(checklist) });
    } catch { /* not a kit */ }
  }
  return out;
}

/** A kit's alt text, read from its checklist. */
function kitAltFor(kitDir) {
  try { return kitAlt(fs.readFileSync(path.join(kitDir, 'checklist.md'), 'utf8')); } catch { return kitAlt(''); }
}

/** A linked page's og:image saved as a file of at most `maxBytes`: {file, url, alt, title, description}. Throws why not. */
async function pageImage(page, { maxBytes = 2_000_000 } = {}) {
  const r = await fetch(page, { redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`${page} answered ${r.status}`);
  const html = await r.text();
  const tags = ogTags(html);
  const url = ogImageFrom(html, r.url || page);
  if (!url) throw new Error(`${page} has no og:image`);
  const img = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) });
  if (!img.ok) throw new Error(`its og:image ${url} answered ${img.status}`);
  const type = String(img.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const bytes = Buffer.from(await img.arrayBuffer());
  fs.mkdirSync(MEDIA_TMP, { recursive: true });
  const stem = path.join(MEDIA_TMP, `og-${crypto.createHash('sha1').update(url).digest('hex').slice(0, 12)}`);
  let file;
  if ((type === 'image/jpeg' || type === 'image/png') && bytes.length <= maxBytes) {
    file = `${stem}.${type === 'image/png' ? 'png' : 'jpg'}`;
    fs.writeFileSync(file, bytes);
  } else {
    // Another format (webp, svg) or too big: re-encode as a JPEG no wider than 1200.
    const raw = `${stem}.src`;
    fs.writeFileSync(raw, bytes);
    file = `${stem}.jpg`;
    let done = false;
    for (const q of [3, 6, 10]) {
      const c = ffmpeg(['-i', raw, '-frames:v', '1', '-vf', "scale='min(1200,iw)':-2", '-q:v', String(q), file]);
      if (c.status !== 0) throw new Error(`ffmpeg couldn't convert ${url}: ${String(c.stderr || c.error || '').trim().slice(-200)}`);
      if (fs.statSync(file).size <= maxBytes) { done = true; break; }
    }
    if (!done) throw new Error(`${url} stays over ${maxBytes} bytes`);
  }
  return { file, url, alt: tags.imageAlt || tags.title || null, title: tags.title, description: tags.description };
}

/**
 * The picture for a post, ready to attach: {file, alt, source, card?} or null when it gets none (imagePlan). `card`
 * (Bluesky's link card) is {uri, title, description} for a page's og:image. Throws why the picture couldn't be made.
 */
async function postImage(item, { plan, maxBytes = 2_000_000, kits } = {}) {
  const p = plan === undefined ? imagePlan(item, { kits: kits || recentKits() }) : plan;
  if (!p) return null;
  if (p.source === 'kit') return { source: 'kit', file: coverJpeg(p.kitDir, { maxBytes }), alt: kitAltFor(p.kitDir), width: 1080, height: 1920 };
  const og = await pageImage(p.page, { maxBytes });
  return { source: 'og', file: og.file, alt: og.alt || 'Botchelor', card: { uri: p.page, title: og.title || 'Botchelor', description: og.description || '' } };
}

module.exports = { IMAGE_KINDS, MEDIA_TMP, ogTags, ogImageFrom, firstLink, kitNames, kitAlt, kitAbout, imagePlan, imageOutcome, coverJpeg, recentKits, kitAltFor, pageImage, postImage };
