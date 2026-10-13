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
  // Builds are capped by how many run at once (David, 2026-10-13), not per week.
  assert.ok(policy.build.concurrency.max <= 3 && policy.validation.maxValidating <= 5);
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

test('the weekly cap counts roadmap builds only', () => {
  const at = '2026-10-18T00:00:00Z';
  assert.equal(P.buildsThisWeek([{ build: { at, milestone: 'MVP' } }, { build: { at, milestone: 'GOLIVE' } }, { build: { at, milestone: 'GROWTH' } }], now), 1, 'go-live and growth builds have their own caps');
  assert.equal(P.isRoadmapBuild('M2'), true);
  assert.equal(P.isRoadmapBuild(undefined), true, 'old records without a milestone were M1 builds');
  assert.equal(P.isRoadmapBuild('GOLIVE'), false);
});

test('new builds wait until a focus product has traction (policy.build.startNew false)', () => {
  const held = { build: { startNew: false }, growth: { focus: ['tb'], minVisitorsPerWeek: 50 } };
  assert.equal(P.newBuildsHeld(held, [['tb', { stage: 'live' }]]), true, 'no funnel yet: held');
  assert.equal(P.newBuildsHeld(held, [['tb', { funnel: { d7: { visit: 49 } } }]]), true);
  assert.equal(P.newBuildsHeld(held, [['tb', { funnel: { d7: { visit: 50 } } }]]), false, 'a focus product with traction lifts the hold');
  assert.equal(P.newBuildsHeld(held, [['other', { funnel: { d7: { visit: 500 } } }]]), true, 'only focus products count');
  assert.equal(P.newBuildsHeld({ build: {} }, []), false, 'without the setting nothing is held');
  assert.equal(policy.build.startNew, false, "David's call on 2026-10-12: distribution before more MVPs");
  assert.ok(policy.growth.focus.includes('tiebreak'));
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

test('orchestrator: David\'s decision on the Ideas page wins; daily steps once a day after 09:30; who gets built', () => {
  const { applyDecision, dailyDue, buildable } = require('../bin/idea-pipeline');
  const now = new Date('2026-10-13T07:00:00Z');
  const decide = (state, decision, opts = {}) => applyDecision(state, { decision, note: opts.note }, { now, reviewed: opts.reviewed ?? true });
  assert.deepEqual(decide({ stage: 'validate' }, 'pass').state, { stage: 'pass', passReason: 'owner', ownerDecision: { decision: 'pass', at: now.toISOString(), source: 'repohq' } });
  const build = decide({ stage: 'pass' }, 'build', { note: 'focus on the CLI' }); // David overrides a pass
  assert.deepEqual([build.state.stage, build.state.ownerApproved, build.state.ownerDecision.note, build.what], ['build', true, 'focus on the CLI', 'owner set Build (RepoHQ Ideas page)']);
  assert.deepEqual(decide({ stage: 'repo' }, 'build').state.ownerApproved, true);   // approves M1 of a repo the review passed
  assert.match(decide({ stage: 'repo', ownerApproved: true }, 'build').error, /past the build decision/);
  assert.match(decide({ stage: 'building' }, 'build').error, /past the build decision/);
  assert.match(decide({ stage: 'live' }, 'build').error, /already live/);
  assert.equal(decide({ stage: 'pass' }, 'validate').state.stage, 'validate');      // a passed idea to a demand test
  assert.match(decide({ stage: 'idea' }, 'validate', { reviewed: false }).error, /landing-page copy/);
  assert.match(decide({ stage: 'building' }, 'validate').error, /not yet being built/);
  assert.equal(decide({ stage: 'pass', page: { url: 'https://p' } }, 'validate').state.validation.startedAt, now.toISOString()); // a fresh window
  // Agreeing with where the idea already is: recorded, so nobody asks again.
  assert.deepEqual([decide({ stage: 'pass' }, 'pass').state.stage, decide({ stage: 'pass' }, 'pass').what], ['pass', 'owner confirmed Pass (RepoHQ Ideas page)']);
  assert.match(decide({ stage: 'idea' }, 'ship').error, /unknown decision/);
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

test('build engine: the subscription first; the free pool only when the subscription has no capacity', () => {
  const { capacityFailure } = require('../lib/claude');
  for (const r of ["Claude AI usage limit reached|1791700000", 'API Error: 429 rate_limit_error', 'Invalid API key · Please run /login', 'Claude Code not found at /x', 'API Error: 529 overloaded'])
    assert.equal(capacityFailure(r), true, r);
  for (const r of ['tests still failing after 3 attempts', 'timed out after 45 min', 'MCP servers/connectors were loaded', '', null])
    assert.equal(capacityFailure(r), false, String(r));
  assert.equal(policy.build.engine, 'claude-subscription');
  assert.equal(policy.build.fallback, 'free-agent');
});

test('milestones: read from ROADMAP.md headings, next after the merged ones', () => {
  const { milestones, nextMilestone, prompt } = require('../bin/idea-build');
  const roadmap = '# Roadmap\n## M1 — weekend MVP\n...\n## M2: accounts\n...\n### M3 payments\n## Stack';
  assert.deepEqual(milestones(roadmap), ['M1', 'M2', 'M3']);
  assert.equal(nextMilestone(roadmap, ['M1']), 'M2');
  assert.equal(nextMilestone(roadmap, ['M1', 'M2', 'M3']), null);
  assert.match(prompt('x', 'M2'), /Build ROADMAP\.md's M2 and nothing beyond it \(earlier milestones are already built/);
  assert.match(prompt('x'), /Scaffold the smallest stack/);
  assert.doesNotMatch(prompt('x'), /owner approved this build with a note/);
  assert.match(prompt('x', 'M1', 'Target co-hosts, not owners'), /owner approved this build with a note[\s\S]*Target co-hosts, not owners/);
});

test('idea builds ask the tier advisor; Claude stays first unless it acts and rates the milestone routine', () => {
  const { milestoneText, engineOrder } = require('../bin/idea-build');
  const roadmap = '# Roadmap\n## M1 — MVP\nbuild the core\n- exit: x\n## M2: accounts\nlogins\n## Stack\nnext';
  assert.equal(milestoneText(roadmap, 'M2'), '## M2: accounts\nlogins');
  assert.match(milestoneText(roadmap, 'M1'), /build the core[\s\S]*exit: x/);
  assert.equal(milestoneText(roadmap, 'M9'), '');
  assert.deepEqual(engineOrder(1, 'report'), ['claude', 'free']);
  assert.deepEqual(engineOrder(3, 'act'), ['claude', 'free']);
  assert.deepEqual(engineOrder(1, 'act'), ['free', 'claude']);
  assert.equal(policy.build.advisor, 'report');
});

test('system log: events are one JSON line in the shared file, best-effort', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'events-'));
  process.env.SYSTEM_EVENTS_DIR = dir;
  delete require.cache[require.resolve('../lib/events')];
  const { emit } = require('../lib/events');
  emit({ component: 'pipeline', event: 'tick', status: 'fail', message: 'x', subject: { idea: 'permitly' } });
  emit({ component: 'review', event: 'run', status: 'ok', message: 'pass 4/10' });
  const lines = fs.readFileSync(path.join(dir, 'events.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(lines.length, 2);
  assert.deepEqual([lines[0].system, lines[0].component, lines[0].status, lines[0].level, lines[0].subject.idea], ['idea-factory', 'pipeline', 'fail', 'error', 'permitly']);
  assert.equal(lines[1].level, 'info');
  delete process.env.SYSTEM_EVENTS_DIR;
});

test('RepoHQ Ideas page: the record mirrored per idea, unchanged ideas skipped, nothing written to Notion', async () => {
  const R = require('../lib/repohq');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'repohq-'));
  const dir = path.join(home, 'permitly');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'idea.json'), JSON.stringify({ title: 'permitly — permit tracker', oneLiner: 'x' }));
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ stage: 'validate', updatedAt: '2026-10-11T00:00:00Z' }));
  fs.writeFileSync(path.join(dir, 'PRD.md'), '# PRD');
  const rec = R.ideaRecord(dir, 'permitly');
  assert.deepEqual([rec.title, rec.stage, rec.review, rec.docs, rec.updatedAt], ['permitly — permit tracker', 'validate', null, { prd: '# PRD' }, '2026-10-11T00:00:00Z']);
  assert.equal('notionUrl' in rec, false);
  assert.equal(R.ideaRecord(dir, 'permitly').hash, rec.hash); // stable
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ stage: 'pass' }));
  assert.notEqual(R.ideaRecord(dir, 'permitly').hash, rec.hash);
  // The launch kit (the launch skill's checked channels) goes to RepoHQ too, and its edits resync the row.
  fs.writeFileSync(path.join(dir, 'LAUNCH-KIT.md'), '# Launch kit\n\n## Order\n1. **r/AirBnBHosts**');
  const withKit = R.ideaRecord(dir, 'permitly');
  assert.equal(withKit.docs.launchKit, '# Launch kit\n\n## Order\n1. **r/AirBnBHosts**');
  fs.unlinkSync(path.join(dir, 'LAUNCH-KIT.md'));

  // A stand-in for the neon tagged template: SELECT returns the stored hashes, writes are recorded.
  const calls = [];
  const sql = async (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    calls.push({ text, values });
    return text.startsWith('SELECT slug, hash') ? [{ slug: 'same', hash: 'h1' }, { slug: 'gone', hash: 'h2' }] : [];
  };
  const written = await R.syncIdeas(sql, [{ ...rec, slug: 'same', hash: 'h1' }, { ...rec, slug: 'new' }]);
  assert.deepEqual(written, ['new']);
  assert.equal(calls.filter((c) => c.text.startsWith('INSERT INTO ideas')).length, 1);
  assert.doesNotMatch(calls.find((c) => c.text.startsWith('INSERT INTO ideas')).text, /notion_url/);
  assert.deepEqual(calls.find((c) => c.text.startsWith('DELETE FROM ideas')).values, [['gone']]);
  assert.match(R.explain({ code: '42P01', message: 'relation "ideas" does not exist' }).message, /db:push/);
});

test('RepoHQ Ideas page: a new idea goes into the research queue, and is marked researched with its slug', async () => {
  const R = require('../lib/repohq');
  const rows = { pending: [{ id: 1, text: 'warn co-hosts about rule changes' }, { id: 2, text: 'x' }], queued: [{ id: 3, seed_id: 'seed-old' }] };
  const writes = [];
  const sql = async (strings, ...values) => {
    const text = strings.join('?').replace(/\s+/g, ' ').trim();
    if (text.startsWith("SELECT id, text FROM idea_seeds")) return rows.pending;
    if (text.startsWith('SELECT id, seed_id FROM idea_seeds')) return rows.queued;
    writes.push({ text, values });
    return text.includes('RETURNING') ? [{ id: values[values.length - 1] }] : [];
  };
  const seed = (t) => { if (t.length < 8) throw new Error('too short'); return { id: 'seed-new' }; };
  const notes = await R.syncSeeds(sql, { seed, seeds: [{ id: 'seed-old', status: 'done' }], slugForSeed: (id) => (id === 'seed-old' ? 'leakwatch' : null) });
  assert.deepEqual(notes, ['queued seed-new', 'researched seed-old → leakwatch']);
  assert.match(writes.find((w) => w.values.includes('too short')).text, /status = 'failed'/);
  assert.deepEqual(writes.find((w) => /status = 'researched'/.test(w.text)).values, ['leakwatch', 3]);
});
