// market-io.js — what the marketing loop (bin/idea-market.js) does outside its own files: David's phone (OpenClaw),
// Reddit through his signed-in browser (gstack browse, headed), Bluesky and Discord over HTTP, botchelor's numbers.
//
// Reddit: this Mac's logged-out requests get 403, and ~80 JSON fetches in 20 minutes got it blocked for a night
// (2026-11-08), so everything goes through the signed-in page and each run has a small fetch budget (FETCH_BUDGET).
// `browse js` drops the result of an awaited fetch: start a promise that writes window.__mk, then read it back.
// Keys come from the keychain at runtime (security find-generic-password), never from files.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const HOME = os.homedir();
const BROWSE = process.env.GSTACK_BROWSE || path.join(HOME, '.claude', 'skills', 'gstack', 'browse', 'dist', 'browse');
const OPENCLAW = process.env.OPENCLAW_BIN || '/usr/local/bin/openclaw';
const FETCH_BUDGET = Number(process.env.MARKET_REDDIT_FETCHES || 15);

// ─── keychain ───────────────────────────────────────────────────────────────────────────────────────────────

/** A keychain item's value (vault/<scope>/<NAME>), or null. Never logged. */
function secret(name) {
  try { return execFileSync('security', ['find-generic-password', '-s', name, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; } catch { return null; }
}

// ─── David's phone ──────────────────────────────────────────────────────────────────────────────────────────

/** Where David gets messages: the cc-bridge settings (his WhatsApp number, Slack #team-agents). */
function phoneTargets() {
  const def = { channels: ['whatsapp', 'slack'], whatsapp: '+15306011922', slack: 'channel:C0C85QYP4MN' };
  try { return { ...def, ...JSON.parse(fs.readFileSync(path.join(HOME, '.config', 'cc-bridge.json'), 'utf8')) }; } catch { return def; }
}

/** Send `text` (and optional media files) to David; `only` limits it to one channel (the one a reply came from). */
function tell(text, { media = [], only } = {}) {
  const cfg = phoneTargets();
  const sent = [];
  const failed = [];
  for (const ch of only ? [only] : cfg.channels) {
    const target = cfg[ch];
    if (!target) continue;
    const args = ['message', 'send', '--channel', ch, '--target', target, '--message', text];
    for (const m of media) args.push('--media', m);
    const r = spawnSync(OPENCLAW, args, { encoding: 'utf8', timeout: 120_000 });
    (r.status === 0 ? sent : failed).push(r.status === 0 ? ch : `${ch}: ${String(r.stderr || r.stdout || r.error || '').trim().slice(-200)}`);
  }
  return { sent, failed };
}

// ─── Reddit, through the signed-in browser ──────────────────────────────────────────────────────────────────

// browse keeps one server per folder (.gstack/browse.json); the loop always uses this one, outside ~/Documents so
// launchd can read it. Headed mode uses the shared ~/.gstack/chromium-profile, so Reddit's sign-in carries over, and
// only one headed browser can hold that profile: interactive sessions should use the same state file.
const BROWSE_STATE = process.env.MARKET_BROWSE_STATE || path.join(HOME, '.gstack', 'marketing', 'browse.json');

function browse(args, timeout = 60_000) {
  fs.mkdirSync(path.dirname(BROWSE_STATE), { recursive: true });
  const r = spawnSync(BROWSE, args, { encoding: 'utf8', timeout, env: { ...process.env, BROWSE_STATE_FILE: BROWSE_STATE } });
  return { ok: r.status === 0, out: String(r.stdout || ''), err: String(r.stderr || r.error || '') };
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Start the headed browser from scratch. `browse stop` can't reach a server that died (a reboot, a closed window),
 * and `connect` then trusts the stale state file, so: stop it if it answers, kill the recorded server if its process
 * is still alive, drop the state file, and connect. Sign-ins live in the shared Chromium profile, so they survive.
 */
function restartBrowser() {
  browse(['stop'], 30_000);
  try {
    const { pid } = JSON.parse(fs.readFileSync(BROWSE_STATE, 'utf8'));
    // After a reboot the pid may belong to something else: only kill it if it's still a bun process.
    const comm = pid ? String(spawnSync('ps', ['-o', 'comm=', '-p', String(pid)], { encoding: 'utf8' }).stdout || '') : '';
    if (/\bbun$/m.test(comm.trim())) { try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ } }
  } catch { /* no state file */ }
  try { fs.rmSync(BROWSE_STATE, { force: true }); } catch { /* ignore */ }
  browse(['connect'], 120_000);
}

/** True when the browser answers, is headed and has a page. */
function browserHealthy() {
  const st = browse(['status']);
  return /Status:\s*healthy/.test(st.out) && /Mode:\s*headed/.test(st.out) && !/No active page/.test(st.out + st.err);
}

/** The last JSON value printed by `browse js`, or the raw text. */
function lastValue(out) {
  const lines = out.trim().split('\n').filter((l) => l.trim() && !/^---\s*(BEGIN|END) UNTRUSTED/.test(l));
  return lines.length ? lines[lines.length - 1] : '';
}

class Reddit {
  constructor({ account }) { this.account = account; this.fetches = 0; this.ready = false; }

  /** A healthy headed browser on old.reddit.com, signed in as our account. Throws a plain reason otherwise. */
  async ensure() {
    if (this.ready) return;
    if (!browserHealthy()) restartBrowser();
    let go = browse(['goto', 'https://old.reddit.com/'], 90_000);
    if (!go.ok || /No active page/.test(go.out + go.err)) {
      restartBrowser();
      go = browse(['goto', 'https://old.reddit.com/'], 90_000);
    }
    if (!go.ok || /No active page/.test(go.out + go.err)) throw new Error('the automated browser is stuck ("No active page") even after a restart');
    const page = browse(['text'], 30_000).out;
    if (/\(403\)/.test(go.out) || (page.length < 1500 && /blocked by network security/i.test(page))) throw new Error('Reddit has blocked this Mac for now ("blocked by network security"); try again in a few hours');
    const me = await this.json('/api/me.json');
    const name = me?.data?.name;
    if (!name) throw new Error('the automated browser isn\'t signed in to Reddit: sign in as u/' + this.account);
    if (this.account && name !== this.account) throw new Error(`the browser is signed in to Reddit as u/${name}, not u/${this.account}`);
    this.modhash = me.data.modhash;
    this.ready = true;
  }

  /** Run an async snippet in the page; it must assign its result (JSON-able) to `out`. */
  async run(body, timeoutMs = 30_000) {
    const code = `window.__mk='p'; (async()=>{let out=null; ${body}; window.__mk=JSON.stringify({v:out})})().catch(e=>{window.__mk=JSON.stringify({err:String(e)})}); 1`;
    const r = browse(['js', code]);
    if (!r.ok) throw new Error(`browser js failed: ${(r.err || r.out).trim().slice(-200)}`);
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      await sleep(700);
      const v = lastValue(browse(['js', 'window.__mk']).out);
      if (v && v !== 'p' && v.startsWith('{')) {
        const o = JSON.parse(v);
        if (o.err) throw new Error(o.err);
        return o.v;
      }
    }
    throw new Error('timed out waiting for the page');
  }

  /** GET a Reddit JSON path from the page (counts against the run's budget). */
  async json(p) {
    if (++this.fetches > FETCH_BUDGET) throw new Error(`Reddit fetch budget (${FETCH_BUDGET}) used up for this run`);
    return this.run(`const r=await fetch(${JSON.stringify(p)},{credentials:'include'}); out=r.status===200?await r.json():{status:r.status}`);
  }

  /** POST a form to a Reddit API path with our modhash. */
  async post(p, params) {
    if (++this.fetches > FETCH_BUDGET) throw new Error(`Reddit fetch budget (${FETCH_BUDGET}) used up for this run`);
    const form = { ...params, uh: this.modhash, api_type: 'json' };
    return this.run(`const r=await fetch(${JSON.stringify(p)},{method:'POST',credentials:'include',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(${JSON.stringify(form)}).toString()}); out=await r.json()`);
  }

  /** The sub's rules as plain lines (for the drafter). */
  async rules(sub) {
    const r = await this.json(`/r/${sub}/about/rules.json`);
    return (r?.rules || []).map((x, i) => `${i + 1}. ${x.short_name}: ${String(x.description || '').replace(/\s+/g, ' ').slice(0, 600)}`);
  }

  /** A post flair's id by its text (case-insensitive); null when the sub has none by that name. */
  async flairId(sub, text) {
    const list = await this.json(`/r/${sub}/api/link_flair_v2.json`);
    if (!Array.isArray(list)) return null;
    const want = String(text).trim().toLowerCase();
    return list.find((f) => String(f.text || '').trim().toLowerCase() === want)?.id || null;
  }

  /**
   * The pinned recurring thread whose title matches `match` (a case-insensitive regex source): {name, title, permalink}
   * or null. Read from the sub's HTML page: Reddit answers this Mac's hot.json and search.json with 403.
   */
  async findThread(sub, match) {
    if (++this.fetches > FETCH_BUDGET) throw new Error(`Reddit fetch budget (${FETCH_BUDGET}) used up for this run`);
    const things = await this.run(`const res=await fetch(${JSON.stringify(`/r/${sub}/`)},{credentials:'include'}); const doc=new DOMParser().parseFromString(await res.text(),'text/html'); out=[...doc.querySelectorAll('#siteTable > .thing')].slice(0,10).map(t=>({name:t.dataset.fullname, stickied:t.classList.contains('stickied'), locked:t.classList.contains('locked'), archived:t.classList.contains('archived'), title:((t.querySelector('a.title')||{}).textContent||'').trim(), permalink:t.dataset.permalink, ts:Number(t.dataset.timestamp)||0}))`);
    const re = new RegExp(match, 'i');
    const pick = (things || []).find((d) => d.stickied && !d.locked && !d.archived && re.test(d.title) && (!d.ts || Date.now() - d.ts < 45 * 86_400_000));
    return pick ? { name: pick.name, title: pick.title, permalink: `https://www.reddit.com${pick.permalink}` } : null;
  }

  /** Submit a self post; returns {url, name}. Throws with Reddit's own error text. */
  async submit({ sub, title, text, flair }) {
    const params = { sr: sub, kind: 'self', title, text, resubmit: 'true' };
    if (flair) {
      const id = await this.flairId(sub, flair);
      if (!id) throw new Error(`r/${sub} has no post flair called "${flair}"`);
      params.flair_id = id;
      params.flair_text = flair;
    }
    const r = await this.post('/api/submit', params);
    const errs = r?.json?.errors || [];
    if (errs.length || !r?.json?.data?.url) throw new Error(`Reddit refused the post: ${JSON.stringify(errs).slice(0, 300) || 'no url'}`);
    return { url: r.json.data.url.replace('https://old.reddit.com', 'https://www.reddit.com'), name: r.json.data.name };
  }

  /** Comment on a post or reply to a comment (`parent` is its fullname); returns {url, name}. */
  async comment({ parent, text }) {
    const r = await this.post('/api/comment', { thing_id: parent, text });
    const errs = r?.json?.errors || [];
    const thing = r?.json?.data?.things?.[0]?.data;
    if (errs.length || !thing) throw new Error(`Reddit refused the comment: ${JSON.stringify(errs).slice(0, 300) || 'no comment returned'}`);
    return { url: thing.permalink ? `https://www.reddit.com${thing.permalink}` : null, name: thing.name || thing.id };
  }

  /** Whether a thing we posted is still up: {removed: string|null, score}. */
  async status(name) {
    const r = await this.json(`/api/info.json?id=${name}`);
    const d = r?.data?.children?.[0]?.data;
    if (!d) return { removed: 'not found', score: null };
    return { removed: d.removed_by_category || (d.banned_by ? 'removed' : null), score: d.score ?? null };
  }

  /** The newest inbox entries (comment replies, mentions, messages). */
  async inbox() {
    const r = await this.json('/message/inbox.json?limit=25');
    return r?.data?.children || [];
  }
}

// ─── X, through the same signed-in browser (X's API costs money) ───────────────────────────────────────────

/** A headed browser that answers, restarted once if it's stuck. */
function headedBrowser() {
  if (!browserHealthy()) restartBrowser();
}

/** The page's value of a JS expression (synchronous expressions only). */
function pageValue(expr) {
  return lastValue(browse(['js', expr]).out);
}

/**
 * Post `text` as the signed-in X account: type it into the composer line by line, check it reads back exactly,
 * click Post, then find the new post's URL on the profile. Returns {url, name}.
 */
async function xPost(text, handle) {
  headedBrowser();
  const go = browse(['goto', 'https://x.com/compose/post'], 90_000);
  if (!go.ok) throw new Error(`couldn't open X's composer: ${(go.err || go.out).trim().slice(-200)}`);
  await sleep(2500);
  if (/\/login|\/i\/flow\/login/.test(pageValue('location.href'))) throw new Error('the automated browser isn\'t signed in to X');
  browse(['wait', '[data-testid="tweetTextarea_0"]'], 30_000);
  browse(['js', "document.querySelector('[data-testid=tweetTextarea_0]').focus(); 1"]);
  const lines = String(text).split('\n');
  lines.forEach((line, i) => {
    if (line) browse(['type', line], 60_000);
    if (i < lines.length - 1) browse(['press', 'Enter']);
  });
  await sleep(1000);
  const typed = pageValue("JSON.stringify(document.querySelector('[data-testid=tweetTextarea_0]').innerText)");
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  let got = '';
  try { got = JSON.parse(typed); } catch {}
  if (norm(got) !== norm(text)) {
    browse(['press', 'Meta+a']);
    browse(['press', 'Backspace']);
    throw new Error('X\'s composer didn\'t take the text exactly; nothing was posted');
  }
  const clicked = pageValue("(()=>{const b=document.querySelector('[data-testid=tweetButton]'); if(!b||b.getAttribute('aria-disabled')==='true') return 'disabled'; b.click(); return 'ok'})()");
  if (clicked !== 'ok') throw new Error(`X's Post button was ${clicked}; nothing was posted`);
  await sleep(5000);
  browse(['goto', `https://x.com/${handle}`], 90_000);
  await sleep(3000);
  const url = pageValue(`(()=>{const a=[...document.querySelectorAll('article a[href*="/status/"]')].find(a=>a.querySelector('time')); return a?a.href:''})()`);
  return { url: url || `https://x.com/${handle}`, name: url ? url.split('/status/')[1] : null };
}

// ─── Bluesky and Discord ───────────────────────────────────────────────────────────────────────────────────

/** Link facets for a Bluesky post: every http(s) URL in `text`, by UTF-8 byte offsets. */
function blueskyFacets(text) {
  const facets = [];
  const re = /https?:\/\/[^\s)]+/g;
  let m;
  while ((m = re.exec(text))) {
    const byteStart = Buffer.byteLength(text.slice(0, m.index), 'utf8');
    facets.push({ index: { byteStart, byteEnd: byteStart + Buffer.byteLength(m[0], 'utf8') }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: m[0] }] });
  }
  return facets;
}

async function blueskyPost(text, { handleKey = 'vault/botchelor/BLUESKY_HANDLE', passwordKey = 'vault/botchelor/BLUESKY_APP_PASSWORD' } = {}) {
  const identifier = secret(handleKey);
  const password = secret(passwordKey);
  if (!identifier || !password) throw new Error(`no Bluesky login in the keychain (${handleKey}, ${passwordKey})`);
  const s = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier, password }) });
  if (!s.ok) throw new Error(`Bluesky sign-in failed (${s.status})`);
  const { accessJwt, did, handle } = await s.json();
  const record = { $type: 'app.bsky.feed.post', text, createdAt: new Date().toISOString(), facets: blueskyFacets(text) };
  const r = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${accessJwt}` }, body: JSON.stringify({ repo: did, collection: 'app.bsky.feed.post', record }) });
  if (!r.ok) throw new Error(`Bluesky refused the post (${r.status}): ${(await r.text()).slice(0, 200)}`);
  const { uri } = await r.json();
  return { url: `https://bsky.app/profile/${handle}/post/${String(uri).split('/').pop()}`, name: uri };
}

async function discordPost(text, { webhookKey = 'vault/botchelor/DISCORD_ANNOUNCE_WEBHOOK' } = {}) {
  const hook = secret(webhookKey);
  if (!hook) throw new Error(`no Discord webhook in the keychain (${webhookKey})`);
  const r = await fetch(`${hook}?wait=true`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: text, allowed_mentions: { parse: [] } }) });
  if (!r.ok) throw new Error(`Discord refused the post (${r.status})`);
  const m = await r.json();
  return { url: m.channel_id && m.guild_id ? `https://discord.com/channels/${m.guild_id}/${m.channel_id}/${m.id}` : null, name: m.id };
}

// ─── botchelor's numbers and short-video kits ──────────────────────────────────────────────────────────────

/** botchelor's /api/admin/engagement for [from, to] (UTC days), with the admin key from the keychain; null on failure. */
async function engagement(site, from, to) {
  const key = secret('vault/botchelor/FRONTIER_PASSWORD');
  if (!key) return null;
  try {
    const r = await fetch(new URL(`/api/admin/engagement?from=${from}&to=${to}`, site), { headers: { 'x-frontier-key': key, 'user-agent': 'botchelor-live-check/1.0 (Claude)' } });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

const CLIPS = process.env.CLIPS_DIR || path.join(HOME, 'BotchelorClips');
const CROWD_REPO = process.env.BOTCHELOR_CROWD_REPO || path.join(HOME, '.botchelor-crowd', 'repo');

/** The newest daily clip (scripts/clips/daily-clip.mjs) whose episode isn't in `done`: {episode, day, caption} or null. */
function newestClip(done = new Set()) {
  let files = [];
  try { files = fs.readdirSync(CLIPS).filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.txt$/.test(f)).sort().reverse(); } catch { return null; }
  for (const f of files.slice(0, 3)) {
    const txt = fs.readFileSync(path.join(CLIPS, f), 'utf8');
    const m = /\/episodes\/([0-9a-f-]{36})/i.exec(txt);
    if (m && !done.has(m[1])) return { episode: m[1], day: f.slice(0, 10), caption: txt.trim() };
  }
  return null;
}

/** Build the post kit for an episode (scripts/clips/post-kit.mjs in the crowd clone): {dir, video, caption}. */
function buildVideoKit(episode) {
  const before = new Set(listPosts());
  const r = spawnSync('/opt/homebrew/bin/node', ['scripts/clips/post-kit.mjs', episode], { cwd: CROWD_REPO, encoding: 'utf8', timeout: 15 * 60_000 });
  if (r.status !== 0) throw new Error(`post-kit failed: ${String(r.stderr || r.stdout || r.error).trim().slice(-300)}`);
  const fresh = listPosts().filter((d) => !before.has(d));
  const dir = fresh.length ? fresh[fresh.length - 1] : listPosts().slice(-1)[0];
  if (!dir) throw new Error('post-kit wrote no folder');
  const full = path.join(CLIPS, 'posts', dir);
  const video = path.join(full, 'post.mp4');
  if (!fs.existsSync(video)) throw new Error(`no post.mp4 in ${full}`);
  return { dir: full, video, caption: fs.readFileSync(path.join(full, 'caption.txt'), 'utf8').trim() };
}

function listPosts() {
  try { return fs.readdirSync(path.join(CLIPS, 'posts')).filter((d) => fs.statSync(path.join(CLIPS, 'posts', d)).isDirectory()).sort(); } catch { return []; }
}

module.exports = { BROWSE_STATE, xPost, secret, phoneTargets, tell, Reddit, blueskyFacets, blueskyPost, discordPost, engagement, newestClip, buildVideoKit, lastValue };
