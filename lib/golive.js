// golive.js — getting a built product launch-ready, and checking it live (bin/idea-build.js goLive,
// bin/idea-pipeline.js). The go-live build adds what a public launch needs (SEO basics, privacy and
// terms, a payment link, a visit beacon, a Vercel project); this module audits the live site, finds
// the production URL, and decides when a go-live build is due.
const { execFileSync, spawnSync } = require('child_process');

/** What one live page carries for search and sharing (pure; a light parse of the HTML, no DOM). */
function auditPage(html) {
  const h = String(html || '');
  const meta = (attr, name) => new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*${attr}=["']${name}["']`, 'i').exec(h);
  const title = (/<title[^>]*>([^<]{3,})<\/title>/i.exec(h) || [])[1];
  return {
    title: title ? title.trim() : null,
    description: !!meta('name', 'description'),
    ogTitle: !!meta('property', 'og:title'),
    ogImage: !!meta('property', 'og:image'),
    twitterCard: !!meta('name', 'twitter:card'),
    canonical: /<link[^>]+rel=["']canonical["']/i.test(h),
    jsonLd: /<script[^>]+type=["']application\/ld\+json["']/i.test(h),
  };
}

/** The checks a launch needs, in order; `required` ones decide "launch-ready". */
const CHECKS = [
  ['https', 'Served over HTTPS', true],
  ['up', 'Home page answers', true],
  ['title', 'Page title', true],
  ['description', 'Meta description', true],
  ['ogImage', 'Social share image (og:image)', true],
  ['robots', 'robots.txt', true],
  ['sitemap', 'sitemap.xml', true],
  ['privacy', 'Privacy page', true],
  ['terms', 'Terms page', true],
  ['fast', 'Home page under 2 s', false],
  ['jsonLd', 'Structured data (JSON-LD)', false],
];

/** The audit's verdict from the raw results (pure). */
function auditResult(url, raw) {
  const checks = CHECKS.map(([id, label, required]) => ({ id, label, required, ok: !!raw[id] }));
  const required = checks.filter((c) => c.required);
  const missing = required.filter((c) => !c.ok).map((c) => c.label);
  return { url, checks, passed: required.length - missing.length, total: required.length, ready: missing.length === 0, missing, ms: raw.ms ?? null };
}

/** Audit a live URL. Never throws; a site that doesn't answer fails every check but https. */
async function auditLaunch(url, { fetchFn = globalThis.fetch, timeoutMs = 10_000 } = {}) {
  const get = async (u) => {
    try { const r = await fetchFn(u, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) }); return { status: r.status, text: r.status < 400 ? await r.text() : '' }; } catch { return { status: 0, text: '' }; }
  };
  const base = url.replace(/\/+$/, '');
  const t0 = Date.now();
  const home = await get(base);
  const ms = Date.now() - t0;
  const page = auditPage(home.text);
  const ok = async (p) => { const r = await get(`${base}${p}`); return r.status > 0 && r.status < 400; };
  const [robots, sitemap, privacy, terms] = await Promise.all([ok('/robots.txt'), ok('/sitemap.xml'), ok('/privacy'), ok('/terms')]);
  return auditResult(url, {
    https: url.startsWith('https://'), up: home.status > 0 && home.status < 400, title: !!page.title, description: page.description,
    ogImage: page.ogImage, robots, sitemap, privacy, terms, fast: home.status > 0 && ms < 2000, jsonLd: page.jsonLd, ms,
  });
}

/**
 * The production URL of a Vercel project in the owner's team: the newest production deployment's
 * shortest alias (e.g. grantgate-two.vercel.app, or a custom domain). Null before the first deploy.
 */
/**
 * A command's whole output, stdout and stderr together; throws when it fails. The Vercel CLI
 * prints `vercel inspect` (aliases included) on stderr, so reading stdout alone found no alias.
 */
function commandOutput(cmd, args, { timeout = 60_000 } = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${cmd} ${args[0]} exited ${r.status}`);
  return `${r.stdout || ''}\n${r.stderr || ''}`;
}

/**
 * The newest production deployment's public address: its shortest alias in the owner's team, or
 * null. Never the per-deployment URL (`<project>-<hash>-<team>.vercel.app`): that one sits behind
 * Vercel's deployment protection, so it's a login page to everyone else (tiebreak's homepage,
 * 2026-10-12).
 */
function productionUrl(project, scope, { exec = commandOutput } = {}) {
  if (!scope) return null;
  try {
    const ls = exec('vercel', ['ls', project, '--prod', '--scope', scope], { timeout: 60_000 });
    const deployment = (String(ls).match(/https:\/\/[a-z0-9.-]+\.vercel\.app/i) || [])[0];
    if (!deployment) return null;
    const inspect = exec('vercel', ['inspect', deployment, '--scope', scope], { timeout: 60_000 });
    const aliases = [...String(inspect).matchAll(/https:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi)].map((m) => m[0]).filter((u) => u !== deployment && !/-[a-z0-9]{9}-/i.test(u));
    return aliases.sort((a, b) => a.length - b.length)[0] || null;
  } catch { return null; }
}

/** Whether "Get it launch-ready" can run for an idea now, or why not (pure). */
function goLiveTarget(state) {
  const b = state.build || {};
  if (!state.repo) return { ok: false, reason: 'no repo yet' };
  if (!(state.milestonesDone || []).length) return { ok: false, reason: 'nothing merged yet: build and merge at least M1 first' };
  if (b.status === 'running') return { ok: false, reason: `${b.milestone || 'a build'} is running now` };
  if (b.status === 'pr-open') return { ok: false, reason: `${b.milestone === 'GOLIVE' ? 'the go-live' : b.milestone || 'a'} PR is waiting for your review: merge it first` };
  return { ok: true, milestone: 'GOLIVE' };
}

/** Whether the pipeline should start a go-live build by itself (pure): the MVP is complete, it isn't launch-ready, and no go-live has been built. */
function goLiveDue(state) {
  const steps = state.launch?.steps || [];
  const mvp = steps.find((s) => s.id === 'mvp');
  const ready = steps.find((s) => s.id === 'launchReady');
  return !!mvp?.done && !ready?.done && !state.golive && goLiveTarget(state).ok;
}

module.exports = { auditPage, auditResult, auditLaunch, productionUrl, commandOutput, goLiveTarget, goLiveDue, CHECKS };
