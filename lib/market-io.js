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

  /** A sub's newest posts from its HTML listing (the JSON listings are blocked from this Mac). */
  async newPosts(sub) {
    if (++this.fetches > FETCH_BUDGET) throw new Error(`Reddit fetch budget (${FETCH_BUDGET}) used up for this run`);
    return this.run(`const res=await fetch(${JSON.stringify(`/r/${sub}/new/`)},{credentials:'include'}); const doc=new DOMParser().parseFromString(await res.text(),'text/html'); out=[...doc.querySelectorAll('#siteTable > .thing')].map(t=>({name:t.dataset.fullname, author:t.dataset.author||'', title:((t.querySelector('a.title')||{}).textContent||'').trim(), permalink:t.dataset.permalink, ts:Number(t.dataset.timestamp)||0, comments:Number(t.dataset.commentsCount)||0, self:/^self\\./.test(t.dataset.domain||''), nsfw:t.classList.contains('over18'), stickied:t.classList.contains('stickied'), locked:t.classList.contains('locked'), archived:t.classList.contains('archived')}))`);
  }

  /** One post's text and its top comments: {selftext, comments: [{author, body, score}]}. */
  async thread(permalink, limit = 6) {
    const r = await this.json(`${permalink.replace(/\/$/, '')}.json?limit=${limit}&depth=1&sort=top`);
    const post = r?.[0]?.data?.children?.[0]?.data || {};
    const comments = (r?.[1]?.data?.children || []).filter((c) => c.kind === 't1').map((c) => ({ author: c.data.author, body: String(c.data.body || '').slice(0, 700), score: c.data.score }));
    return { selftext: String(post.selftext || '').slice(0, 3000), comments };
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

/** Store a keychain item (vault/<scope>/<NAME>) the way ~/ai-stack/bin/secrets does: hex through `security -i`, never echoed. */
function storeSecret(name, value) {
  const r = spawnSync('security', ['-i'], { input: `add-generic-password -U -s "${name}" -a "${process.env.USER || 'me'}" -X ${Buffer.from(String(value)).toString('hex')}\n`, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`couldn't store ${name} in the keychain`);
}

// ─── YouTube Shorts (YouTube Data API v3, OAuth refresh token from bin/youtube-auth.js) ─────────────────────
//
// One upload costs 1,600 of the project's 10,000 daily quota units, so at most 6 a day; the loop does 1.
// Google's docs say uploads from an unaudited API project may be locked to private: the result is checked, and a
// locked upload is reported (fix: the free YouTube API audit form) instead of counting as posted.

async function youtubeToken({ scope = 'vault/botchelor' } = {}) {
  const id = secret(`${scope}/YOUTUBE_CLIENT_ID`);
  const sec = secret(`${scope}/YOUTUBE_CLIENT_SECRET`);
  const refresh = secret(`${scope}/YOUTUBE_REFRESH_TOKEN`);
  if (!id || !sec || !refresh) throw new Error(`no YouTube sign-in in the keychain (${scope}/YOUTUBE_CLIENT_ID, _CLIENT_SECRET, _REFRESH_TOKEN): run node bin/youtube-auth.js`);
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: id, client_secret: sec, refresh_token: refresh, grant_type: 'refresh_token' }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`YouTube sign-in failed (${j.error || r.status}${j.error === 'invalid_grant' ? ': the refresh token expired or was revoked; run node bin/youtube-auth.js again' : ''})`);
  return j.access_token;
}

/** Upload a vertical clip as a public Short with the AI (altered or synthetic) disclosure on: {url, name}. */
async function youtubeUpload({ video, title, description, tags = [] }) {
  const token = await youtubeToken();
  const bytes = fs.readFileSync(video);
  const meta = {
    snippet: { title, description, tags, categoryId: '24' },
    status: { privacyStatus: 'public', selfDeclaredMadeForKids: false, containsSyntheticMedia: true, embeddable: true },
  };
  const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-type': 'video/mp4', 'x-upload-content-length': String(bytes.length) },
    body: JSON.stringify(meta),
  });
  const where = start.headers.get('location');
  if (!start.ok || !where) throw new Error(`YouTube upload didn't start (${start.status}): ${(await start.text()).slice(0, 300)}`);
  const up = await fetch(where, { method: 'PUT', headers: { 'content-type': 'video/mp4', 'content-length': String(bytes.length) }, body: bytes });
  const v = await up.json().catch(() => ({}));
  if (!up.ok || !v.id) throw new Error(`YouTube upload failed (${up.status}): ${JSON.stringify(v.error || v).slice(0, 300)}`);
  const url = `https://www.youtube.com/shorts/${v.id}`;
  if (v.status?.privacyStatus && v.status.privacyStatus !== 'public') {
    throw new Error(`YouTube put the upload at "${v.status.privacyStatus}" (${url}): the API project needs YouTube's API audit before uploads can be public (https://support.google.com/youtube/contact/yt_api_form)`);
  }
  return { url, name: v.id };
}

// ─── Instagram Reels (a professional account, no Facebook Page needed) ────
//
// The video goes up straight from this Mac (resumable upload to rupload.facebook.com), so it needs no public URL.
// Two kinds of token work. An Instagram Login token ("IG…", graph.instagram.com) lasts 60 days, and each post
// refreshes it when it's over 20 days old. Meta's apps made since late 2026 only offer "Unified login" (Facebook Login
// for Business with an Instagram configuration): its system-user token ("EAA…", graph.facebook.com) never expires and
// needs the account's id in vault/botchelor/INSTAGRAM_USER_ID.

async function instagramToken({ scope = 'vault/botchelor' } = {}) {
  const name = `${scope}/INSTAGRAM_TOKEN`;
  const token = secret(name);
  if (!token) throw new Error(`no Instagram token in the keychain (${name})`);
  const born = Number(secret(`${scope}/INSTAGRAM_TOKEN_AT`) || 0);
  if (!token.startsWith('EAA') && Date.now() - born > 20 * 86_400_000) {
    const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.access_token) { storeSecret(name, j.access_token); storeSecret(`${scope}/INSTAGRAM_TOKEN_AT`, String(Date.now())); return j.access_token; }
  }
  return token;
}

/** Post a clip as a Reel with its caption: {url, name}. */
async function instagramReel({ video, caption }) {
  const token = await instagramToken();
  const fb = token.startsWith('EAA'); // a Unified-login (Facebook Login for Business) token
  const G = fb ? 'https://graph.facebook.com/v23.0' : 'https://graph.instagram.com/v23.0';
  const me = fb
    ? { user_id: secret('vault/botchelor/INSTAGRAM_USER_ID'), ...(await (await fetch(`${G}/${secret('vault/botchelor/INSTAGRAM_USER_ID')}?fields=username&access_token=${encodeURIComponent(token)}`)).json()) }
    : await (await fetch(`${G}/me?fields=user_id,username&access_token=${encodeURIComponent(token)}`)).json();
  if (!me.user_id || me.error) throw new Error(`Instagram didn't say who we are: ${JSON.stringify(me.error || me).slice(0, 200)}`);
  const c = await (await fetch(`${G}/${me.user_id}/media`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ media_type: 'REELS', upload_type: 'resumable', caption, share_to_feed: 'true', access_token: token }) })).json();
  if (!c.id || !c.uri) throw new Error(`Instagram didn't open an upload: ${JSON.stringify(c.error || c).slice(0, 200)}`);
  const bytes = fs.readFileSync(video);
  const up = await fetch(c.uri, { method: 'POST', headers: { authorization: `OAuth ${token}`, offset: '0', file_size: String(bytes.length) }, body: bytes });
  if (!up.ok) throw new Error(`Instagram upload failed (${up.status}): ${(await up.text()).slice(0, 200)}`);
  for (let i = 0; i < 40; i++) {
    const st = await (await fetch(`${G}/${c.id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`)).json();
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error(`Instagram couldn't process the video: ${st.status || st.status_code}`);
    await new Promise((r) => setTimeout(r, 15_000));
  }
  const pub = await (await fetch(`${G}/${me.user_id}/media_publish`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ creation_id: c.id, access_token: token }) })).json();
  if (!pub.id) throw new Error(`Instagram didn't publish the Reel: ${JSON.stringify(pub.error || pub).slice(0, 200)}`);
  const link = await (await fetch(`${G}/${pub.id}?fields=permalink&access_token=${encodeURIComponent(token)}`)).json().catch(() => ({}));
  return { url: link.permalink || `https://www.instagram.com/${me.username}/`, name: pub.id };
}

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
    if (m && !done.has(m[1]) && !done.has(m[1].toLowerCase())) return { episode: m[1], day: f.slice(0, 10), caption: txt.trim() };
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

/**
 * Every episode that already has a post kit in ${CLIPS}/posts (each kit's checklist.md links its episode), including
 * kits made by hand outside the queue: the daily kit must never cut a date that already has one (2026-11-11, a second
 * Kaede x Malachar kit two days after that date went out on TikTok).
 */
function madeKitEpisodes() {
  const out = new Set();
  for (const d of listPosts()) {
    try {
      const m = /\/episodes\/([0-9a-f-]{36})/i.exec(fs.readFileSync(path.join(CLIPS, 'posts', d, 'checklist.md'), 'utf8'));
      if (m) out.add(m[1].toLowerCase());
    } catch { /* a folder without a checklist */ }
  }
  return out;
}

/** The newest kit folder in ${CLIPS}/posts: {dir, video, caption, episode} or null. */
function latestKit() {
  const d = listPosts().slice(-1)[0];
  if (!d) return null;
  const dir = path.join(CLIPS, 'posts', d);
  try {
    const m = /\/episodes\/([0-9a-f-]{36})/i.exec(fs.readFileSync(path.join(dir, 'checklist.md'), 'utf8'));
    return { dir, video: path.join(dir, 'post.mp4'), caption: fs.readFileSync(path.join(dir, 'caption.txt'), 'utf8').trim(), episode: m ? m[1].toLowerCase() : null };
  } catch { return null; }
}

function listPosts() {
  try { return fs.readdirSync(path.join(CLIPS, 'posts')).filter((d) => fs.statSync(path.join(CLIPS, 'posts', d)).isDirectory()).sort(); } catch { return []; }
}

module.exports = { BROWSE_STATE, xPost, secret, storeSecret, youtubeUpload, instagramReel, latestKit, phoneTargets, tell, Reddit, blueskyFacets, blueskyPost, discordPost, engagement, newestClip, madeKitEpisodes, buildVideoKit, lastValue };
