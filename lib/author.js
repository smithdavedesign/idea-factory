// author.js — who the pipeline's commits on product repos are by: the name "idea-factory", with the
// owner's GitHub noreply address (<id>+<login>@users.noreply.github.com), so GitHub credits the
// owner's account. Vercel's free plan only deploys a private repo's commits made by its owner: as
// "idea-factory@users.noreply.github.com" (a stranger's GitHub account) every pipeline PR's preview was
// blocked, and the autonomy gate left every PR for David (tiebreak#1, codespend#3, 2026-10-12).
const { execFileSync } = require('child_process');

let cached;

/** {name, email} from the gh login (one `gh api user` per process), or null when gh can't say. */
function commitAuthor({ exec = execFileSync } = {}) {
  if (cached !== undefined) return cached;
  try {
    const [id, login] = String(exec('gh', ['api', 'user', '--jq', '[.id, .login] | @tsv'], { encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'ignore'] })).trim().split('\t');
    cached = /^\d+$/.test(id || '') && /^[A-Za-z0-9-]+$/.test(login || '') ? { name: 'idea-factory', email: `${id}+${login}@users.noreply.github.com` } : null;
  } catch { cached = null; }
  return cached;
}

/** `git -c` arguments for an author (pure); none, so git's own identity, when there's no author. */
function authorArgs(author) {
  return author ? ['-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`] : [];
}

module.exports = { commitAuthor, authorArgs, _resetAuthor: () => { cached = undefined; } };
