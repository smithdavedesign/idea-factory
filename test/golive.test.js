// Go-live (lib/golive.js): the live launch audit, the production URL, when a go-live build is due. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../lib/golive');

const READY_HTML = `<html><head><title>dawnlog — morning receipts</title>
<meta name="description" content="Receipts for overnight agent runs"><meta property="og:title" content="dawnlog">
<meta property="og:image" content="https://x/og.png"><meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://x/"><script type="application/ld+json">{}</script></head></html>`;

test('a page is read for title, description, share tags, canonical and structured data', () => {
  assert.deepEqual(G.auditPage(READY_HTML), { title: 'dawnlog — morning receipts', description: true, ogTitle: true, ogImage: true, twitterCard: true, canonical: true, jsonLd: true });
  assert.deepEqual(G.auditPage('<title>x</title>'), { title: null, description: false, ogTitle: false, ogImage: false, twitterCard: false, canonical: false, jsonLd: false }, 'a 1-char title is no title');
  assert.equal(G.auditPage('<meta content="d" name="description">').description, true, 'attribute order doesn\'t matter');
});

test('the live audit: every required check, what\'s missing, and speed', async () => {
  const site = { 'https://x': READY_HTML, 'https://x/robots.txt': 'User-agent: *', 'https://x/sitemap.xml': '<urlset/>', 'https://x/privacy': 'p', 'https://x/terms': 't' };
  const fetchFn = async (u) => (site[u] !== undefined ? { status: 200, text: async () => site[u] } : { status: 404, text: async () => '' });
  const ok = await G.auditLaunch('https://x/', { fetchFn });
  assert.equal(ok.ready, true);
  assert.equal(ok.passed, ok.total);
  assert.equal(ok.total, 9);
  delete site['https://x/sitemap.xml'];
  site['https://x'] = '<title>dawnlog app</title>';
  const half = await G.auditLaunch('https://x', { fetchFn });
  assert.equal(half.ready, false);
  assert.deepEqual(half.missing, ['Meta description', 'Social share image (og:image)', 'sitemap.xml']);
  const down = await G.auditLaunch('https://down', { fetchFn: async () => { throw new Error('ENOTFOUND'); } });
  assert.deepEqual(down.missing.slice(0, 2), ['Home page answers', 'Page title']);
  assert.equal(down.checks.find((c) => c.id === 'https').ok, true);
});

test('the production URL is the newest production deployment\'s shortest alias in the owner\'s team', () => {
  const calls = [];
  const exec = (cmd, args) => {
    calls.push([cmd, ...args].join(' '));
    if (args[0] === 'ls') return 'Age  Deployment\n1h   https://grantgate-ab12cd34e-david-smiths-projects.vercel.app  ● Ready  Production\n';
    return 'Aliases\n  ╶ https://grantgate-two.vercel.app\n  ╶ https://grantgate-david-smiths-projects.vercel.app\n  ╶ https://grantgate-git-main-david-smiths-projects.vercel.app\n';
  };
  assert.equal(G.productionUrl('grantgate', 'team_1', { exec }), 'https://grantgate-two.vercel.app');
  assert.deepEqual(calls, ['vercel ls grantgate --prod --scope team_1', 'vercel inspect https://grantgate-ab12cd34e-david-smiths-projects.vercel.app --scope team_1']);
  assert.equal(G.productionUrl('x', 'team_1', { exec: () => '> No deployments found' }), null, 'before the first deploy');
  assert.equal(G.productionUrl('x', '', { exec }), null);
  assert.equal(G.productionUrl('x', 'team_1', { exec: () => { throw new Error('auth'); } }), null);
});

test('with no public alias the production URL is null, never the protected per-deployment URL', () => {
  const exec = (cmd, args) => (args[0] === 'ls'
    ? '1h   https://tiebreak-mh5fswqjn-david-smiths-projects-fe129786.vercel.app  ● Ready  Production\n'
    : 'General\n  url  https://tiebreak-mh5fswqjn-david-smiths-projects-fe129786.vercel.app\nAliases\n');
  assert.equal(G.productionUrl('tiebreak', 'team_1', { exec }), null);
});

test('command output includes stderr, where `vercel inspect` prints its aliases', () => {
  const out = G.commandOutput(process.execPath, ['-e', 'process.stdout.write("out-line"); process.stderr.write("Aliases\\n  https://x-phi.vercel.app")']);
  assert.match(out, /out-line/);
  assert.match(out, /https:\/\/x-phi\.vercel\.app/);
  assert.throws(() => G.commandOutput(process.execPath, ['-e', 'process.exit(3)']), /exited 3/);
});

test('go-live can run after M1 when nothing is in flight; it starts by itself once the MVP is complete and not launch-ready', () => {
  const repo = 'https://github.com/o/x';
  assert.deepEqual(G.goLiveTarget({ repo, milestonesDone: ['M1'], build: { status: 'merged' } }), { ok: true, milestone: 'GOLIVE' });
  assert.match(G.goLiveTarget({ repo }).reason, /nothing merged yet/);
  assert.match(G.goLiveTarget({ repo, milestonesDone: ['M1'], build: { milestone: 'GOLIVE', status: 'pr-open' } }).reason, /the go-live PR is waiting/);
  assert.match(G.goLiveTarget({ milestonesDone: ['M1'] }).reason, /no repo/);
  const steps = (mvp, ready) => [{ id: 'mvp', done: mvp }, { id: 'launchReady', done: ready }];
  const base = { repo, milestonesDone: ['M1', 'M2'], build: { status: 'merged' } };
  assert.equal(G.goLiveDue({ ...base, launch: { steps: steps(true, false) } }), true);
  assert.equal(G.goLiveDue({ ...base, launch: { steps: steps(false, false) } }), false, 'not before the MVP is complete');
  assert.equal(G.goLiveDue({ ...base, launch: { steps: steps(true, true) } }), false, 'already launch-ready');
  assert.equal(G.goLiveDue({ ...base, golive: { mergedAt: 'x' }, launch: { steps: steps(true, false) } }), false, 'one go-live build; after that the audit says what\'s missing');
});
