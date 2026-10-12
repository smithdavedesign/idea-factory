// The pipeline merging its own PRs and reverting what breaks (lib/autonomy.js, policy.autonomy). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../lib/autonomy');

const NOW = new Date('2026-10-13T12:00:00Z');
const run = (name, conclusion, status = 'COMPLETED') => ({ __typename: 'CheckRun', name, status, conclusion });
const ctx = (context, state) => ({ __typename: 'StatusContext', context, state });
const open = (over = {}) => ({ state: 'OPEN', mergeable: 'MERGEABLE', createdAt: '2026-10-13T11:00:00Z', files: [{ path: 'app/page.tsx' }],
  statusCheckRollup: [run('web', 'SUCCESS'), run('GitGuardian Security Checks', 'SUCCESS'), ctx('Vercel', 'SUCCESS')], ...over });
const decide = (pr, build = { testsPassing: true }) => A.mergeDecision({ pr, build, protectedPaths: ['.github/workflows/', 'policy.json'], now: NOW });

test('merges once its tests passed and every check is green', () => {
  assert.deepEqual(decide(open()), { action: 'merge', reason: '3 checks green, tests passing' });
  assert.equal(decide(open({ statusCheckRollup: [run('web', 'SUCCESS'), run('lint', 'SKIPPED'), run('deploy', 'NEUTRAL')] })).action, 'merge', 'skipped and neutral count as green');
});

test('waits while checks run, or until they register; a repo without checks merges on its tests', () => {
  assert.deepEqual(decide(open({ statusCheckRollup: [run('web', null, 'IN_PROGRESS')] })), { action: 'wait', reason: 'checks still running' });
  assert.equal(decide(open({ statusCheckRollup: [ctx('Vercel', 'PENDING')] })).action, 'wait');
  assert.equal(decide(open({ statusCheckRollup: [], createdAt: '2026-10-13T11:55:00Z' })).action, 'wait', 'opened 5 minutes ago, nothing registered yet');
  assert.deepEqual(decide(open({ statusCheckRollup: [], createdAt: '2026-10-13T11:00:00Z' })), { action: 'merge', reason: 'tests passing (the repo has no checks)' });
  assert.equal(decide(open({ mergeable: 'UNKNOWN' })).action, 'wait');
});

test("fails on a red check, the pipeline's failed tests, or a conflict", () => {
  assert.deepEqual(decide(open({ statusCheckRollup: [run('web', 'FAILURE'), ctx('Vercel', 'SUCCESS')] })), { action: 'fail', reason: 'web failed' });
  assert.equal(decide(open({ statusCheckRollup: [ctx('Vercel', 'ERROR')] })).action, 'fail');
  assert.deepEqual(decide(open(), { testsPassing: false }), { action: 'fail', reason: "its tests failed in the pipeline's run" });
  assert.deepEqual(decide(open({ mergeable: 'CONFLICTING' })), { action: 'fail', reason: 'it conflicts with main' });
});

test('leaves a PR that touches a protected path for David, and ignores one that is no longer open', () => {
  assert.deepEqual(decide(open({ files: [{ path: 'app/page.tsx' }, { path: '.github/workflows/ci.yml' }] })), { action: 'leave', reason: 'it changes .github/workflows/ci.yml, which only David merges' });
  assert.equal(decide(open({ files: [{ path: 'docs/policy.json.md' }] })).action, 'merge', 'a file entry matches that exact path only');
  assert.equal(decide({ state: 'MERGED' }).action, 'none');
});

test('a revert: branch, git revert (with -m 1 for a merge commit), push, a PR that says why, merged', () => {
  const steps = A.revertSteps({ repoFull: 'o/tiebreak', prUrl: 'https://github.com/o/tiebreak/pull/9', number: 9, title: 'Growth: tiebreak (search pages)', sha: 'abcdef1234567890', reason: 'launch checks failed', work: '/w/revert' });
  assert.deepEqual(steps.map(([cmd, args]) => `${cmd} ${args.slice(0, 2).join(' ')}`), ['gh repo clone', 'git checkout -q', 'git -c user.name=idea-factory', 'git push -q', 'gh pr create', 'gh pr merge']);
  assert.ok(steps[2][1].includes('revert') && !steps[2][1].includes('-m'), 'a squash merge is a plain commit');
  assert.ok(A.revertSteps({ repoFull: 'o/x', prUrl: 'u', number: 1, title: 't', sha: 'abcdef1', parents: 2, reason: 'r', work: '/w' })[2][1].includes('-m'));
  const create = steps[4][1];
  assert.equal(create[create.indexOf('--title') + 1], 'Revert: Growth: tiebreak (search pages)');
  assert.match(create[create.indexOf('--body') + 1], /Reverted by the idea pipeline: launch checks failed/);
});
