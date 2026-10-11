# feedwarden roadmap

Suggested stack: Next.js on Vercel Hobby (one codebase for UI and cron route), SQLite/Turso free tier (small snapshots), Resend free tier for email, cheerio for HTML parsing (no browser needed), Vercel cron or GitHub Actions for the daily job.

## M1 — checker library and CLI (one weekend)
Deliverables:
- `checkStore(html pages)` pure function returning a list of checks with pass/fail.
- `diffSnapshots(old, new)` returning the checks that changed from pass to fail and policy pages whose text changed.
- A CLI `feedwarden check <url>` that fetches the pages and prints the result.
- Fixtures: two saved HTML sets (a compliant store and one missing a returns page and contact details).

Exit criteria (testable):
- `checkStore` on the compliant fixture returns zero failing checks.
- `checkStore` on the broken fixture returns failing checks named `returns-policy` and `contact-details`.
- `diffSnapshots(compliant, broken)` returns exactly those two checks as newly failing, and `diffSnapshots(x, x)` returns an empty list.
- A fixture where robots.txt disallows `Googlebot` for `/products/` yields a failing `googlebot-allowed` check.
- A policy page whose text changes by more than 30 percent is reported as `policy-changed`; a 5 percent change is not.

## M2 — accounts, daily job and email
Deliverables: magic-link login, add/remove stores, daily cron, stored snapshots, email on newly failing checks, simple dashboard.
Exit criteria: running the job twice on an unchanged store sends no email; changing a fixture so a check fails sends exactly one email; a store removed by its owner is no longer fetched.

## M3 — billing and agency plan
Deliverables: Stripe Checkout at $15/store/month, agency tier at $49 for 10 stores, store limit enforcement.
Exit criteria: an 11th store on the agency tier is rejected; a cancelled subscription stops the daily job for its stores within one day.

## M4 — Merchant Center Content API (only if demand is proven)
Deliverables: OAuth connect, read account status and issues, alert on new account-level issues.
Exit criteria: a mocked Content API response with a new Misrepresentation issue triggers one alert with the issue text.
