// launch-facts.js — what the pipeline checks live for each idea's launch checklist (lib/revenue.js):
// does the product answer at a URL, and does its repo have privacy and terms pages. Both are cached in
// the pipeline state, so a tick makes at most a handful of requests.
const { execFileSync } = require('child_process');

/** The URLs a product could answer at: RepoHQ's homepage for the repo, then <repo>.vercel.app (pure). */
function urlCandidates(homepage, repoName) {
  const out = [];
  if (homepage && /^https?:\/\//.test(homepage)) out.push(homepage);
  if (repoName) out.push(`https://${repoName.toLowerCase()}.vercel.app`);
  return [...new Set(out)];
}

/** The first candidate that answers with a status below 400, or null. Never throws. */
async function liveUrl(candidates, { fetchFn = globalThis.fetch, timeoutMs = 8000 } = {}) {
  for (const url of candidates) {
    try {
      const res = await fetchFn(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
      if (res.status < 400) return url;
    } catch { /* not live there */ }
  }
  return null;
}

/** Privacy and terms pages from a list of repo paths (pure): any file named like them, in any folder. */
function legalFromPaths(paths) {
  const has = (re) => paths.some((p) => re.test(p.split('/').pop()) || re.test(p));
  return { privacy: has(/privacy/i), terms: has(/terms|tos\b|terms-of-service/i) };
}

/** {privacy, terms} for owner/repo's default branch via gh, or null when gh can't say. */
function legalPages(fullName, { exec = execFileSync } = {}) {
  try {
    const out = exec('gh', ['api', `repos/${fullName}/git/trees/HEAD?recursive=1`, '--jq', '.tree[].path'], { encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'ignore'] });
    return legalFromPaths(out.split('\n').filter(Boolean));
  } catch { return null; }
}

module.exports = { urlCandidates, liveUrl, legalFromPaths, legalPages };
