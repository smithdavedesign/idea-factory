// worker/ideas.mjs: the idea pipeline's public face on Cloudflare Workers (free plan), Worker `idea-factory`.
//
// Why: on 2026-10-31 the Vercel team was soft-blocked until 2026-11-30. The landing pages (idea-pages on
// Vercel) and RepoHQ's /api/ideas/signal both answered 402, so every demand test and every product beacon
// was lost, and the growth loop saw no visitors. RepoHQ itself now runs on David's Mac behind Tailscale,
// which the public can't reach. This Worker does both public jobs, off Vercel and off the Mac:
//   - pages/<slug>/: the static landing pages (Workers static assets, wrangler.jsonc), served before this code;
//   - POST /api/ideas/signal: the same endpoint as RepoHQ's src/app/api/ideas/signal (same validation,
//     honeypot, per-visitor hourly limits), writing to the same Neon table, idea_signals, which RepoHQ reads.
//
// The database login is a role that can only insert rows and read ip_hash/kind/created_at
// (provision/idea-factory/DATABASE_URL, a Worker secret). IPs are never stored: an HMAC with
// IDEA_SIGNAL_SALT (also a Worker secret). Deploy: provision cloudflare deploy idea-factory <checkout>.
// Pure parts are exported for test/ideas-worker.test.js.

export const SIGNAL_PATH = '/api/ideas/signal';
export const SIGNAL_KINDS = ['view', 'signup', 'visit', 'activate', 'checkout'];
/** Same rule as the idea repos' names (and RepoHQ's SLUG_RE). */
export const SLUG_RE = /^(?=.{3,24}$)[a-z][a-z0-9]*(-[a-z0-9]+)?$/;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;
/** Per visitor (hashed IP) and hour, across all ideas (RepoHQ's RATE_LIMITS). */
export const RATE_LIMITS = { view: 30, signup: 3, visit: 30, activate: 10, checkout: 10 };

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

/** RepoHQ's parseSignal, unchanged in behaviour. */
export function parseSignal(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'expected a JSON object' };
  if (typeof body.website === 'string' && body.website.trim()) return { ok: false, error: 'honeypot', silent: true };
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!SLUG_RE.test(slug)) return { ok: false, error: 'invalid slug' };
  const kind = SIGNAL_KINDS.find((k) => k === body.kind);
  if (!kind) return { ok: false, error: `kind must be one of ${SIGNAL_KINDS.join(', ')}` };
  let email = null;
  if (kind === 'signup') {
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, error: 'invalid email' };
  }
  const referrer = typeof body.referrer === 'string' && /^https?:\/\//.test(body.referrer) ? body.referrer.slice(0, 300) : null;
  return { ok: true, signal: { slug, kind, email, referrer } };
}

/** HMAC-SHA256 of the client IP, hex, 32 chars (RepoHQ's hashIp, with WebCrypto). */
export async function hashIp(ip, secret) {
  if (!ip || !secret) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(ip.trim())));
  return [...mac].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/** Cloudflare's own header for the visitor's address; nothing a visitor can set. */
export const clientIp = (headers) => headers.get('cf-connecting-ip') || null;

/** Neon's HTTP SQL endpoint for a connection string (what @neondatabase/serverless calls): https://api.<rest of host>/sql. */
export function neonEndpoint(url) {
  const host = new URL(url).hostname;
  return `https://${host.replace(/^[^.]+\./, 'api.')}/sql`;
}

/** One parameterised statement over Neon's HTTP API. → rows (objects). */
export async function neonQuery(url, query, params, fetchFn = fetch) {
  const res = await fetchFn(neonEndpoint(url), {
    method: 'POST',
    headers: { 'Neon-Connection-String': url, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, params }),
  });
  if (!res.ok) throw new Error(`neon ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).rows || [];
}

// One round trip: insert unless this visitor already sent `limit` signals of this kind in the last hour.
// No row back = rate limited. A visitor without an IP hash isn't limited (RepoHQ's route does the same).
export const INSERT_SQL = `WITH recent AS (
  SELECT count(*)::int AS n FROM idea_signals
  WHERE $4::text IS NOT NULL AND ip_hash = $4 AND kind = $2 AND created_at > now() - interval '1 hour'
)
INSERT INTO idea_signals (slug, kind, email, ip_hash, referrer)
SELECT $1, $2, $3, $4, $5 FROM recent WHERE recent.n < $6
RETURNING id`;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });

/** POST /api/ideas/signal. `query(sql, params)` → rows; injected by tests. */
export async function handleSignal(request, env, query = (sql, params) => neonQuery(env.DATABASE_URL, sql, params)) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);
  // Beacons send text/plain (no CORS preflight), landing pages application/json: parse the text either way.
  const text = await request.text().catch(() => '');
  if (text.length > 4096) return json({ ok: false, error: 'too large' }, 413);
  let body = null;
  try { body = JSON.parse(text); } catch { /* invalid below */ }
  const parsed = parseSignal(body);
  if (!parsed.ok) return parsed.silent ? json({ ok: true }) : json({ ok: false, error: parsed.error }, 400);
  if (!env.DATABASE_URL) return json({ ok: false, error: 'not configured' }, 503);
  const { slug, kind, email, referrer } = parsed.signal;
  const ipHash = await hashIp(clientIp(request.headers), env.IDEA_SIGNAL_SALT);
  try {
    const rows = await query(INSERT_SQL, [slug, kind, email, ipHash, referrer, RATE_LIMITS[kind]]);
    if (!rows.length) return json({ ok: false, error: 'rate limited' }, 429);
  } catch (e) {
    console.error('signal insert failed', String(e && e.message || e).slice(0, 200));
    return json({ ok: false, error: 'try again later' }, 503);
  }
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === SIGNAL_PATH || pathname === `${SIGNAL_PATH}/`) return handleSignal(request, env);
    // RepoHQ's collector probes this: 503 until both secrets are set, so a deploy without them alerts.
    if (pathname === '/api/health') {
      const ready = !!env.DATABASE_URL && !!env.IDEA_SIGNAL_SALT;
      return json({ ok: ready, db: !!env.DATABASE_URL, salt: !!env.IDEA_SIGNAL_SALT }, ready ? 200 : 503);
    }
    // Everything else: a landing page (static assets answer first; this is only reached on a miss).
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  },
};
