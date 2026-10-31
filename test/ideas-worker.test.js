// The idea-factory Worker (worker/ideas.mjs): landing pages and the public signal endpoint on Cloudflare,
// and the pipeline re-pointing live pages after a move (lib/pipeline.js pageStale). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const P = require('../lib/pipeline');

const load = () => import('../worker/ideas.mjs');
const post = (body, headers = {}) => new Request('https://idea-factory.example.workers.dev/api/ideas/signal', {
  method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'text/plain', 'cf-connecting-ip': '203.0.113.7', ...headers },
});
const ENV = { DATABASE_URL: 'postgresql://signal:pw@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require', IDEA_SIGNAL_SALT: 'salt' };

test('parseSignal matches RepoHQ: kinds, slug rule, email on signup only, honeypot, referrer', async () => {
  const W = await load();
  assert.deepEqual(W.parseSignal({ slug: 'tiebreak', kind: 'visit', referrer: 'https://news.ycombinator.com/' }),
    { ok: true, signal: { slug: 'tiebreak', kind: 'visit', email: null, referrer: 'https://news.ycombinator.com/' } });
  assert.equal(W.parseSignal({ slug: 'tiebreak', kind: 'visit', referrer: 'javascript:x' }).signal.referrer, null);
  assert.equal(W.parseSignal({ slug: 'Bad_Slug', kind: 'view' }).ok, false);
  assert.equal(W.parseSignal({ slug: 'permitly', kind: 'nope' }).ok, false);
  assert.equal(W.parseSignal({ slug: 'permitly', kind: 'signup', email: 'not-an-email' }).ok, false);
  assert.equal(W.parseSignal({ slug: 'permitly', kind: 'signup', email: ' A@Example.com ' }).signal.email, 'a@example.com');
  assert.deepEqual(W.parseSignal({ slug: 'permitly', kind: 'signup', email: 'a@b.co', website: 'spam' }), { ok: false, error: 'honeypot', silent: true });
  assert.equal(W.parseSignal(null).ok, false);
  assert.equal(W.parseSignal([1]).ok, false);
});

test('the IP is only ever stored as an HMAC, and the same visitor hashes the same', async () => {
  const W = await load();
  const a = await W.hashIp('203.0.113.7', 'salt');
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.equal(a, await W.hashIp(' 203.0.113.7 ', 'salt'));
  assert.notEqual(a, await W.hashIp('203.0.113.7', 'other'));
  // Same digest as RepoHQ's node:crypto version (createHmac sha256, hex, first 32).
  assert.equal(a, require('crypto').createHmac('sha256', 'salt').update('203.0.113.7').digest('hex').slice(0, 32));
  assert.equal(await W.hashIp(null, 'salt'), null);
});

test("Neon's HTTP endpoint is the host with its first label swapped for api", async () => {
  const W = await load();
  assert.equal(W.neonEndpoint(ENV.DATABASE_URL), 'https://api.us-east-2.aws.neon.tech/sql');
});

test('a valid signal is inserted with the hashed IP and its kind limit; text/plain bodies work', async () => {
  const W = await load();
  const calls = [];
  const res = await W.handleSignal(post({ slug: 'tiebreak', kind: 'visit', referrer: null }), ENV, async (sql, params) => { calls.push({ sql, params }); return [{ id: 1 }]; });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO idea_signals/);
  const [slug, kind, email, ipHash, referrer, limit] = calls[0].params;
  assert.deepEqual([slug, kind, email, referrer, limit], ['tiebreak', 'visit', null, null, 30]);
  assert.equal(ipHash, await W.hashIp('203.0.113.7', 'salt'));
});

test('no row back is a rate limit; a database error is a 503, not a crash', async () => {
  const W = await load();
  assert.equal((await W.handleSignal(post({ slug: 'tiebreak', kind: 'visit' }), ENV, async () => [])).status, 429);
  const err = console.error; console.error = () => {};
  try {
    assert.equal((await W.handleSignal(post({ slug: 'tiebreak', kind: 'visit' }), ENV, async () => { throw new Error('down'); })).status, 503);
  } finally { console.error = err; }
});

test('bad input is a 400, the honeypot a silent 200, preflight a 204, other methods a 405', async () => {
  const W = await load();
  const never = async () => { throw new Error('must not query'); };
  assert.equal((await W.handleSignal(post('{not json'), ENV, never)).status, 400);
  assert.equal((await W.handleSignal(post({ slug: 'x', kind: 'view' }), ENV, never)).status, 400);
  assert.equal((await W.handleSignal(post('x'.repeat(5000)), ENV, never)).status, 413);
  const hp = await W.handleSignal(post({ slug: 'permitly', kind: 'signup', email: 'a@b.co', website: 'x' }), ENV, never);
  assert.equal(hp.status, 200);
  const pre = await W.handleSignal(new Request('https://w.dev/api/ideas/signal', { method: 'OPTIONS' }), ENV, never);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('access-control-allow-headers'), 'Content-Type');
  assert.equal((await W.handleSignal(new Request('https://w.dev/api/ideas/signal'), ENV, never)).status, 405);
  assert.equal((await W.handleSignal(post({ slug: 'tiebreak', kind: 'visit' }), {}, never)).status, 503, 'no DATABASE_URL secret');
});

test('the Worker routes the signal path to the handler and everything else to the pages', async () => {
  const W = await load();
  const assets = { fetch: async (r) => new Response(`asset ${new URL(r.url).pathname}`) };
  const page = await W.default.fetch(new Request('https://w.dev/permitly/'), { ...ENV, ASSETS: assets });
  assert.equal(await page.text(), 'asset /permitly/');
  const health = await W.default.fetch(new Request('https://w.dev/api/health'), ENV);
  assert.deepEqual(await health.json(), { ok: true, db: true, salt: true });
  const unset = await W.default.fetch(new Request('https://w.dev/api/health'), {});
  assert.equal(unset.status, 503, 'secrets missing: the collector alerts');
});

test('wrangler.jsonc: a Worker named after the repo, serving pages/, no build step (the broker refuses one)', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'wrangler.jsonc'), 'utf8')
    .split('\n').map((l) => l.replace(/^\s*\/\/.*$/, '').replace(/\s\/\/ .*$/, '')).join('\n');
  const conf = JSON.parse(text);
  assert.equal(conf.name, 'idea-factory');
  assert.equal(conf.main, 'worker/ideas.mjs');
  assert.equal(conf.assets.directory, 'pages');
  assert.equal(conf.build, undefined);
  assert.ok(fs.readFileSync(path.join(__dirname, '..', 'pages', '.assetsignore'), 'utf8').includes('.vercel'), "the Vercel project link isn't published");
});

test('a live page is stale when it posts elsewhere or its address is on the old host', () => {
  const opts = { slug: 'permitly', signalUrl: 'https://idea-factory.x.workers.dev/api/ideas/signal', baseUrl: 'https://idea-factory.x.workers.dev' };
  const html = P.renderLanding({ slug: 'permitly', signalUrl: opts.signalUrl, landing: { headline: 'h', subhead: 's', bullets: [], cta: 'c' } });
  assert.deepEqual(P.pageStale(html, 'https://idea-factory.x.workers.dev/permitly/', opts), { html: false, url: false });
  const old = P.renderLanding({ slug: 'permitly', signalUrl: 'https://repohq.vercel.app/api/ideas/signal', landing: { headline: 'h', subhead: 's', bullets: [], cta: 'c' } });
  assert.deepEqual(P.pageStale(old, 'https://idea-pages-livid.vercel.app/permitly/', opts), { html: true, url: true });
  assert.deepEqual(P.pageStale('', 'https://idea-factory.x.workers.dev/permitly/', opts), { html: true, url: false }, 'a missing file is re-rendered');
});
