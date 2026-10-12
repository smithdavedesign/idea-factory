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

/** The protected paths a PR touches: an entry ending in "/" is a folder, anything else a file. */
function protectedTouched(files, protectedPaths = []) {
  return files.filter((f) => protectedPaths.some((p) => (p.endsWith('/') ? f.startsWith(p) : f === p)));
}

/**
 * What to do with an open pipeline PR (pure). `pr` is `gh pr view --json state,mergeable,statusCheckRollup,
 * files,createdAt`; `build` the idea's state.build. Returns {action, reason}: merge, wait (checks
 * running, or none registered yet), fail (a check or the pipeline's tests failed, or it conflicts),
 * leave (it touches a protected path: David's), or none (not open).
 */
function mergeDecision({ pr, build = {}, protectedPaths = [], now = new Date(), settleMinutes = 10 }) {
  if (!pr || pr.state !== 'OPEN') return { action: 'none', reason: 'not open' };
  const touched = protectedTouched((pr.files || []).map((f) => f.path || f), protectedPaths);
  if (touched.length) return { action: 'leave', reason: `it changes ${touched.slice(0, 3).join(', ')}, which only David merges` };
  if (build.testsPassing === false) return { action: 'fail', reason: "its tests failed in the pipeline's run" };
  const checks = pr.statusCheckRollup || [];
  const failed = checks.filter((c) => checkState(c) === 'fail');
  if (failed.length) return { action: 'fail', reason: `${failed.map(checkName).slice(0, 3).join(', ')} failed` };
  if (checks.some((c) => checkState(c) === 'pending')) return { action: 'wait', reason: 'checks still running' };
  // Checks register a few seconds to minutes after a push; a repo with none merges on its tests alone.
  if (!checks.length && now - new Date(pr.createdAt || 0) < settleMinutes * MINUTE) return { action: 'wait', reason: 'waiting for checks to register' };
  if (pr.mergeable === 'CONFLICTING') return { action: 'fail', reason: 'it conflicts with main' };
  if (pr.mergeable === 'UNKNOWN') return { action: 'wait', reason: 'GitHub is still computing mergeability' };
  return { action: 'merge', reason: checks.length ? `${checks.length} check${checks.length === 1 ? '' : 's'} green, tests passing` : 'tests passing (the repo has no checks)' };
}

/**
 * The commands that undo a merged PR (pure): branch revert-<n> from main, `git revert` the merge commit
 * (`-m 1` for a true merge commit), push, open a PR that says why, and merge it. `parents` is the merge
 * commit's parent count; `sha` its id.
 */
function revertSteps({ repoFull, prUrl, number, title, sha, parents = 1, reason, work }) {
  const branch = `revert-${number}`;
  const body = `Reverted by the idea pipeline: ${reason}\n\nThis undoes ${prUrl} (\`${sha.slice(0, 7)}\`). David's rule (2026-10-12): agents merge their own PRs and revert what breaks; he reviews it in the morning email.`;
  return [
    ['gh', ['repo', 'clone', repoFull, work, '--', '-q']],
    ['git', ['checkout', '-q', '-b', branch], work],
    ['git', ['-c', 'user.name=idea-factory', '-c', 'user.email=idea-factory@users.noreply.github.com', 'revert', '--no-edit', ...(parents > 1 ? ['-m', '1'] : []), sha], work],
    ['git', ['push', '-q', '-u', 'origin', branch], work],
    ['gh', ['pr', 'create', '--base', 'main', '--head', branch, '--title', `Revert: ${title}`.slice(0, 200), '--body', body], work],
    ['gh', ['pr', 'merge', branch, '--squash', '--delete-branch'], work],
  ];
}

module.exports = { checkState, protectedTouched, mergeDecision, revertSteps };
