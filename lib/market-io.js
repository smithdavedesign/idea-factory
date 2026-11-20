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
const { emit } = require('./events');
const M = require('./market');

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

// The browse CLI starts its server with `bun run server.ts`, looked up on PATH. launchd's PATH (the plist) has no
// ~/.bun/bin, so whenever the server wasn't already up (a reboot, a closed window, the interactive session that had
// started it ending), every Reddit and X step failed from 2026-11-11 to 11-12 ("Executable not found in $PATH: bun").
const BUN_BIN = path.join(process.env.BUN_INSTALL || path.join(HOME, '.bun'), 'bin');

/** The environment browse runs in: our state file, and bun on PATH. */
function browseEnv(env = process.env) {
  const dirs = String(env.PATH || '').split(':').filter(Boolean);
  return { ...env, PATH: (dirs.includes(BUN_BIN) ? dirs : [...dirs, BUN_BIN]).join(':'), BROWSE_STATE_FILE: BROWSE_STATE };
}

// detached: browse's server is a child of the CLI, so in the CLI's process group. launchd kills what's left of a
// job's process group when the job exits, which would close the browser at the end of every tick.
function browse(args, timeout = 60_000) {
  fs.mkdirSync(path.dirname(BROWSE_STATE), { recursive: true });
  const r = spawnSync(BROWSE, args, { encoding: 'utf8', timeout, detached: true, env: browseEnv() });
  return { ok: r.status === 0, out: String(r.stdout || ''), err: String(r.stderr || r.error || '') };
}

/** Why a browse call failed, in a line: its own last words, not a guess. */
function browseError(r) {
  if (/No active page/.test(r.out + r.err)) return 'it has no page open ("No active page")';
  const text = (r.err || r.out).trim().split('\n').map((l) => l.trim()).filter(Boolean).slice(-2).join(' ');
  return text.slice(-240) || 'no output';
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Whether a browse server answers on the port its state file records. Asked over HTTP instead of `browse status`:
 * with no server, every browse command except connect starts a headless browser first, only for us to stop it.
 */
async function serverUp() {
  let port;
  try { ({ port } = JSON.parse(fs.readFileSync(BROWSE_STATE, 'utf8'))); } catch { return false; }
  if (!port) return false;
  try {
    const r = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(3000) });
    return r.ok && (await r.json()).status === 'healthy';
  } catch { return false; }
}

/**
 * Start the headed browser from scratch. `browse stop` can't reach a server that died (a reboot, a closed window),
 * and `connect` then trusts the stale state file, so: stop it if it answers, kill the recorded server if its process
 * is still alive, drop the state file, and connect. Sign-ins live in the shared Chromium profile, so they survive.
 */
async function restartBrowser() {
  if (await serverUp()) browse(['stop'], 30_000);
  try {
    const { pid } = JSON.parse(fs.readFileSync(BROWSE_STATE, 'utf8'));
    // After a reboot the pid may belong to something else: only kill it if it's still a bun process.
    const comm = pid ? String(spawnSync('ps', ['-o', 'comm=', '-p', String(pid)], { encoding: 'utf8' }).stdout || '') : '';
    if (/\bbun$/m.test(comm.trim())) { try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ } }
  } catch { /* no state file */ }
  try { fs.rmSync(BROWSE_STATE, { force: true }); } catch { /* ignore */ }
  return browse(['connect'], 120_000);
}

/** True when the browser answers, is headed and has a page. */
async function browserHealthy() {
  if (!(await serverUp())) return false;
  const st = browse(['status']);
  return /Status:\s*healthy/.test(st.out) && /Mode:\s*headed/.test(st.out) && !/No active page/.test(st.out + st.err);
}

/** Who listens on a local TCP port, for an error line: "pid 45159 (bun)", or '' when nobody or lsof is missing. */
function portHolder(port) {
  const r = spawnSync('/usr/sbin/lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fpc'], { encoding: 'utf8', timeout: 5000 });
  const out = String(r.stdout || '');
  const pid = /^p(\d+)/m.exec(out);
  const comm = /^c(.+)/m.exec(out);
  return pid ? `pid ${pid[1]}${comm ? ` (${comm[1].trim()})` : ''}` : '';
}

// The folder launchd runs the loop from; browse's server keeps its starter's working folder.
const LOOP_DIR = process.env.MARKET_LOOP_DIR || path.resolve(__dirname, '..');

/**
 * Whether the server holding the browser port is a lost copy of OUR browser, safe to kill: a bun process working in
 * the loop's folder that our state file doesn't account for (gone, or naming another pid). Another session's headed
 * browse works in its own project folder, so it never matches and is never killed.
 */
function isStrayLoopServer({ pid, comm, cwd }, { loopDir = LOOP_DIR, recordedPid = null } = {}) {
  if (!pid || !/^bun$/.test(String(comm || '').trim())) return false;
  if (!cwd || path.resolve(cwd) !== path.resolve(loopDir)) return false;
  return Number(recordedPid) !== Number(pid);
}

/** {pid, comm, cwd} of whoever listens on a local TCP port, or null. */
function portListener(port) {
  const r = spawnSync('/usr/sbin/lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fpc'], { encoding: 'utf8', timeout: 5000 });
  const pid = /^p(\d+)/m.exec(String(r.stdout || ''));
  if (!pid) return null;
  const comm = /^c(.+)/m.exec(String(r.stdout || ''));
  const c = spawnSync('/usr/sbin/lsof', ['-a', '-p', pid[1], '-d', 'cwd', '-Fn'], { encoding: 'utf8', timeout: 5000 });
  const cwd = /^n(.+)/m.exec(String(c.stdout || ''));
  return { pid: Number(pid[1]), comm: comm ? comm[1].trim() : '', cwd: cwd ? cwd[1].trim() : '' };
}

/**
 * Kill a lost copy of our browser that holds `port`. It happened 2026-11-15 and 11-17: the loop's own bun server
 * outlived its state file, so nothing could reach it or replace it, and every browser step failed for hours until
 * someone killed it by hand. Returns the killed pid, or null when the holder isn't ours.
 */
async function freeStrayPort(port) {
  const who = portListener(port);
  let recordedPid = null;
  try { recordedPid = JSON.parse(fs.readFileSync(BROWSE_STATE, 'utf8')).pid; } catch { /* no state file */ }
  if (!who || !isStrayLoopServer(who, { recordedPid })) return null;
  try { process.kill(who.pid, 'SIGTERM'); } catch { return null; }
  for (let i = 0; i < 20 && portListener(port); i++) await sleep(500);
  if (portListener(port)?.pid === who.pid) { try { process.kill(who.pid, 'SIGKILL'); } catch { /* gone */ } await sleep(1000); }
  return who.pid;
}

/**
 * A headed browser that answers, restarted once if it's stuck. Throws why it won't start, naming who holds the port
 * when that is why: gstack's `browse connect` pins port 34567 for every headed browser on this Mac, so another
 * session's headed browser blocks ours for as long as it runs (2026-11-13 12:32 to at least 11-14, every browser step).
 */
async function headedBrowser() {
  if (await browserHealthy()) return;
  const c = await restartBrowser();
  if (c.ok) return;
  let why = browseError(c);
  let port = /Port (\d+) .*is in use/.exec(why);
  if (port) {
    const killed = await freeStrayPort(port[1]);
    if (killed) {
      emit({ component: 'market', event: 'browser', status: 'warn', message: `killed a lost copy of the marketing browser (pid ${killed}) that held port ${port[1]}, then restarted it` });
      const again = await restartBrowser();
      if (again.ok) return;
      why = browseError(again);
      port = /Port (\d+) .*is in use/.exec(why);
    }
  }
  const holder = port && portHolder(port[1]);
  if (holder) why += `; port ${port[1]} is held by ${holder}, another session's headed browse (gstack pins this port for every one): once it's gone the loop reconnects on its next run`;
  throw new Error(`the automated browser won't start: ${why}`);
}

/** The last JSON value printed by `browse js`, or the raw text. */
function lastValue(out) {
  const lines = out.trim().split('\n').filter((l) => l.trim() && !/^---\s*(BEGIN|END) UNTRUSTED/.test(l));
  return lines.length ? lines[lines.length - 1] : '';
}

/** A page fetch's {s: status, t: text} as Reddit's JSON answer; throws "Reddit blocked this request" on a web page. */
function answerOf(r, opts) {
  const a = M.redditAnswer(r?.s, r?.t, opts);
  if (!a.ok) throw new Error(a.message);
  return a.value;
}

class Reddit {
  constructor({ account }) { this.account = account; this.fetches = 0; this.ready = false; }

  /** A healthy headed browser on old.reddit.com, signed in as our account. Throws a plain reason otherwise. */
  async ensure() {
    if (this.ready) return;
    await headedBrowser();
    let go = browse(['goto', 'https://old.reddit.com/'], 90_000);
    if (!go.ok || /No active page/.test(go.out + go.err)) {
      const c = await restartBrowser();
      if (!c.ok) throw new Error(`the automated browser won't start: ${browseError(c)}`);
      go = browse(['goto', 'https://old.reddit.com/'], 90_000);
    }
    if (!go.ok || /No active page/.test(go.out + go.err)) throw new Error(`the automated browser won't open Reddit even after a restart: ${browseError(go)}`);
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

  /**
   * GET a Reddit JSON path from the page (counts against the run's budget). The page hands back the status and the
   * raw text, and M.redditAnswer reads it: an HTML answer (Reddit's "blocked by network security" 403) throws
   * "Reddit blocked this request", which the loop retries next run instead of failing on `Unexpected token '<'`.
   */
  async json(p) {
    if (++this.fetches > FETCH_BUDGET) throw new Error(`Reddit fetch budget (${FETCH_BUDGET}) used up for this run`);
    const r = await this.run(`const r=await fetch(${JSON.stringify(p)},{credentials:'include'}); out={s:r.status,t:await r.text()}`);
    return answerOf(r);
  }

  /** POST a form to a Reddit API path with our modhash. */
  async post(p, params) {
    if (++this.fetches > FETCH_BUDGET) throw new Error(`Reddit fetch budget (${FETCH_BUDGET}) used up for this run`);
    const form = { ...params, uh: this.modhash, api_type: 'json' };
    const r = await this.run(`const r=await fetch(${JSON.stringify(p)},{method:'POST',credentials:'include',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(${JSON.stringify(form)}).toString()}); out={s:r.status,t:await r.text()}`);
    return answerOf(r, { post: true });
  }

  /** A sub's HTML listing read in the page: its things, or "Reddit blocked this request" when the page is a block. */
  async listing(url, pick) {
    if (++this.fetches > FETCH_BUDGET) throw new Error(`Reddit fetch budget (${FETCH_BUDGET}) used up for this run`);
    const r = await this.run(`const res=await fetch(${JSON.stringify(url)},{credentials:'include'}); const html=await res.text(); const doc=new DOMParser().parseFromString(html,'text/html'); out={s:res.status, blocked:/blocked by network security/i.test(html)&&!doc.querySelector('#siteTable'), things:[...doc.querySelectorAll('#siteTable > .thing')].map(t=>(${pick}))}`);
    if (r?.blocked || r?.s === 403 || r?.s === 429) throw new Error(M.redditAnswer(r.s, r.blocked ? 'blocked by network security' : '<html>').message);
    return r?.things || [];
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
    const things = (await this.listing(`/r/${sub}/`, `{name:t.dataset.fullname, stickied:t.classList.contains('stickied'), locked:t.classList.contains('locked'), archived:t.classList.contains('archived'), title:((t.querySelector('a.title')||{}).textContent||'').trim(), permalink:t.dataset.permalink, ts:Number(t.dataset.timestamp)||0}`)).slice(0, 10);
    const re = new RegExp(match, 'i');
    const pick = things.find((d) => d.stickied && !d.locked && !d.archived && re.test(d.title) && (!d.ts || Date.now() - d.ts < 45 * 86_400_000));
    return pick ? { name: pick.name, title: pick.title, permalink: `https://www.reddit.com${pick.permalink}` } : null;
  }

  /** A sub's newest posts from its HTML listing (the JSON listings are blocked from this Mac). */
  async newPosts(sub) {
    return this.listing(`/r/${sub}/new/`, `{name:t.dataset.fullname, author:t.dataset.author||'', title:((t.querySelector('a.title')||{}).textContent||'').trim(), permalink:t.dataset.permalink, ts:Number(t.dataset.timestamp)||0, comments:Number(t.dataset.commentsCount)||0, self:/^self\\./.test(t.dataset.domain||''), nsfw:t.classList.contains('over18'), stickied:t.classList.contains('stickied'), locked:t.classList.contains('locked'), archived:t.classList.contains('archived')}`);
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
    if (!d) return { removed: 'not found', score: null, comments: null };
    return { removed: d.removed_by_category || (d.banned_by ? 'removed' : null), score: d.score ?? null, comments: d.num_comments ?? null };
  }

  /** The newest inbox entries (comment replies, mentions, messages). */
  async inbox() {
    const r = await this.json('/message/inbox.json?limit=25');
    return r?.data?.children || [];
  }
}

// ─── X, through the same signed-in browser (X's API costs money) ───────────────────────────────────────────

/** The page's value of a JS expression (synchronous expressions only). */
function pageValue(expr) {
  return lastValue(browse(['js', expr]).out);
}

/**
 * Attach a picture through a composer's file input, in the browser (gstack `browse upload`): `findInput` is a page
 * expression that returns the composer's <input type=file> (it gets a marker attribute so upload can name it), and
 * `attached` one that is true once the composer shows the picture. Returns {ok: true, how: 'attached'} or
 * {ok: false, error}; never throws, so a picture that won't attach never costs the post.
 */
async function attachInBrowser(file, { findInput, attached, waitMs = 30_000 }) {
  try {
    if (!file || !fs.existsSync(file)) return { ok: false, error: `no picture file (${file || 'none'})` };
    const marked = pageValue(`(()=>{const i=(${findInput}); if(!i) return 'no file input'; i.setAttribute('data-mk-upload','1'); return 'ok'})()`);
    if (marked !== 'ok') return { ok: false, error: `the composer has no file input (${marked || 'no answer'})` };
    const up = browse(['upload', '[data-mk-upload="1"]', file], 60_000);
    if (!up.ok) return { ok: false, error: `upload failed: ${browseError(up)}` };
    const until = Date.now() + waitMs;
    while (Date.now() < until) {
      await sleep(1500);
      if (pageValue(`(()=>{try{return (${attached})?'yes':'no'}catch(e){return 'no'}})()`) === 'yes') return { ok: true, how: 'attached' };
    }
    return { ok: false, error: `the composer didn't show the picture within ${Math.round(waitMs / 1000)} s` };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 200) };
  }
}

// X's composer: the file input in the same composer as the text box, and its picture previews.
const X_INPUT = "(()=>{let n=document.querySelector('[data-testid=tweetTextarea_0]'); while(n&&!n.querySelector('input[data-testid=fileInput]')) n=n.parentElement; return n?n.querySelector('input[data-testid=fileInput]'):document.querySelector('[role=dialog] input[data-testid=fileInput]')})()";
const X_ATTACHED = "!!document.querySelector('[data-testid=attachments] img, [data-testid=attachments] [style*=\"blob:\"]')";

/**
 * Post `text` as the signed-in X account: type it into the composer line by line, check it reads back exactly,
 * attach the picture when there is one, click Post, then find the new post's URL on the profile. Returns {url, name,
 * image?}: `image` says whether the picture went with it ({ok, how} or {ok: false, error}).
 */
async function xPost(text, handle, { image } = {}) {
  await headedBrowser();
  const go = browse(['goto', 'https://x.com/compose/post'], 90_000);
  if (!go.ok) throw new Error(`couldn't open X's composer: ${browseError(go)}`);
  await sleep(2500);
  if (/\/login|\/i\/flow\/login/.test(pageValue('location.href'))) throw new Error('the automated browser isn\'t signed in to X');
  browse(['wait', '[data-testid="tweetTextarea_0"]'], 30_000);
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  const clear = () => { browse(['press', 'Meta+a']); browse(['press', 'Backspace']); };
  // Two tries: the composer sometimes drops or mangles keystrokes (2026-11-12 the read-back missed once, then matched
  // exactly when typed again), and one bad read shouldn't cost the day's post.
  let got = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) { clear(); await sleep(2000); }
    browse(['js', "document.querySelector('[data-testid=tweetTextarea_0]').focus(); 1"]);
    const lines = String(text).split('\n');
    lines.forEach((line, i) => {
      if (line) browse(['type', line], 60_000);
      if (i < lines.length - 1) browse(['press', 'Enter']);
    });
    await sleep(1500);
    got = '';
    try { got = JSON.parse(pageValue("JSON.stringify(document.querySelector('[data-testid=tweetTextarea_0]').innerText)")); } catch {}
    if (norm(got) === norm(text)) break;
  }
  if (norm(got) !== norm(text)) {
    clear();
    throw new Error('X\'s composer didn\'t take the text exactly (tried twice); nothing was posted');
  }
  let pic = null;
  if (image?.file) {
    pic = await attachInBrowser(image.file, { findInput: X_INPUT, attached: X_ATTACHED });
    if (!pic.ok) {
      // Whatever got half-attached comes off, and the text goes out on its own.
      pageValue("(()=>{for(const b of document.querySelectorAll('[data-testid=attachments] [aria-label=\"Remove media\"], [data-testid=attachments] button[aria-label*=Remove]')) b.click(); return 1})()");
      await sleep(1000);
    }
    // The picture must not have changed the text: read it back again.
    let again = '';
    try { again = JSON.parse(pageValue("JSON.stringify(document.querySelector('[data-testid=tweetTextarea_0]').innerText)")); } catch {}
    if (norm(again) !== norm(text)) { clear(); throw new Error('X\'s composer text changed while attaching the picture; nothing was posted'); }
  }
  // The Post button stays disabled while a picture uploads.
  let clicked = 'disabled';
  for (let i = 0; i < (pic?.ok ? 20 : 1); i++) {
    clicked = pageValue("(()=>{const b=document.querySelector('[data-testid=tweetButton]'); if(!b||b.getAttribute('aria-disabled')==='true') return 'disabled'; b.click(); return 'ok'})()");
    if (clicked === 'ok') break;
    await sleep(1500);
  }
  if (clicked !== 'ok') throw new Error(`X's Post button was ${clicked}; nothing was posted`);
  await sleep(5000);
  // The profile can lag behind the post: read it until the newest post is this one. The first post with a time used to
  // be taken as ours, so #51 (2026-11-16) was logged with #46's URL from four hours earlier.
  for (let attempt = 0; attempt < 4; attempt++) {
    browse(['goto', `https://x.com/${handle}`], 90_000);
    await sleep(3000 + attempt * 2000);
    let articles = [];
    try {
      articles = JSON.parse(pageValue(`JSON.stringify([...document.querySelectorAll('article')].slice(0,6).map(a=>{const l=[...a.querySelectorAll('a[href*="/status/"]')].find(x=>x.querySelector('time')); return {url:l?l.href:'', pinned:!!a.querySelector('[data-testid=socialContext]')&&/pinned/i.test(a.querySelector('[data-testid=socialContext]').innerText), text:a.innerText}}))`)) || [];
    } catch {}
    const url = newPostUrl(articles, text);
    if (url) return { url, name: url.split('/status/')[1], ...(pic ? { image: pic } : {}) };
  }
  // Posted (the button took it) but not found on the profile yet: say so with the profile, never another post's URL.
  return { url: `https://x.com/${handle}`, name: null, ...(pic ? { image: pic } : {}) };
}

/**
 * The URL of the post we just made among a profile's newest posts (pure), or '' when it isn't there yet. A post is ours
 * when its text holds the start of what we typed, links left out (X shows them shortened). Pinned posts don't count.
 */
function newPostUrl(articles, text) {
  const words = (s) => String(s || '').replace(/https?:\/\/\S+/g, ' ').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim();
  const start = words(text).slice(0, 60);
  if (!start) return '';
  const ours = (articles || []).find((a) => a && !a.pinned && a.url && /\/status\/\d+/.test(a.url) && words(a.text).includes(start));
  return ours ? ours.url : '';
}

/**
 * Post `text` as the signed-in Threads account (David 2026-11-15: Threads in the daily loop). Threads' composer is a
 * Lexical editor that ignores typed newlines, so the text goes in as one synthetic paste over a full selection, is read
 * back and must match exactly before Post is clicked; then the new post's URL is read off the profile. Returns {url, name}.
 */
async function threadsPost(text, handle, { image } = {}) {
  const state = { imported: false };
  try {
    return await threadsPostOnce(text, handle, state, image);
  } finally {
    // Once cookies are imported, gstack refuses `js` on every other domain for the browser's life ("prevents
    // cross-origin cookie exfiltration"), which would break the Reddit/X/YouTube/Instagram steps after this one
    // (found 2026-11-15). A restart clears that guard; the copied Threads sign-in goes with it and is copied again
    // next time.
    if (state.imported) await restartBrowser().catch(() => {});
  }
}

// Threads' composer dialog: its file input (behind the "Attach media" button) and a picture preview in it.
const THREADS_INPUT = "(document.querySelector('[role=dialog] input[type=file]')||document.querySelector('input[type=file][accept*=image]'))";
const threadsAttached = (before) => `[...document.querySelectorAll('[role=dialog] img')].filter(i=>/^blob:/.test(i.src)||i.naturalWidth>200).length>${before}`;

async function threadsPostOnce(text, handle, state, image) {
  await headedBrowser();
  const go = browse(['goto', `https://www.threads.com/@${handle}`], 90_000);
  if (!go.ok) throw new Error(`couldn't open Threads: ${browseError(go)}`);
  await sleep(4000);
  const signedInJs = `(()=>{const p=[...document.querySelectorAll('a')].find(a=>a.getAttribute('href')==='/@${handle}'&&/Profile/i.test(a.getAttribute('aria-label')||a.innerText||'')); const login=[...document.querySelectorAll('a,div[role=button]')].some(x=>x.innerText&&x.innerText.trim()==='Log in'); return login?'no':(p?'yes':'unknown')})()`;
  let signedIn = pageValue(signedInJs);
  if (signedIn === 'no') {
    // The sign-in was copied from David's Chrome (cookie-import-browser) and doesn't survive a browser restart
    // (2026-11-15), so copy it again once. The leading dot matters: `threads.com` imports 0 cookies.
    state.imported = true;
    browse(['cookie-import-browser', 'chrome', '--domain', '.threads.com']);
    browse(['goto', `https://www.threads.com/@${handle}`], 90_000);
    await sleep(4000);
    signedIn = pageValue(signedInJs);
  }
  if (signedIn === 'no') throw new Error('the automated browser isn\'t signed in to Threads (sign in to threads.com in Chrome and it copies the sign-in next run)');
  const before = pageValue(`[...document.querySelectorAll('a[href*="/@${handle}/post/"]')].map(a=>a.getAttribute('href').split('/post/')[1].split('/')[0]).join(',')`) || '';
  const opened = pageValue(`(()=>{const b=[...document.querySelectorAll('div,span')].find(x=>x.childElementCount===0&&/^What.s new\\?$/.test((x.innerText||'').trim())); if(!b) return 'no composer'; b.click(); return 'ok'})()`);
  if (opened !== 'ok') throw new Error(`couldn't open Threads' composer (${opened})`);
  await sleep(2500);
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  const put = pageValue(`(()=>{const e=document.querySelector('[role=dialog] [contenteditable=true]'); if(!e) return 'no editor'; e.focus(); const r=document.createRange(); r.selectNodeContents(e); const s=getSelection(); s.removeAllRanges(); s.addRange(r); const dt=new DataTransfer(); dt.setData('text/plain', ${JSON.stringify(String(text))}); e.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})); return 'ok'})()`);
  if (put !== 'ok') throw new Error(`couldn't put the text in Threads' composer (${put})`);
  await sleep(1500);
  let got = '';
  try { got = JSON.parse(pageValue("JSON.stringify((document.querySelector('[role=dialog] [contenteditable=true]')||{}).innerText||'')")); } catch {}
  if (norm(got) !== norm(text)) throw new Error('Threads\' composer didn\'t take the text exactly; nothing was posted');
  let pic = null;
  if (image?.file) {
    const before = Number(pageValue("[...document.querySelectorAll('[role=dialog] img')].filter(i=>/^blob:/.test(i.src)||i.naturalWidth>200).length")) || 0;
    pic = await attachInBrowser(image.file, { findInput: THREADS_INPUT, attached: threadsAttached(before) });
    if (!pic.ok) {
      // Threads' remove control is a role=button holding an svg titled "Remove" (2026-11-19).
      pageValue("(()=>{const d=document.querySelector('[role=dialog]'); for(const t of (d?d.querySelectorAll('svg title'):[])) if(/^Remove$/i.test(t.textContent.trim())) (t.closest('[role=button]')||t.parentElement).click(); return 1})()");
      await sleep(1000);
    }
    let again = '';
    try { again = JSON.parse(pageValue("JSON.stringify((document.querySelector('[role=dialog] [contenteditable=true]')||{}).innerText||'')")); } catch {}
    if (norm(again) !== norm(text)) throw new Error('Threads\' composer text changed while attaching the picture; nothing was posted');
  }
  let clicked = 'disabled';
  for (let i = 0; i < (pic?.ok ? 20 : 1); i++) {
    clicked = pageValue("(()=>{const d=document.querySelector('[role=dialog]'); const b=d&&[...d.querySelectorAll('div[role=button],button')].filter(x=>x.innerText.trim()==='Post').pop(); if(!b||b.getAttribute('aria-disabled')==='true') return 'disabled'; b.click(); return 'ok'})()");
    if (clicked === 'ok') break;
    await sleep(1500);
  }
  if (clicked !== 'ok') throw new Error(`Threads' Post button was ${clicked}; nothing was posted`);
  await sleep(8000);
  browse(['goto', `https://www.threads.com/@${handle}`], 90_000);
  await sleep(4000);
  const ids = (pageValue(`[...document.querySelectorAll('a[href*="/@${handle}/post/"]')].map(a=>a.getAttribute('href').split('/post/')[1].split('/')[0]).join(',')`) || '').split(',').filter(Boolean);
  const seen = new Set(before.split(',').filter(Boolean));
  const id = ids.find((i) => !seen.has(i)) || null;
  return { url: id ? `https://www.threads.com/@${handle}/post/${id}` : `https://www.threads.com/@${handle}`, name: id, ...(pic ? { image: pic } : {}) };
}

// ─── TikTok, through the same signed-in browser (TikTok Studio's web upload) ───────────────────────────────
//
// TikTok's Content Posting API needs an audited app before posts can be public, so the loop posts through TikTok
// Studio in the marketing browser, signed in as @botchelorcom (David 2026-11-19: TikTok daily, like Shorts and Reels;
// it had lapsed while each kit waited for him to upload it by hand). Mapped on 2026-11-19.

const TT_UPLOAD = 'https://www.tiktok.com/tiktokstudio/upload';
const TT_CONTENT = 'https://www.tiktok.com/tiktokstudio/content';
const TT_PRIVACY = /^(Everyone|Friends|Followers|Only you)$/;

/** TikTok Studio's count ("62", "1.2K", "3M", "1,204") as a number (pure); NaN when it isn't one. */
function tiktokCount(s) {
  const m = /^([\d.,]+)\s*([KMB])?$/i.exec(String(s ?? '').trim());
  if (!m) return NaN;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * ({ k: 1e3, m: 1e6, b: 1e9 }[(m[2] || '').toLowerCase()] || 1)) : NaN;
}

/**
 * One post's numbers from its row on TikTok Studio's content page (pure). A row reads "<length>\n<caption>\n<date>\n
 * <who can watch>\n<views>\n<likes>\n<comments>…"; null when it has no such run.
 */
function tiktokRowStats(text) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!TT_PRIVACY.test(lines[i])) continue;
    const [views, likes, comments] = lines.slice(i + 1, i + 4).map(tiktokCount);
    if ([views, likes, comments].every(Number.isFinite)) return { views, likes, comments };
  }
  return null;
}

const ttWords = (s) => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const ttId = (href) => /\/video\/(\d+)/.exec(String(href || ''))?.[1] || null;

/**
 * The id of the post we just made among the content page's rows, newest first (pure): the first row whose text holds
 * the start of our caption (the page shows it on one line), skipping ids that were listed before we posted; null
 * when it isn't listed yet.
 */
function tiktokNewPost(rows, caption, before = []) {
  const start = ttWords(caption).slice(0, 60);
  if (!start) return null;
  const seen = new Set(before);
  for (const r of rows || []) {
    const id = ttId(r?.href);
    if (id && !seen.has(id) && ttWords(r.text).includes(start)) return id;
  }
  return null;
}

// The content page's rows as [{href, text}]: each video link with the text of the smallest box around it that holds
// a "who can watch" line (its row); text '' when there is none, so a row's numbers never come from its neighbour.
const TT_ROWS = `JSON.stringify((()=>{const out=[], seen=new Set(); for(const a of document.querySelectorAll('a[href*="/video/"]')){ if(seen.has(a.href)) continue; seen.add(a.href); let r=a, ok=false; for(let i=0;i<10&&r.parentElement;i++){ r=r.parentElement; if(/\\n(Everyone|Friends|Followers|Only you)\\n/.test(r.innerText||'')){ok=true; break;} } out.push({href:a.href, text: ok?(r.innerText||'').slice(0,3000):''}); } return out })())`;
// A leaf element whose whole text matches `re` (a regex literal, as source).
const ttLeaf = (re) => `[...document.querySelectorAll('div,span,label,button,p')].find(e=>e.childElementCount===0&&${re}.test((e.innerText||'').trim()))`;
const TT_EDITOR = "document.querySelector('.public-DraftEditor-content')";
const TT_AI_SWITCH = `(()=>{let r=${ttLeaf('/^AI-generated content$/')}; while(r&&!r.querySelector('input[type=checkbox]')) r=r.parentElement; return r?r.querySelector('input[type=checkbox]'):null})()`;
const TT_COVER_DIALOG = "[...document.querySelectorAll('[role=dialog]')].find(x=>/Edit cover/.test(x.innerText||''))";

/**
 * Go to `url`, even from TikTok's upload page: its "leave site?" prompt is refused by the headed browser (gstack
 * dismisses dialogs in headed mode), which would keep every later step of the run on that page.
 */
function ttGoto(url) {
  browse(['dialog-accept']);
  try { return browse(['goto', url], 90_000); } finally { browse(['dialog-dismiss']); }
}

const ttRows = () => { try { return JSON.parse(pageValue(TT_ROWS)) || []; } catch { return []; } };

/**
 * Post a video kit to TikTok as the signed-in account: upload the video, paste the caption and check it reads back
 * exactly, turn on TikTok's "AI-generated content" label (no label, no post), set the kit's cover, click Post, and
 * read the new post's URL off the content page. Returns {url, name, image?}; `dryRun` stops short of Post and throws
 * the draft away ({dryRun: true, image?}).
 */
async function tiktokPost({ video, caption, cover, handle = 'botchelorcom', dryRun = false }) {
  const state = { imported: false, opened: false, file: null };
  try {
    return await tiktokPostOnce({ video, caption, cover, handle, dryRun }, state);
  } finally {
    if (state.file) { try { fs.rmSync(state.file, { force: true }); } catch { /* ignore */ } }
    // Never leave the run on a half-made post: its leave prompt would block the next step's navigation.
    if (state.opened && (await serverUp()) && /tiktokstudio\/upload/.test(pageValue('location.href'))) ttGoto(TT_CONTENT);
    // A cookie import makes gstack refuse `js` on every other site until the browser restarts (see threadsPost).
    if (state.imported) await restartBrowser().catch(() => {});
  }
}

async function tiktokPostOnce({ video, caption, cover, handle, dryRun }, state) {
  if (!video || !fs.existsSync(video)) throw new Error(`no video file (${video || 'none'})`);
  if (!String(caption || '').trim()) throw new Error('no caption');
  await headedBrowser();
  // The content page first: are we signed in, and which posts are already there (so ours is told apart).
  const openContent = async () => {
    const go = ttGoto(TT_CONTENT);
    if (!go.ok) throw new Error(`couldn't open TikTok Studio: ${browseError(go)}`);
    state.opened = true;
    // Signed out, TikTok sends the page to /login or shows a "Log in" button; signed in, the posts are listed.
    for (let i = 0; i < 10; i++) {
      await sleep(1500);
      const at = pageValue(`(()=>{if(/\\/login/.test(location.pathname)||${ttLeaf('/^Log in$/')}) return 'login'; return document.querySelector('a[href*="/video/"]')?'ready':'wait'})()`);
      if (at !== 'wait') return at;
    }
    return 'empty';
  };
  let at = await openContent();
  if (at === 'login') {
    // The sign-in was copied from David's Chrome (cookie-import-browser). The leading dot matters: `tiktok.com`
    // imports 0 cookies, `.tiktok.com` the shared ones, `www.tiktok.com` the rest (2026-11-19).
    state.imported = true;
    browse(['cookie-import-browser', 'chrome', '--domain', '.tiktok.com']);
    browse(['cookie-import-browser', 'chrome', '--domain', 'www.tiktok.com']);
    at = await openContent();
  }
  if (at === 'login') throw new Error(`the automated browser isn't signed in to TikTok (sign in at tiktok.com in Chrome as @${handle} and it copies the sign-in next run)`);
  const before = ttRows().map((r) => ttId(r.href)).filter(Boolean);

  const go = ttGoto(TT_UPLOAD);
  if (!go.ok) throw new Error(`couldn't open TikTok's upload page: ${browseError(go)}`);
  let ready = false;
  for (let i = 0; i < 15 && !ready; i++) { await sleep(1500); ready = pageValue(`!!document.querySelector('input[type=file][accept="video/*"]')`) === 'true'; }
  if (!ready) throw new Error('TikTok\'s upload page has no file picker; nothing was posted');
  // gstack's `browse upload` only takes files under /tmp (or its own folder).
  const { MEDIA_TMP } = require('./market-media');
  fs.mkdirSync(MEDIA_TMP, { recursive: true });
  state.file = path.join(MEDIA_TMP, `tiktok-${path.basename(path.dirname(video))}.mp4`);
  fs.copyFileSync(video, state.file);
  const up = browse(['upload', 'input[type=file][accept="video/*"]', state.file], 180_000);
  if (!up.ok) throw new Error(`TikTok didn't take the video file: ${browseError(up)}`);
  // Uploaded once the page says "Uploaded（9.6MB）" and the caption box is there.
  let uploaded = false;
  for (let i = 0; i < 60 && !uploaded; i++) {
    await sleep(3000);
    uploaded = pageValue(`(()=>{const done=${ttLeaf('/^Uploaded/')}; return done&&${TT_EDITOR}?'yes':'no'})()`) === 'yes';
  }
  if (!uploaded) throw new Error('TikTok didn\'t finish uploading the video within 3 minutes; nothing was posted');

  // The caption: TikTok fills in the file name. A selection alone isn't replaced, so clear it with the keyboard, then
  // paste (Draft.js keeps a paste's line breaks; typed Enter can pick a hashtag suggestion instead).
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  const readCaption = () => { try { return JSON.parse(pageValue(`JSON.stringify((${TT_EDITOR}||{}).innerText||'')`)); } catch { return ''; } };
  let got = '';
  for (let attempt = 0; attempt < 2 && norm(got) !== norm(caption); attempt++) {
    pageValue(`(()=>{const e=${TT_EDITOR}; if(e) e.focus(); return 1})()`);
    browse(['press', 'Meta+a']);
    browse(['press', 'Backspace']);
    await sleep(800);
    pageValue(`(()=>{const e=${TT_EDITOR}; if(!e) return 'no editor'; e.focus(); const dt=new DataTransfer(); dt.setData('text/plain', ${JSON.stringify(String(caption).trim())}); e.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})); return 'ok'})()`);
    await sleep(1500);
    got = readCaption();
  }
  if (norm(got) !== norm(caption)) throw new Error('TikTok\'s caption box didn\'t take the caption exactly (tried twice); nothing was posted');

  // TikTok's own AI-generated label (under "Show more"); turning it on asks to confirm.
  pageValue(`(()=>{const x=${ttLeaf('/^Show more$/')}; if(x) x.click(); return 1})()`);
  await sleep(1500);
  let ai = pageValue(`(()=>{const c=${TT_AI_SWITCH}; if(!c) return 'not found'; if(c.checked) return 'on'; c.click(); return 'clicked'})()`);
  if (ai === 'clicked') {
    for (let i = 0; i < 6; i++) {
      await sleep(1000);
      if (pageValue(`(()=>{const d=[...document.querySelectorAll('[role=dialog]')].find(x=>/AI-generated/i.test(x.innerText||'')); const b=d&&[...d.querySelectorAll('button')].find(x=>/^Turn on$/.test((x.innerText||'').trim())); if(!b) return 'no'; b.click(); return 'ok'})()`) === 'ok') break;
    }
    await sleep(1500);
    ai = pageValue(`(()=>{const c=${TT_AI_SWITCH}; return c&&c.checked?'on':'off'})()`);
  }
  if (ai !== 'on') throw new Error(`couldn't turn on TikTok's AI-generated content label (${ai}); nothing was posted`);

  const pic = cover ? await tiktokCover(cover) : null;
  if (norm(readCaption()) !== norm(caption)) throw new Error('TikTok\'s caption changed while setting the cover; nothing was posted');

  if (dryRun) {
    pageValue(`(()=>{const b=document.querySelector('button[data-e2e="discard_post_button"]'); if(b) b.click(); return 1})()`);
    await sleep(1500);
    pageValue(`(()=>{const d=[...document.querySelectorAll('[role=dialog]')].pop(); const b=d&&[...d.querySelectorAll('button')].find(x=>/^Discard$/.test((x.innerText||'').trim())); if(b) b.click(); return 1})()`);
    await sleep(1500);
    return { url: null, name: null, dryRun: true, ...(pic ? { image: pic } : {}) };
  }

  // Post is disabled while TikTok checks the video; it waits up to two minutes.
  let clicked = 'disabled';
  for (let i = 0; i < 40; i++) {
    clicked = pageValue(`(()=>{const b=document.querySelector('button[data-e2e="post_video_button"]'); if(!b) return 'missing'; if(b.disabled||b.getAttribute('aria-disabled')==='true') return 'disabled'; b.click(); return 'ok'})()`);
    if (clicked === 'ok') break;
    await sleep(3000);
  }
  if (clicked !== 'ok') throw new Error(`TikTok's Post button was ${clicked}; nothing was posted`);
  // A "post now?" question can follow (when TikTok's checks are still running): answer it, until the page moves on.
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const st = pageValue(`(()=>{if(!/tiktokstudio\\/upload/.test(location.pathname)) return 'left'; const d=[...document.querySelectorAll('[role=dialog]')].pop(); const b=d&&[...d.querySelectorAll('button')].find(x=>/^Post( now)?$/.test((x.innerText||'').trim())); if(b){b.click(); return 'confirmed'} return 'wait'})()`);
    if (st === 'left') break;
  }
  // The content page can lag behind the post: read it until ours is listed.
  for (let attempt = 0; attempt < 5; attempt++) {
    ttGoto(TT_CONTENT);
    await sleep(4000 + attempt * 3000);
    const id = tiktokNewPost(ttRows(), caption, before);
    if (id) return { url: `https://www.tiktok.com/@${handle}/video/${id}`, name: id, ...(pic ? { image: pic } : {}) };
  }
  // Posted (the button took it) but not listed yet: say so with the profile, never another post's URL.
  return { url: `https://www.tiktok.com/@${handle}`, name: null, ...(pic ? { image: pic } : {}) };
}

/**
 * Set the cover from a picture file in TikTok's "Edit cover" dialog: Upload cover, then Save. Returns {ok: true, how:
 * 'cover'} or {ok: false, error}; never throws, so a cover that won't take never costs the post (the platform then
 * uses the video's first frame, which the kits make a title card).
 */
async function tiktokCover(file) {
  const close = () => pageValue(`(()=>{const d=${TT_COVER_DIALOG}; if(!d) return 'gone'; const b=[...d.querySelectorAll('button')].find(x=>/^(Cancel|Close)$/.test((x.innerText||'').trim())||/close/i.test(x.getAttribute('aria-label')||'')); if(b) b.click(); return 'closed'})()`);
  try {
    if (!file || !fs.existsSync(file)) return { ok: false, error: `no cover file (${file || 'none'})` };
    if (pageValue(`(()=>{const x=${ttLeaf('/^Edit cover$/')}; if(!x) return 'no'; x.click(); return 'ok'})()`) !== 'ok') return { ok: false, error: 'no "Edit cover" button' };
    await sleep(2500);
    if (pageValue(`(()=>{const x=${ttLeaf('/^Upload cover$/')}; if(!x) return 'no'; x.click(); return 'ok'})()`) !== 'ok') { close(); return { ok: false, error: 'no "Upload cover" tab' }; }
    await sleep(1500);
    const up = browse(['upload', 'input[type=file][accept*="image"]', file], 60_000);
    if (!up.ok) { close(); return { ok: false, error: `cover upload failed: ${browseError(up)}` }; }
    // Save only once the uploaded picture shows (img.ImageUpload__preview), or it saves the video's frame instead.
    let saved = false;
    for (let i = 0; i < 15; i++) {
      await sleep(2000);
      const st = pageValue(`(()=>{const d=${TT_COVER_DIALOG}; if(!d) return 'gone'; const p=d.querySelector('img[class*=ImageUpload__preview]'); if(!${saved}&&!(p&&p.naturalWidth>0)) return 'wait'; const b=[...d.querySelectorAll('button')].find(x=>/^Save$/.test((x.innerText||'').trim())); if(!b||b.disabled||b.getAttribute('aria-disabled')==='true') return 'wait'; b.click(); return 'clicked'})()`);
      if (st === 'clicked') saved = true;
      else if (st === 'gone') return saved ? { ok: true, how: 'cover' } : { ok: false, error: 'the cover dialog closed before Save' };
    }
    close();
    return { ok: false, error: 'the cover dialog didn\'t close after Save within 30 s' };
  } catch (e) {
    try { close(); } catch { /* ignore */ }
    return { ok: false, error: String(e.message || e).slice(0, 200) };
  }
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

const imageType = (file) => (/\.png$/i.test(file) ? 'image/png' : 'image/jpeg');

/**
 * The embed a Bluesky post carries for its picture (pure): a link card with the picture as its thumbnail when the
 * picture is the linked page's own (`image.card`), else the picture itself with its alt text. Null without a blob.
 */
function blueskyEmbed(image, blob) {
  if (!image || !blob) return null;
  if (image.card?.uri) return { $type: 'app.bsky.embed.external', external: { uri: image.card.uri, title: String(image.card.title || '').slice(0, 300), description: String(image.card.description || '').slice(0, 1000), thumb: blob } };
  return { $type: 'app.bsky.embed.images', images: [{ image: blob, alt: String(image.alt || '').slice(0, 1000), ...(image.width && image.height ? { aspectRatio: { width: image.width, height: image.height } } : {}) }] };
}

/** Post to Bluesky with a picture when `image` ({file, alt, card?}) is given: {url, name, image?}. */
async function blueskyPost(text, { handleKey = 'vault/botchelor/BLUESKY_HANDLE', passwordKey = 'vault/botchelor/BLUESKY_APP_PASSWORD', image } = {}) {
  const identifier = secret(handleKey);
  const password = secret(passwordKey);
  if (!identifier || !password) throw new Error(`no Bluesky login in the keychain (${handleKey}, ${passwordKey})`);
  const s = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier, password }) });
  if (!s.ok) throw new Error(`Bluesky sign-in failed (${s.status})`);
  const { accessJwt, did, handle } = await s.json();
  let pic = null;
  let embed = null;
  if (image?.file) {
    try {
      const up = await fetch('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', { method: 'POST', headers: { 'content-type': imageType(image.file), authorization: `Bearer ${accessJwt}` }, body: fs.readFileSync(image.file) });
      const j = await up.json().catch(() => ({}));
      if (!up.ok || !j.blob) throw new Error(`uploadBlob ${up.status}: ${JSON.stringify(j).slice(0, 160)}`);
      embed = blueskyEmbed(image, j.blob);
      pic = { ok: true, how: embed.$type === 'app.bsky.embed.external' ? 'link card' : 'image' };
    } catch (e) { pic = { ok: false, error: String(e.message || e).slice(0, 200) }; }
  }
  const create = (withEmbed) => fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${accessJwt}` },
    body: JSON.stringify({ repo: did, collection: 'app.bsky.feed.post', record: { $type: 'app.bsky.feed.post', text, createdAt: new Date().toISOString(), facets: blueskyFacets(text), ...(withEmbed ? { embed: withEmbed } : {}) } }),
  });
  let r = await create(embed);
  if (!r.ok && embed && r.status >= 400 && r.status < 500) {
    // A refused record posts nothing: the text goes out on its own.
    pic = { ok: false, error: `Bluesky refused the picture (${r.status}): ${(await r.text()).slice(0, 160)}` };
    r = await create(null);
  }
  if (!r.ok) throw new Error(`Bluesky refused the post (${r.status}): ${(await r.text()).slice(0, 200)}`);
  const { uri } = await r.json();
  return { url: `https://bsky.app/profile/${handle}/post/${String(uri).split('/').pop()}`, name: uri, ...(pic ? { image: pic } : {}) };
}

/** Post to our Discord's announcements webhook, with the picture as an attached file when `image` is given. */
async function discordPost(text, { webhookKey = 'vault/botchelor/DISCORD_ANNOUNCE_WEBHOOK', image } = {}) {
  const hook = secret(webhookKey);
  if (!hook) throw new Error(`no Discord webhook in the keychain (${webhookKey})`);
  const payload = { content: text, allowed_mentions: { parse: [] } };
  let pic = null;
  let r = null;
  if (image?.file) {
    let form = null;
    try {
      const name = `botchelor.${/\.png$/i.test(image.file) ? 'png' : 'jpg'}`;
      form = new FormData();
      form.append('payload_json', JSON.stringify({ ...payload, attachments: [{ id: 0, filename: name, description: String(image.alt || '').slice(0, 1000) }] }));
      form.append('files[0]', new Blob([fs.readFileSync(image.file)], { type: imageType(image.file) }), name);
    } catch (e) { pic = { ok: false, error: String(e.message || e).slice(0, 200) }; form = null; }
    if (form) {
      // A network failure here throws (the message may have gone out; never post it twice). A 4xx posted nothing:
      // the text goes out on its own below.
      r = await fetch(`${hook}?wait=true`, { method: 'POST', body: form });
      if (r.ok) pic = { ok: true, how: 'attached' };
      else if (r.status >= 400 && r.status < 500) { pic = { ok: false, error: `Discord refused the picture (${r.status}): ${(await r.text()).slice(0, 160)}` }; r = null; }
    }
  }
  if (!r) r = await fetch(`${hook}?wait=true`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error(`Discord refused the post (${r.status})`);
  const m = await r.json();
  return { url: m.channel_id && m.guild_id ? `https://discord.com/channels/${m.guild_id}/${m.channel_id}/${m.id}` : null, name: m.id, ...(pic ? { image: pic } : {}) };
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

/**
 * Whether YouTube's refusal of a custom thumbnail is the channel's missing phone verification (pure): thumbnails.set
 * answers 403 "forbidden" ("doesn't have permissions to upload and set custom video thumbnails") until the channel is
 * verified at https://www.youtube.com/verify.
 */
function thumbnailNeedsVerify(status, body) {
  const reason = JSON.stringify(body?.error?.errors || body?.error || body || '');
  return status === 403 && !/quota|rateLimit/i.test(reason);
}

/**
 * Set a video's thumbnail to a JPEG (thumbnails.set, at most 2 MB, 50 quota units): {ok: true, how: 'thumbnail'} or
 * {ok: false, status, error, verify?}. `verify` means the channel needs phone verification first. Never throws.
 */
async function youtubeThumbnail(videoId, file, token) {
  try {
    const t = token || await youtubeToken();
    const bytes = fs.readFileSync(file);
    const r = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`, {
      method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': imageType(file), 'content-length': String(bytes.length) }, body: bytes,
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true, how: 'thumbnail' };
    const msg = j?.error?.message || `HTTP ${r.status}`;
    return { ok: false, status: r.status, error: `YouTube refused the thumbnail (${r.status}): ${String(msg).slice(0, 200)}`, ...(thumbnailNeedsVerify(r.status, j) ? { verify: true } : {}) };
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 200) };
  }
}

/**
 * Upload a vertical clip as a public Short with the AI (altered or synthetic) disclosure on: {url, name, image?}.
 * With a `cover` (a JPEG of the kit's cover.png) it then sets the thumbnail; a refused thumbnail never undoes the
 * upload, it's reported in `image`.
 */
async function youtubeUpload({ video, title, description, tags = [], cover }) {
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
  return { url, name: v.id, ...(cover ? { image: await youtubeThumbnail(v.id, cover, token) } : {}) };
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

// botchelor's media bucket (the show app's MEDIA_S3_*, .do/show.yaml): where a Reel waits for Instagram to fetch it.
const MEDIA_BUCKET = { endpoint: 'https://br-winter-bird-b7gfzy20.storage.c-13.us-east-1.aws.neon.tech', bucket: 'botchelor-media', region: 'us-east-1' };

/** AWS Signature V4 for one S3 request (pure apart from the clock): the headers, or the query for a presigned link. */
function s3Sign({ method, key, cfg, keyId, secretKey, payloadHash = 'UNSIGNED-PAYLOAD', headers = {}, presignSeconds = 0, now = new Date() }) {
  const crypto = require('crypto');
  const hmac = (k, v) => crypto.createHmac('sha256', k).update(v).digest();
  const hash = (v) => crypto.createHash('sha256').update(v).digest('hex');
  const amz = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amz.slice(0, 8);
  const scope = `${day}/${cfg.region}/s3/aws4_request`;
  const u = new URL(`${cfg.endpoint}/${encodeURIComponent(cfg.bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`);
  const hdrs = { host: u.host, ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()])) };
  if (!presignSeconds) Object.assign(hdrs, { 'x-amz-date': amz, 'x-amz-content-sha256': payloadHash });
  const names = Object.keys(hdrs).sort();
  const q = new URLSearchParams();
  if (presignSeconds) {
    q.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256'); q.set('X-Amz-Credential', `${keyId}/${scope}`); q.set('X-Amz-Date', amz);
    q.set('X-Amz-Expires', String(presignSeconds)); q.set('X-Amz-SignedHeaders', names.join(';'));
  }
  const enc = (v) => encodeURIComponent(v).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const query = [...q.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&');
  const canonical = [method, u.pathname, query, names.map((n) => `${n}:${hdrs[n]}\n`).join(''), names.join(';'), payloadHash].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', amz, scope, hash(canonical)].join('\n');
  const kSig = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, day), cfg.region), 's3'), 'aws4_request');
  const sig = crypto.createHmac('sha256', kSig).update(toSign).digest('hex');
  if (presignSeconds) return { url: `${u.origin}${u.pathname}?${query}&X-Amz-Signature=${sig}` };
  delete hdrs.host;
  return { url: u.toString(), headers: { ...hdrs, authorization: `AWS4-HMAC-SHA256 Credential=${keyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${sig}` } };
}

/**
 * Put a file in the media bucket and hand back a link anyone can read for `seconds` (Instagram fetches the Reel and
 * its cover from it).
 */
async function mediaLink(file, key, seconds = 3600, contentType = 'video/mp4') {
  const keyId = secret('vault/botchelor/MEDIA_S3_ACCESS_KEY_ID');
  const secretKey = secret('vault/botchelor/MEDIA_S3_SECRET_ACCESS_KEY');
  if (!keyId || !secretKey) throw new Error('no media bucket key in the keychain (vault/botchelor/MEDIA_S3_*)');
  const bytes = fs.readFileSync(file);
  const payloadHash = require('crypto').createHash('sha256').update(bytes).digest('hex');
  const put = s3Sign({ method: 'PUT', key, cfg: MEDIA_BUCKET, keyId, secretKey, payloadHash, headers: { 'content-type': contentType, 'x-amz-meta-ai-generated': 'true' } });
  const r = await fetch(put.url, { method: 'PUT', headers: put.headers, body: bytes });
  if (!r.ok) throw new Error(`the media bucket refused ${path.basename(key)} (${r.status}): ${(await r.text()).slice(0, 200)}`);
  return s3Sign({ method: 'GET', key, cfg: MEDIA_BUCKET, keyId, secretKey, presignSeconds: seconds }).url;
}

/**
 * The kit's video as Instagram takes it: limited-range yuv420p H.264, a silent AAC track, moov first. The kit's own file
 * is full-range with no sound (fine for TikTok and YouTube). The original when ffmpeg isn't installed.
 */
function reelFile(video) {
  const out = path.join(os.tmpdir(), `reel-${path.basename(path.dirname(video))}.mp4`);
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', video, '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-map', '0:v', '-map', '1:a',
    '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p', '-color_range', 'tv', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium', '-crf', '20', '-r', '30',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out]);
  return r.status === 0 ? out : video;
}

/**
 * Post a clip as a Reel with its caption: {url, name}. A Unified-login token ("EAA…") can't use the direct upload
 * (rupload answers ProcessingFailedError, 2026-11-11), so the video goes to botchelor's media bucket and Instagram
 * fetches it from a one-hour link; an Instagram Login token uploads straight from this Mac. With a `cover` (a JPEG of
 * the kit's cover.png) the Reel's cover is set from a one-hour link to it (`cover_url`, both token kinds); a cover
 * Instagram won't take never stops the Reel, it's reported in `image`. A Reel's cover can't be changed after posting.
 */
async function instagramReel({ video, caption, cover }) {
  const token = await instagramToken();
  const fb = token.startsWith('EAA'); // a Unified-login (Facebook Login for Business) token
  const G = fb ? 'https://graph.facebook.com/v23.0' : 'https://graph.instagram.com/v23.0';
  const me = fb
    ? { user_id: secret('vault/botchelor/INSTAGRAM_USER_ID'), ...(await (await fetch(`${G}/${secret('vault/botchelor/INSTAGRAM_USER_ID')}?fields=username&access_token=${encodeURIComponent(token)}`)).json()) }
    : await (await fetch(`${G}/me?fields=user_id,username&access_token=${encodeURIComponent(token)}`)).json();
  if (!me.user_id || me.error) throw new Error(`Instagram didn't say who we are: ${JSON.stringify(me.error || me).slice(0, 200)}`);
  const file = reelFile(video);
  const form = (o) => ({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...o, access_token: token }) });
  let pic = null;
  let coverUrl = null;
  if (cover) {
    try { coverUrl = await mediaLink(cover, `marketing/reels/${path.basename(path.dirname(video))}-cover.jpg`, 3600, 'image/jpeg'); }
    catch (e) { pic = { ok: false, error: `couldn't put the cover where Instagram can fetch it: ${String(e.message || e).slice(0, 160)}` }; }
  }
  const videoLink = fb ? await mediaLink(file, `marketing/reels/${path.basename(path.dirname(video))}.mp4`) : null;
  // One container, uploaded and processed: its id, or throws why. Nothing is public until media_publish.
  const attempt = async (withCover) => {
    const extra = withCover && coverUrl ? { cover_url: coverUrl } : {};
    let c;
    if (fb) {
      c = await (await fetch(`${G}/${me.user_id}/media`, form({ media_type: 'REELS', video_url: videoLink, caption, share_to_feed: 'true', ...extra }))).json();
      if (!c.id) throw new Error(`Instagram didn't take the Reel: ${JSON.stringify(c.error || c).slice(0, 200)}`);
    } else {
      c = await (await fetch(`${G}/${me.user_id}/media`, form({ media_type: 'REELS', upload_type: 'resumable', caption, share_to_feed: 'true', ...extra }))).json();
      if (!c.id || !c.uri) throw new Error(`Instagram didn't open an upload: ${JSON.stringify(c.error || c).slice(0, 200)}`);
      const bytes = fs.readFileSync(file);
      const up = await fetch(c.uri, { method: 'POST', headers: { authorization: `OAuth ${token}`, offset: '0', file_size: String(bytes.length) }, body: bytes });
      if (!up.ok) throw new Error(`Instagram upload failed (${up.status}): ${(await up.text()).slice(0, 200)}`);
    }
    for (let i = 0; i < 40; i++) {
      const st = await (await fetch(`${G}/${c.id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`)).json();
      if (st.status_code === 'FINISHED') break;
      if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error(`Instagram couldn't process the video: ${st.status || st.status_code}`);
      await new Promise((r) => setTimeout(r, 15_000));
    }
    return c;
  };
  let c;
  if (coverUrl) {
    // With the cover first; if Instagram won't take or process it, the Reel goes again without (nothing was posted).
    try { c = await attempt(true); pic = { ok: true, how: 'cover_url' }; }
    catch (e) { pic = { ok: false, error: `the Reel failed with its cover, so it went without: ${String(e.message || e).slice(0, 160)}` }; }
  }
  if (!c) c = await attempt(false);
  const pub = await (await fetch(`${G}/${me.user_id}/media_publish`, form({ creation_id: c.id }))).json();
  if (!pub.id) throw new Error(`Instagram didn't publish the Reel: ${JSON.stringify(pub.error || pub).slice(0, 200)}`);
  const link = await (await fetch(`${G}/${pub.id}?fields=permalink&access_token=${encodeURIComponent(token)}`)).json().catch(() => ({}));
  return { url: link.permalink || `https://www.instagram.com/${me.username}/`, name: pub.id, ...(pic ? { image: pic } : {}) };
}

// ─── how posts do (the daily stats step, bin/idea-market.js dailyStats; lib/market-stats.js) ────────────────
//
// One fetcher per post kind, in STATS_FETCHERS: async (items) => {stats: {<queue id>: {views, likes, comments, …}},
// notes: [{key, message}]}. Read-only calls; a new channel (TikTok) adds its own fetcher there.

/** YouTube Shorts: views, likes and comments (videos.list, 1 quota unit per 50 videos; the readonly scope). */
async function youtubeStats(items) {
  const token = await youtubeToken();
  const stats = {};
  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50);
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${batch.map((it) => encodeURIComponent(it.thing)).join(',')}`, { headers: { authorization: `Bearer ${token}` } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`YouTube didn't give the numbers (${r.status}): ${String(j?.error?.message || '').slice(0, 200)}`);
    const byVideo = new Map((j.items || []).map((v) => [v.id, v.statistics || {}]));
    for (const it of batch) {
      const s = byVideo.get(it.thing);
      if (s) stats[it.id] = { views: Number(s.viewCount ?? NaN), likes: Number(s.likeCount ?? NaN), comments: Number(s.commentCount ?? NaN) };
    }
  }
  return { stats, notes: [] };
}

/**
 * Whether Instagram's answer is the app lacking the insights permission (pure): "(#10) Application does not have
 * permission for this action" (or #200), which needs instagram_manage_insights (Facebook Login for Business, "EAA…"
 * tokens) or instagram_business_manage_insights (Instagram Login).
 */
function insightsBlocked(err) {
  return Boolean(err) && ([10, 200].includes(Number(err.code)) || /permission/i.test(String(err.message || '')));
}

/** What David has to do for Instagram's views (pure), by the kind of token the loop has. */
function insightsFix(fb) {
  return fb
    ? 'Instagram views are blocked: the token lacks instagram_manage_insights. Fix: Meta app "Botchelor marketing" (2226376481650794) → Use cases → the Instagram use case → Permissions: add instagram_manage_insights; then Business settings (Botchelor portfolio 1599859378877687) → System users → Generate new token for that app with instagram_manage_insights ticked next to the ones it has, and store it: ~/ai-stack/bin/secrets add botchelor INSTAGRAM_TOKEN. Likes and comments are recorded meanwhile.'
    : 'Instagram views are blocked: the token lacks instagram_business_manage_insights. Fix: Meta app → Instagram → API setup with Instagram login → Permissions: add instagram_business_manage_insights, generate a new token and store it: ~/ai-stack/bin/secrets add botchelor INSTAGRAM_TOKEN. Likes and comments are recorded meanwhile.';
}

/** Instagram Reels: likes and comments from the media edge; views, reach, shares and saves from insights when allowed. */
async function instagramStats(items) {
  const token = await instagramToken();
  const fb = token.startsWith('EAA');
  const G = fb ? 'https://graph.facebook.com/v23.0' : 'https://graph.instagram.com/v23.0';
  const stats = {};
  const notes = [];
  let insights = true;
  for (const it of items) {
    const m = await (await fetch(`${G}/${it.thing}?fields=like_count,comments_count&access_token=${encodeURIComponent(token)}`)).json().catch(() => ({}));
    if (m.error) continue;
    const s = { likes: Number(m.like_count ?? NaN), comments: Number(m.comments_count ?? NaN) };
    if (insights) {
      const ins = await (await fetch(`${G}/${it.thing}/insights?metric=views,reach,shares,saved&access_token=${encodeURIComponent(token)}`)).json().catch(() => ({}));
      if (ins.error) {
        if (insightsBlocked(ins.error)) {
          insights = false; // the same answer for every Reel: ask once a run
          notes.push({ key: 'stats:instagram:insights', message: insightsFix(fb) });
        }
      } else {
        for (const d of ins.data || []) {
          const v = d.total_value?.value ?? d.values?.[0]?.value;
          if (Number.isFinite(v) && ['views', 'reach', 'shares', 'saved'].includes(d.name)) s[d.name] = v;
        }
      }
    }
    stats[it.id] = s;
  }
  return { stats, notes };
}

/** Bluesky: likes, reposts and replies (app.bsky.feed.getPosts on the public AppView, no sign-in; 25 a call). */
async function blueskyStats(items) {
  const stats = {};
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    const q = batch.map((it) => `uris=${encodeURIComponent(it.thing)}`).join('&');
    const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?${q}`, { headers: { 'user-agent': 'botchelor-marketing-stats/1.0' } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Bluesky didn't give the numbers (${r.status})`);
    const byUri = new Map((j.posts || []).map((p) => [p.uri, p]));
    for (const it of batch) {
      const p = byUri.get(it.thing);
      if (p) stats[it.id] = { likes: p.likeCount ?? NaN, reposts: (p.repostCount ?? 0) + (p.quoteCount ?? 0), comments: p.replyCount ?? NaN };
    }
  }
  return { stats, notes: [] };
}

/**
 * TikTok: views, likes and comments off TikTok Studio's content page in the signed-in browser (no API: see
 * tiktokPost). Scrolls until every post asked for is listed, or gives up after a few screens.
 */
async function tiktokStats(items) {
  await headedBrowser();
  const go = ttGoto(TT_CONTENT);
  if (!go.ok) throw new Error(`couldn't open TikTok Studio: ${browseError(go)}`);
  await sleep(5000);
  if (pageValue(`(()=>/\\/login/.test(location.pathname)||!!${ttLeaf('/^Log in$/')})()`) === 'true') throw new Error('the automated browser isn\'t signed in to TikTok');
  const want = new Set(items.map((it) => String(it.thing)));
  let rows = [];
  for (let i = 0; i < 6; i++) {
    rows = ttRows();
    const have = new Set(rows.map((r) => ttId(r.href)));
    if ([...want].every((id) => have.has(id))) break;
    pageValue("(()=>{window.scrollTo(0, document.body.scrollHeight); for(const el of document.querySelectorAll('div,main,section')){ if(el.scrollHeight>el.clientHeight+200&&/(auto|scroll)/.test(getComputedStyle(el).overflowY)) el.scrollTop=el.scrollHeight; } return 1})()");
    await sleep(2500);
  }
  const byId = new Map(rows.map((r) => [ttId(r.href), r]));
  const stats = {};
  for (const it of items) {
    const s = tiktokRowStats(byId.get(String(it.thing))?.text);
    if (s) stats[it.id] = s;
  }
  return { stats, notes: [] };
}

/** The stats fetcher for each post kind. */
const STATS_FETCHERS = { youtube: youtubeStats, instagram: instagramStats, bluesky: blueskyStats, tiktok: tiktokStats };

/** botchelor's /api/admin/engagement for [from, to] (UTC days), with the admin key from the keychain; null on failure. */
/** Send the marketing log to the product's public page (POST /api/admin/marketing). Returns its counts or throws why not. */
async function sendMarketingFeed(site, feed) {
  const key = secret('vault/botchelor/FRONTIER_PASSWORD');
  if (!key) throw new Error('no admin password in the keychain (vault/botchelor/FRONTIER_PASSWORD)');
  const r = await fetch(new URL('/api/admin/marketing', site), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-frontier-key': key, 'user-agent': 'botchelor-marketing-sync/1.0 (Claude)' },
    body: JSON.stringify(feed),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`the site refused the marketing log: ${r.status} ${body.error || ''}`.trim());
  return body;
}

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

/**
 * The crowd clone's dependencies, installed if they're gone. post-kit records the date with playwright-core from the
 * clone's node_modules, and only the 17:00 clip job (scripts/crowd/run.sh) installs them, and only when the lockfile
 * changes. 2026-11-11 botchelor's main tracked node_modules as a symlink for two hours: checking it out replaced the
 * clone's install with the link, checking out the fix deleted the link, and the 18:00 kit failed (ERR_MODULE_NOT_FOUND).
 */
function ensureCrowdDeps(repo = CROWD_REPO) {
  try { require.resolve('playwright-core', { paths: [repo] }); return false; } catch { /* missing: install */ }
  const npm = process.env.NPM_BIN || (fs.existsSync('/opt/homebrew/bin/npm') ? '/opt/homebrew/bin/npm' : 'npm');
  const r = spawnSync(npm, ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: repo, encoding: 'utf8', timeout: 10 * 60_000 });
  if (r.status !== 0) throw new Error(`the crowd clone's dependencies are missing and npm ci failed: ${String(r.stderr || r.stdout || r.error).trim().slice(-300)}`);
  try { require.resolve('playwright-core', { paths: [repo] }); } catch { throw new Error(`npm ci in ${repo} didn't install playwright-core`); }
  return true;
}

/** Build the post kit for an episode (scripts/clips/post-kit.mjs in the crowd clone): {dir, video, caption}. */
function buildVideoKit(episode) {
  ensureCrowdDeps();
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
    // A released cut (releaseCut) says so, so the follower channels count it as its own video, not as its date's daily kit.
    const cut = /-zz-cut-(.+)$/.exec(d)?.[1] ?? null;
    return { dir, video: path.join(dir, 'post.mp4'), caption: fs.readFileSync(path.join(dir, 'caption.txt'), 'utf8').trim(), episode: m ? m[1].toLowerCase() : null, ...(cut ? { cut } : {}) };
  } catch { return null; }
}

/**
 * Hand-edited episode cuts waiting their turn (botchelor scripts/clips/episode-cut.mjs, rendered into ${CLIPS}/cuts/<name>/,
 * the December plan of 2026-11-16): each a folder with post.mp4, caption.txt and checklist.md, in name order, so the
 * editor sets the release order by naming them (1-…, 2-…). A folder missing one of the three is not ready and waits.
 */
function stagedCuts() {
  const root = path.join(CLIPS, 'cuts');
  let dirs = [];
  try { dirs = fs.readdirSync(root).filter((d) => fs.statSync(path.join(root, d)).isDirectory()).sort(); } catch { return []; }
  return dirs.filter((d) => ['post.mp4', 'caption.txt', 'checklist.md'].every((f) => fs.existsSync(path.join(root, d, f)))).map((d) => path.join(root, d));
}

/**
 * The next staged cut, moved into ${CLIPS}/posts as `day`'s kit: named to sort after the same day's daily kit (so
 * latestKit and the follower drafts pick it), and listed by madeKitEpisodes from then on, so the daily clip never cuts
 * its dates again. Moved, never copied or deleted. {dir, video, caption, episode, cut} or null when none is waiting.
 */
function releaseCut(day) {
  const next = stagedCuts()[0];
  if (!next) return null;
  const cut = path.basename(next);
  const dir = path.join(CLIPS, 'posts', `${day}-zz-cut-${cut}`);
  fs.mkdirSync(path.join(CLIPS, 'posts'), { recursive: true });
  if (fs.existsSync(dir)) throw new Error(`${dir} already exists`);
  fs.renameSync(next, dir);
  const m = /\/episodes\/([0-9a-f-]{36})/i.exec(fs.readFileSync(path.join(dir, 'checklist.md'), 'utf8'));
  return { dir, video: path.join(dir, 'post.mp4'), caption: fs.readFileSync(path.join(dir, 'caption.txt'), 'utf8').trim(), episode: m ? m[1].toLowerCase() : null, cut };
}

function listPosts() {
  try { return fs.readdirSync(path.join(CLIPS, 'posts')).filter((d) => fs.statSync(path.join(CLIPS, 'posts', d)).isDirectory()).sort(); } catch { return []; }
}

module.exports = {
  isStrayLoopServer, sendMarketingFeed, s3Sign, BROWSE_STATE, BUN_BIN, browse, browseEnv, browseError, ensureCrowdDeps, xPost, newPostUrl, threadsPost, secret, storeSecret, youtubeUpload, instagramReel, latestKit, stagedCuts, releaseCut, phoneTargets, tell, Reddit, blueskyFacets, blueskyPost, discordPost, engagement, newestClip, madeKitEpisodes, buildVideoKit, lastValue,
  // covers and stats (2026-11-19)
  blueskyEmbed, youtubeThumbnail, thumbnailNeedsVerify, insightsBlocked, insightsFix, youtubeStats, instagramStats, blueskyStats, STATS_FETCHERS, attachInBrowser,
  COMPOSERS: { X_INPUT, X_ATTACHED, THREADS_INPUT, threadsAttached },
  // TikTok through TikTok Studio (2026-11-19)
  tiktokPost, tiktokStats, tiktokCount, tiktokRowStats, tiktokNewPost };
