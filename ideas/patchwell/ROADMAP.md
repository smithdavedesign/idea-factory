# patchwell — roadmap

## M1 — Lockfile health report (one weekend)
The free lead-magnet and the demand test: upload or link a lockfile, get a report.

Deliverables:
- Parser for package-lock.json (v2/v3) and pnpm-lock.yaml that lists direct and transitive npm packages with versions.
- OSV.dev `querybatch` lookup, mapping advisories to the fixed version.
- Rule set for Next.js and React: flag versions in the React2Shell-affected ranges and recommend the patched release in the same line.
- Static HTML/Markdown report (exposure summary, table of vulnerable packages, recommended upgrade commands).
- Single-page web form (paste lockfile) with email capture for the weekly report waitlist.

Exit criteria (tests can run these):
- Given a fixture lockfile with `next@15.5.6`, the report lists it as critical and recommends `15.5.7`.
- Given a fixture with `next@15.5.7` and `react@19.2.1`, the report shows no critical findings for those packages.
- Given a fixture with `react@19.1.0`, the report recommends `19.1.2`.
- Given a lockfile with 3 vulnerable packages and 50 clean ones, the report contains exactly 3 rows in the vulnerable table.
- Given invalid JSON, the tool returns a clear error and exit code 1, not a stack trace.
- OSV calls are mocked in tests; a request with 200 packages makes at most 1 batch call.

## M2 — Portfolio and weekly report
Deliverables:
- Agency account (magic-link email login), add repos by URL, read-only GitHub token or lockfile upload.
- Portfolio page sorted by exposure.
- Weekly white-label email (agency logo and name) with one section per site.
- Emergency alert when a new advisory matches a stored lockfile.

Exit criteria:
- Adding 3 sites with 1 vulnerable lockfile produces a portfolio page ordering the vulnerable one first.
- A scheduled run with a new mocked advisory matching one site sends exactly 1 alert email within the run.
- Weekly report HTML contains the agency name and no mention of patchwell branding when white-label is on.

## M3 — Patch PRs (paid pilot)
Deliverables:
- GitHub App with selected-repository install and contents:write + pull_requests:write only.
- Branch, lockfile update, grouped patch-level PR; opened as ready only if the repo's CI passes on the branch, otherwise as draft labeled "needs human".
- Receipt page per fix; Stripe checkout for a per-site plan.

Exit criteria:
- Against a fixture repo with `next@15.5.6`, the app opens a PR changing it to `15.5.7` and the PR body lists the CVE and CI result.
- If CI fails on the branch, the PR is a draft with the label "needs human" and the log attached.
- The app token cannot push to the default branch (a test asserts the push is rejected).

## M4 — Breaking-change assist
Deliverables:
- One model-assisted fix attempt on CI failure, diff-only context, using a model whose terms exclude training and prompt logging.
- Cost tracking per site and a kill switch above a monthly budget.

Exit criteria:
- On a fixture where a minor upgrade breaks a type check, the assist produces a diff that makes the check pass, or labels "needs human" after one attempt.
- A run exceeding the per-site budget stops and records the reason.

## Suggested stack
- TypeScript on Node: same language as the target sites, easy lockfile parsing.
- Next.js on Vercel Hobby for the form and report pages: free and fast to ship.
- Postgres on Neon free tier: small relational data (agencies, sites, runs).
- GitHub App via Octokit: the only supported way to scope per-repo access with short-lived tokens.
- OSV.dev API: free advisory data, no key.
- Resend or SES free tier for email; Stripe for billing from M3.
- Vitest with recorded fixtures, so the exit criteria run offline.
