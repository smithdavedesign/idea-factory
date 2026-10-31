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
  // As the real CLI does: the ls table on stdout, inspect's whole report (aliases included) on stderr.
  const spawn = (cmd, args) => {
    calls.push([cmd, ...args].join(' '));
    if (args[0] === 'ls') return { status: 0, stdout: 'Age  Deployment\n1h   https://grantgate-ab12cd34e-david-smiths-projects.vercel.app  ● Ready  Production\n', stderr: '> Production deployments' };
    return { status: 0, stdout: '', stderr: 'url  https://grantgate-ab12cd34e-david-smiths-projects.vercel.app\nAliases\n  ╶ https://grantgate-two.vercel.app\n  ╶ https://grantgate-david-smiths-projects.vercel.app\n  ╶ https://grantgate-git-main-david-smiths-projects.vercel.app\n' };
  };
  assert.equal(G.productionUrl('grantgate', 'team_1', { spawn }), 'https://grantgate-two.vercel.app');
  assert.deepEqual(calls, ['vercel ls grantgate --prod --scope team_1', 'vercel inspect https://grantgate-ab12cd34e-david-smiths-projects.vercel.app --scope team_1']);
  assert.equal(G.productionUrl('x', 'team_1', { spawn: () => ({ status: 0, stdout: '', stderr: '> No deployments found' }) }), null, 'before the first deploy');
  assert.equal(G.productionUrl('x', '', { spawn }), null);
  assert.equal(G.productionUrl('x', 'team_1', { spawn: () => ({ status: 1, stdout: '', stderr: 'Error: not authorized' }) }), null);
  assert.equal(G.productionUrl('x', 'team_1', { spawn: () => ({ error: new Error('ENOENT') }) }), null, 'no CLI');
  // A deployment with no alias yet: null, never the deployment's own URL (it changes every deploy and is protected).
  const noAlias = (cmd, args) => (args[0] === 'ls'
    ? { status: 0, stdout: 'https://tiebreak-mh5fswqjn-team.vercel.app ● Ready Production', stderr: '' }
    : { status: 0, stdout: '', stderr: 'url  https://tiebreak-mh5fswqjn-team.vercel.app\nAliases\n  ╶ https://tiebreak-git-main-team.vercel.app\n' });
  assert.equal(G.productionUrl('tiebreak', 'team_1', { spawn: noAlias }), null);
  // codespend, 2026-10-12: the only production deployment was blocked, and its one alias was the team's
  // own address (behind Vercel's login). No production URL until a Ready deployment has a public one.
  const team = 'https://codespend-david-smiths-projects-fe129786.vercel.app';
  const codespend = (status, aliases) => (cmd, args) => (args[0] === 'ls'
    ? { status: 0, stdout: `1h  https://codespend-n8ugdx7y1-david-smiths-projects-fe129786.vercel.app  ● ${status}  Production\n`, stderr: '' }
    : { status: 0, stdout: '', stderr: `Aliases\n${aliases.map((a) => `  ╶ ${a}`).join('\n')}\n` });
  assert.equal(G.productionUrl('codespend', 'team_1', { spawn: codespend('Blocked', [team]) }), null, 'a blocked deployment');
  assert.equal(G.productionUrl('codespend', 'team_1', { spawn: codespend('Ready', [team]) }), null, 'only the team address');
  assert.equal(G.productionUrl('codespend', 'team_1', { spawn: codespend('Ready', ['https://codespend-phi.vercel.app', team]) }), 'https://codespend-phi.vercel.app');
  assert.equal(G.ownVercelAddress(team, 'codespend'), true);
  assert.equal(G.ownVercelAddress('https://codespend.example.com', 'codespend'), false);
  assert.equal(G.ownVercelAddress('https://other-app.vercel.app', 'codespend'), false);
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

test('hostBlocked tells an account-wide hosting block from a broken site', async () => {
  const GL2 = require('../lib/golive');
  const res = (status, body = '') => async () => ({ status, text: async () => body });
  assert.equal(await GL2.hostBlocked('https://x.vercel.app', { fetchFn: res(402, 'Payment required\n\nDEPLOYMENT_DISABLED\n') }), 'HTTP 402 DEPLOYMENT_DISABLED');
  assert.equal(await GL2.hostBlocked('https://x.vercel.app', { fetchFn: res(200, '<html>') }), null);
  assert.equal(await GL2.hostBlocked('https://x.vercel.app', { fetchFn: res(500) }), null, 'a 500 is the code: revert as before');
  assert.equal(await GL2.hostBlocked('https://x.vercel.app', { fetchFn: async () => { throw new Error('ENOTFOUND'); } }), null);
});
