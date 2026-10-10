// The idea lifecycle's decisions. Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const P = require('../lib/pipeline');
const policy = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'policy.json'), 'utf8'));

const goodReview = (over = {}) => ({
  verdict: 'validate', score: 7.5, summary: 'Clear, specific pain with a weekend-sized wedge.',
  forcingQuestions: Object.fromEntries(P.QUESTIONS.map((q) => [q, { score: 7, evidence: 'thread X shows Y' }])),
  feasibility: { zeroCost: true, m1Weekend: true, notes: 'static + serverless' },
  landing: { headline: 'Split trip costs offline', subhead: 'No app installs, settle up later.', bullets: ['Works offline', 'Any currency'], cta: 'Join the waitlist' },
  launch: { channels: [{ name: 'r/travel' }], post: 'Built a thing…' },
  ...over,
});

test('policy keeps the owner at $0 and decisions small', () => {
  assert.equal(policy.maxMonthlySpendUsd, 0);
  assert.ok(policy.build.maxPerWeek <= 1 && policy.validation.maxValidating <= 5);
});

test('review: a complete validate review passes through', () => {
  const r = P.validateReview(goodReview(), policy);
  assert.equal(r.ok, true);
  assert.equal(r.review.verdict, 'validate');
});

test('review: missing forcing questions or landing copy are errors the reviewer must fix', () => {
  const r = P.validateReview(goodReview({ forcingQuestions: { demand: { score: 5, evidence: 'x' } }, landing: { headline: 'x' } }), policy);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /statusQuo/.test(e)) && r.errors.some((e) => /landing/.test(e)));
  assert.equal(P.validateReview(null, policy).ok, false);
});

test('review: policy overrides a "validate" that scores too low or needs money', () => {
  const low = P.validateReview(goodReview({ score: 4 }), policy).review;
  assert.equal(low.verdict, 'pass');
  assert.match(low.policyOverride, /below 6/);
  const paid = P.validateReview(goodReview({ feasibility: { zeroCost: false, m1Weekend: true } }), policy).review;
  assert.equal(paid.verdict, 'pass');
  assert.match(paid.policyOverride, /\$0/);
  // A "pass" needs no landing copy.
  assert.equal(P.validateReview(goodReview({ verdict: 'pass', landing: undefined, launch: undefined }), policy).ok, true);
});

test('landing page: escapes all copy, posts views and signups, has a honeypot, refuses bad slugs', () => {
  const html = P.renderLanding({ slug: 'tripsplit', signalUrl: 'https://repohq.vercel.app/api/ideas/signal',
    landing: { headline: '<script>alert(1)</script> Split', subhead: 'A & B "quoted"', bullets: ['<b>x</b>', 'y'], cta: 'Join' } });
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; Split/);
  assert.match(html, /A &amp; B &quot;quoted&quot;/);
  assert.match(html, /<li>&lt;b&gt;x&lt;\/b&gt;<\/li>/);
  assert.match(html, /kind:'view'/);
  assert.match(html, /kind:'signup',email:f\.email\.value,website:f\.website\.value/);
  assert.match(html, /class="hp" type="text" name="website"/);
  assert.match(html, /"https:\/\/repohq\.vercel\.app\/api\/ideas\/signal"/);
  assert.match(html, /Not built yet/); // honest: it's a demand test
  assert.throws(() => P.renderLanding({ slug: '../x', landing: {}, signalUrl: '' }), /bad slug/);
});

const now = new Date('2026-10-20T12:00:00Z');
const state = (over = {}) => ({ stage: 'validate', validation: { startedAt: '2026-10-06T12:00:00Z', decideAfter: '2026-10-20T00:00:00Z', extensions: 0, ...over } });

test('decision: wait while the window is open, unless the signal is already strong', () => {
  const open = state({ decideAfter: '2026-10-25T00:00:00Z' });
  assert.equal(P.decideValidation(open, { uniqueVisitors: 30, signups: 1 }, policy, now).decision, 'wait');
  assert.equal(P.decideValidation(open, { uniqueVisitors: 80, signups: 12 }, policy, now).decision, 'build');
});

test('decision: too few visitors is untested — extend once, then park', () => {
  const d = P.decideValidation(state(), { uniqueVisitors: 20, signups: 3 }, policy, now);
  assert.equal(d.decision, 'extend');
  assert.match(d.reason, /share the launch post/);
  assert.equal(P.decideValidation(state({ extensions: 1 }), { uniqueVisitors: 20, signups: 3 }, policy, now).decision, 'pass');
});

test('decision: enough visitors — build on signal, pass without', () => {
  assert.equal(P.decideValidation(state(), { uniqueVisitors: 100, signups: 6 }, policy, now).decision, 'build');
  const no = P.decideValidation(state(), { uniqueVisitors: 120, signups: 2 }, policy, now);
  assert.equal(no.decision, 'pass');
  assert.match(no.reason, /2 signups from 120 visitors/);
  // Plenty of signups but a tiny rate is still a pass.
  assert.equal(P.decideValidation(state(), { uniqueVisitors: 1000, signups: 6 }, policy, now).decision, 'pass');
});

test('validation windows and the weekly build cap', () => {
  const v = P.startValidation(now, policy);
  assert.equal(new Date(v.decideAfter) - now, policy.validation.days * 86_400_000);
  assert.equal(P.extendValidation(v, now, policy).extensions, 1);
  assert.equal(P.buildsThisWeek([{ build: { at: '2026-10-18T00:00:00Z' } }, { build: { at: '2026-10-01T00:00:00Z' } }, {}], now), 1);
});

test('state records round-trip and reject unknown stages', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'state-'));
  assert.deepEqual(P.readState(dir), { stage: 'idea' });
  const s = P.writeState(dir, { stage: 'validate', page: { url: 'https://p' } }, now);
  assert.equal(s.updatedAt, now.toISOString());
  assert.equal(P.readState(dir).page.url, 'https://p');
  assert.throws(() => P.writeState(dir, { stage: 'shipped' }), /unknown stage/);
});

test('review input: gstack sections are extracted by heading, and all exist in the installed gstack', () => {
  const { extractSection, GSTACK_SECTIONS } = require('../bin/idea-review');
  const md = '# T\n## A\na1\n### A.1\na2\n## B\nb1';
  assert.equal(extractSection(md, /^## A/, /^## /), '## A\na1\n### A.1\na2');
  assert.equal(extractSection(md, /^## B/, /^## /), '## B\nb1');
  assert.equal(extractSection(md, /^## Z/, /^## /), '');
  const gstack = path.join(os.homedir(), '.claude', 'skills', 'gstack');
  if (!fs.existsSync(gstack)) return; // CI without gstack
  for (const [skill, start, stop] of GSTACK_SECTIONS) {
    const text = extractSection(fs.readFileSync(path.join(gstack, skill, 'SKILL.md'), 'utf8'), start, stop);
    assert.ok(text.length > 300, `gstack /${skill} section ${start} not found — gstack changed its headings`);
  }
});

test('orchestrator: David\'s Notion status wins; daily steps once a day after 09:30; who gets built', () => {
  const { ownerOverride, dailyDue, buildable } = require('../bin/idea-pipeline');
  assert.equal(ownerOverride('validate', 'Pass'), 'pass');
  assert.equal(ownerOverride('pass', 'Build'), 'build');      // David overrides a pass
  assert.equal(ownerOverride('idea', 'Live'), 'live');
  assert.equal(ownerOverride('validate', 'Validate'), null);  // in sync
  assert.equal(ownerOverride('repo', 'Repo Created'), null);
  assert.equal(ownerOverride('building', 'Build'), null);     // already past build
  const at = (h, m, d = 10) => new Date(2026, 9, d, h, m);
  assert.equal(dailyDue(undefined, at(9, 29)), false);
  assert.equal(dailyDue(undefined, at(9, 30)), true);
  assert.equal(dailyDue(at(9, 30).toLocaleDateString('en-CA'), at(15, 0)), false);
  assert.equal(dailyDue(at(9, 30).toLocaleDateString('en-CA'), at(9, 45, 11)), true);
  assert.equal(buildable({ stage: 'repo', review: { verdict: 'validate' } }), true);
  assert.equal(buildable({ stage: 'repo', review: { verdict: 'pass' } }), false);
  assert.equal(buildable({ stage: 'repo', review: { verdict: 'pass' }, ownerApproved: true }), true);
  assert.equal(buildable({ stage: 'repo' }), false); // old-pipeline repo, never reviewed or approved
  assert.equal(buildable({ stage: 'repo', ownerApproved: true, build: { status: 'pr-open' } }), false);
  assert.equal(buildable({ stage: 'repo', ownerApproved: true, build: { status: 'failed', retried: true } }), false);
});
