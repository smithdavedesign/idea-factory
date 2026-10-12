// The road to revenue (lib/revenue.js, lib/launch-facts.js, bin/idea-revenue.js). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const R = require('../lib/revenue');
const LF = require('../lib/launch-facts');

const PLAN = {
  buyer: 'Indie devs running 3+ overnight Claude Code jobs who lose mornings to triage', paymentMethod: 'Stripe Checkout payment link',
  price: { amount: 9, currency: 'usd', interval: 'month', why: 'below a coffee a week; ccusage is free' },
  mvpScope: 'the CLI plus a hosted digest page', mustHaveBeforeCharging: ['checkout', 'privacy and terms pages'],
  launchChannels: [{ name: 'r/ClaudeAI', url: 'https://reddit.com/r/ClaudeAI', why: 'the users' }, 'Show HN'], firstTenUsers: 'reply in the Claude Code GitHub discussions',
};
const ROADMAP = '## M1 — core\n\n## M2 — digest\n\n## M3 — checkout\n';

test('the plan is validated and normalized', () => {
  const ok = R.validatePlan(PLAN);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.plan.price, { amount: 9, currency: 'USD', interval: 'month', why: 'below a coffee a week; ccusage is free' });
  assert.deepEqual(ok.plan.launchChannels[1], { name: 'Show HN' });
  const bad = R.validatePlan({ ...PLAN, buyer: 'x', price: { amount: '9', interval: 'weekly' }, launchChannels: [] });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.errors, ['buyer missing', 'price.amount must be a number', 'price.interval must be month, year or once', 'launchChannels must list something']);
  assert.equal(R.priceText({ amount: 9, currency: 'USD', interval: 'month' }), '$9/month');
  assert.equal(R.priceText({ amount: 49, currency: 'EUR', interval: 'once' }), '49 EUR once');
});

test('the checklist: each step is someone\'s, done or not, with the evidence', () => {
  const plan = R.validatePlan(PLAN).plan;
  const start = R.launchChecklist({ milestonesDone: ['M1'] }, { roadmap: ROADMAP });
  assert.equal(start.total, 9);
  assert.equal(start.done, 0);
  assert.deepEqual(start.next, { id: 'plan', label: 'Road-to-revenue plan written', owner: 'agent' });
  assert.equal(start.steps.find((s) => s.id === 'mvp').evidence, '1/3 milestones merged');

  const later = R.launchChecklist({ milestonesDone: ['M1', 'M2', 'M3'] }, {
    plan, roadmap: ROADMAP, repo: { homepage: 'https://dawnlog.vercel.app', stripeProductId: null, mrr: 0 },
    liveUrl: 'https://dawnlog.vercel.app', legal: { privacy: true, terms: true }, launchPosts: 0, signups: 0,
  });
  assert.equal(later.done, 5);
  assert.deepEqual(later.next, { id: 'payments', label: 'Stripe product created and mapped to the repo in RepoHQ', owner: 'david' });
  assert.equal(later.price, '$9/month');
  assert.equal(later.steps.find((s) => s.id === 'price').label, 'Price: $9/month (from the plan)');

  const paid = R.launchChecklist({ milestonesDone: ['M1', 'M2', 'M3'] }, {
    plan, roadmap: ROADMAP, repo: { stripeProductId: 'prod_123', mrr: 18 }, liveUrl: 'https://x', legal: { privacy: true, terms: true }, launchPosts: 2, signups: 3,
  });
  assert.equal(paid.done, 9);
  assert.equal(paid.next, null);
  assert.equal(paid.steps.find((s) => s.id === 'firstDollar').evidence, '$18.00 MRR');
  assert.equal(R.sameChecklist({ ...paid, updatedAt: 'a' }, { ...paid, updatedAt: 'b' }), true);
  assert.equal(R.sameChecklist(paid, later), false);
});

test('build queues go to the idea closest to money; ties keep approval order', () => {
  const plan = R.validatePlan(PLAN).plan;
  const passedNoPlan = { review: { verdict: 'pass', score: 3 } };
  const validatedWithSignups = { review: { verdict: 'validate', score: 6 }, validation: { decision: 'build' } };
  const planned = { review: { verdict: 'pass', score: 5 }, launch: { done: 3, total: 9 } };
  assert.equal(R.revenueScore(passedNoPlan), 0);
  assert.equal(R.revenueScore(validatedWithSignups, { signups: 7 }), 30 + 7 + 6);
  assert.equal(R.revenueScore(planned, { plan }), 15 + 5 + 7 + 5 - 5);
  const order = R.rankByRevenue([['a', passedNoPlan], ['b', planned, { plan }], ['c', validatedWithSignups, { signups: 7 }], ['d', passedNoPlan]]).map((e) => e[0]);
  assert.deepEqual(order, ['c', 'b', 'a', 'd']);
});

test('live URL: the homepage, then <repo>.vercel.app; legal pages from the repo tree', async () => {
  assert.deepEqual(LF.urlCandidates('https://dawnlog.dev', 'DawnLog'), ['https://dawnlog.dev', 'https://dawnlog.vercel.app']);
  assert.deepEqual(LF.urlCandidates('not a url', 'x'), ['https://x.vercel.app']);
  const seen = [];
  const fetchFn = async (url) => { seen.push(url); if (url.includes('dawnlog.dev')) throw new Error('ENOTFOUND'); return { status: 200 }; };
  assert.equal(await LF.liveUrl(LF.urlCandidates('https://dawnlog.dev', 'dawnlog'), { fetchFn, owned: () => true }), 'https://dawnlog.vercel.app');
  assert.deepEqual(seen, ['https://dawnlog.dev', 'https://dawnlog.vercel.app']);
  // A *.vercel.app name that answers but isn't in the owner's team (someone else's project) doesn't count.
  seen.length = 0;
  assert.equal(await LF.liveUrl(['https://tiebreak.vercel.app'], { fetchFn }), null);
  assert.deepEqual(seen, [], 'not even requested');
  assert.equal(await LF.liveUrl(['https://grantgate.dev'], { fetchFn: async () => ({ status: 200 }) }), 'https://grantgate.dev', 'a homepage needs no team check');
  const inspects = [];
  assert.equal(LF.ownedByTeam('https://x.vercel.app', 'team_1', { exec: (cmd, args) => inspects.push([cmd, ...args]) }), true);
  assert.deepEqual(inspects[0], ['vercel', 'inspect', 'https://x.vercel.app', '--scope', 'team_1']);
  assert.equal(LF.ownedByTeam('https://x.vercel.app', 'team_1', { exec: () => { throw new Error('not found'); } }), false);
  assert.equal(LF.ownedByTeam('https://x.vercel.app', '', { exec: () => {} }), false);
  assert.equal(await LF.liveUrl(['https://a'], { fetchFn: async () => ({ status: 404 }) }), null);
  assert.deepEqual(LF.legalFromPaths(['src/app.js', 'app/privacy/page.tsx', 'public/terms.html']), { privacy: true, terms: true });
  assert.deepEqual(LF.legalFromPaths(['README.md']), { privacy: false, terms: false });
  const calls = [];
  assert.deepEqual(LF.legalPages('o/r', { exec: (cmd, args) => { calls.push([cmd, ...args]); return 'PRIVACY.md\nsrc/x.js\n'; } }), { privacy: true, terms: false });
  assert.equal(calls[0][2], 'repos/o/r/git/trees/HEAD?recursive=1');
  assert.equal(LF.legalPages('o/r', { exec: () => { throw new Error('404'); } }), null);
});

test('the revenue plan run gets the record and gstack\'s startup frameworks, and is told the shape', () => {
  const { revenueInput, prompt, tools } = require('../bin/idea-revenue');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idea-'));
  fs.writeFileSync(path.join(dir, 'PRD.md'), '# PRD\nThe dawnlog problem.');
  const g = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-'));
  fs.mkdirSync(path.join(g, 'office-hours'));
  fs.writeFileSync(path.join(g, 'office-hours', 'SKILL.md'), '## Phase 2A: Startup Mode\nWho pays?\n## Phase 2B\nno\n');
  const input = revenueInput('dawnlog', dir, g);
  assert.match(input, /The dawnlog problem/);
  assert.match(input, /Who pays\?/);
  assert.match(input, /\(no RESEARCH\.md\)/);
  assert.match(input, /From gstack \/plan-ceo-review\n\n\(section not found/);
  const p = prompt('dawnlog', dir, '/in.md');
  assert.match(p, /"price": \{"amount": 19, "currency": "USD", "interval": "month \| year \| once"/);
  assert.match(p, /If the evidence says nobody will pay, say so plainly/);
  assert.ok(tools(dir).includes(`Write(/${dir}/revenue.json)`));
  assert.ok(!tools(dir).some((t) => t.startsWith('Bash')), 'the planner runs no commands');
});
