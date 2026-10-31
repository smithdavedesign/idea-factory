// autonomy.js — the pipeline merges its own PRs and reverts what breaks (policy.autonomy, RepoHQ
// docs/growth-loop-prd.md "Autonomy"). David's call on 2026-10-12: agents merge everything; he reviews
// what was done each morning.
//
//   mergeDecision  whether a pipeline PR merges now, waits for its checks, failed, or is left for David
//   revertSteps    the commands that undo a merged PR: a revert commit on a branch, a PR, merged
//
// The gate: the pipeline's own test run passed, every GitHub check is green (CI where the repo has it,
// GitGuardian, the Vercel preview), no conflicts, and no protected path touched (policy.autonomy
// .protectedPaths: the files that decide what agents may do, such as CI workflows, stay with David).
// A feature PR (the weekly plan's, lib/plan.js) also needs its acceptance criteria met (the build's own check),
// its Vercel preview to pass RepoHQ's smoke test against production, and to stay out of payment code
// (policy.autonomy.ownerOnlyPatterns), which only David merges.

const { authorArgs } = require('./author');

const MINUTE = 60_000;

/** One GitHub check's state, from gh's statusCheckRollup (check runs and commit statuses alike). */
function checkState(c) {
  if (c.__typename === 'StatusContext' || 'state' in c) {
    const s = String(c.state || '').toUpperCase();
    return s === 'SUCCESS' ? 'pass' : s === 'PENDING' || s === 'EXPECTED' ? 'pending' : 'fail';
  }
  if (String(c.status || '').toUpperCase() !== 'COMPLETED') return 'pending';
  return ['SUCCESS', 'NEUTRAL', 'SKIPPED'].includes(String(c.conclusion || '').toUpperCase()) ? 'pass' : 'fail';
}

const checkName = (c) => c.name || c.context || c.workflowName || 'a check';

// A failed check that says nothing about the code: GitHub never started the CI jobs (account billing), or
// Vercel can't deploy for the account (blocked, payment, quota). From 2026-10-20 to 10-30 GitHub Actions
// didn't run on tiebreak ("recent account payments have failed"), and the growth loop closed six PRs whose
// own tests and acceptance had passed; on 2026-10-31 every Vercel check said "Account is blocked."
const ACCOUNT_BLOCK = /account payments have failed|spending limit needs to be increased|account is blocked|payment required|deployment_disabled|exceeded the quota/i;

/** True for a failed check the account blocked, not the code (pure): a Vercel status's description says so, or the pipeline found it in a check run's annotations (`blocked`). */
function accountBlocked(c) {
  return checkState(c) === 'fail' && (c.blocked === true || ACCOUNT_BLOCK.test(String(c.description || '')));
}

/** The protected paths a PR touches: an entry ending in "/" is a folder, anything else a file. */
function protectedTouched(files, protectedPaths = []) {
  return files.filter((f) => protectedPaths.some((p) => (p.endsWith('/') ? f.startsWith(p) : f === p)));
}

/** The files a feature PR may not merge by itself with (pure): payment code, by policy.autonomy.ownerOnlyPatterns. */
function ownerOnlyTouched(files, patterns = []) {
  const res = patterns.map((p) => new RegExp(p, 'i'));
  return files.filter((f) => res.some((re) => re.test(f)));
}

/**
 * What to do with an open pipeline PR (pure). `pr` is `gh pr view --json state,mergeable,statusCheckRollup,
 * files,createdAt`; `build` the idea's state.build. Returns {action, reason}: merge, wait (checks
 * running, or none registered yet), fail (a check or the pipeline's tests failed, or it conflicts),
 * leave (it touches a protected path: David's), or none (not open).
 */
function mergeDecision({ pr, build = {}, protectedPaths = [], ownerOnlyPatterns = [], smoke = null, now = new Date(), settleMinutes = 10 }) {
  if (!pr || pr.state !== 'OPEN') return { action: 'none', reason: 'not open' };
  const files = (pr.files || []).map((f) => f.path || f);
  const touched = protectedTouched(files, protectedPaths);
  if (touched.length) return { action: 'leave', reason: `it changes ${touched.slice(0, 3).join(', ')}, which only David merges` };
  const feature = build.kind === 'feature';
  if (feature) {
    if (build.payments) return { action: 'leave', reason: 'its plan item changes payments, which only David merges' };
    const pay = ownerOnlyTouched(files, ownerOnlyPatterns);
    if (pay.length) return { action: 'leave', reason: `it changes payment code (${pay.slice(0, 3).join(', ')}), which only David merges` };
  }
  if (build.testsPassing === false) return { action: 'fail', reason: "its tests failed in the pipeline's run" };
  if (feature && build.acceptance?.verdict === 'fail') return { action: 'fail', reason: `acceptance criteria not met: ${(build.acceptance.unmet || []).slice(0, 2).join('; ').slice(0, 200) || 'see the PR'}` };
  const checks = pr.statusCheckRollup || [];
  const failed = checks.filter((c) => checkState(c) === 'fail');
  const real = failed.filter((c) => !accountBlocked(c));
  if (real.length) return { action: 'fail', reason: `${real.map(checkName).slice(0, 3).join(', ')} failed` };
  // Only account blocks: the PR waits (never closed for it) until GitHub or Vercel runs the checks again.
  if (failed.length) return { action: 'wait', blocked: true, reason: `${[...new Set(failed.map(checkName))].slice(0, 3).join(', ')} couldn't run: the GitHub or Vercel account is blocked (billing), not the code` };
  if (checks.some((c) => checkState(c) === 'pending')) return { action: 'wait', reason: 'checks still running' };
  // Checks register a few seconds to minutes after a push; a repo with none merges on its tests alone.
  if (!checks.length && now - new Date(pr.createdAt || 0) < settleMinutes * MINUTE) return { action: 'wait', reason: 'waiting for checks to register' };
  if (pr.mergeable === 'CONFLICTING') return { action: 'fail', reason: 'it conflicts with main' };
  if (pr.mergeable === 'UNKNOWN') return { action: 'wait', reason: 'GitHub is still computing mergeability' };
  // A feature merges only after its preview passed the smoke test, for the commit that's on the PR now.
  if (feature) {
    const head = pr.headRefOid || null;
    if (!smoke || (head && smoke.sha && smoke.sha !== head)) return { action: 'smoke', reason: 'checks green: the preview smoke test runs next' };
    if (smoke.verdict === 'fail') return { action: 'fail', reason: `the preview breaks pages that work on production: ${(smoke.reasons || []).slice(0, 2).join('; ').slice(0, 200)}` };
    // A preview still deploying is tried again after 10 minutes.
    if (smoke.verdict === 'skipped' && /not ready|building|pending/i.test((smoke.reasons || []).join(' '))) {
      return now - new Date(smoke.at || 0) >= 10 * MINUTE ? { action: 'smoke', reason: 'the preview was still deploying: smoke-testing it again' } : { action: 'wait', reason: 'the preview is still deploying' };
    }
  }
  return { action: 'merge', reason: checks.length ? `${checks.length} check${checks.length === 1 ? '' : 's'} green, tests passing` : 'tests passing (the repo has no checks)' };
}

/**
 * The commands that undo a merged PR (pure): branch revert-<n> from main, `git revert` the merge commit
 * (`-m 1` for a true merge commit), push, open a PR that says why, and merge it. `parents` is the merge
 * commit's parent count; `sha` its id; `author` who the revert commit is by (lib/author.js).
 */
function revertSteps({ repoFull, prUrl, number, title, sha, parents = 1, reason, work, author = null }) {
  const branch = `revert-${number}`;
  const body = `Reverted by the idea pipeline: ${reason}\n\nThis undoes ${prUrl} (\`${sha.slice(0, 7)}\`). David's rule (2026-10-12): agents merge their own PRs and revert what breaks; he reviews it in the morning email.`;
  return [
    ['gh', ['repo', 'clone', repoFull, work, '--', '-q']],
    ['git', ['checkout', '-q', '-b', branch], work],
    ['git', [...authorArgs(author), 'revert', '--no-edit', ...(parents > 1 ? ['-m', '1'] : []), sha], work],
    ['git', ['push', '-q', '-u', 'origin', branch], work],
    ['gh', ['pr', 'create', '--base', 'main', '--head', branch, '--title', `Revert: ${title}`.slice(0, 200), '--body', body], work],
    ['gh', ['pr', 'merge', branch, '--squash', '--delete-branch'], work],
  ];
}

module.exports = { ACCOUNT_BLOCK, accountBlocked, checkState, protectedTouched, ownerOnlyTouched, mergeDecision, revertSteps };
