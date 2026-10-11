# leakwatch — roadmap

## M1 — local sweep + notice generator (one weekend)
Deliverables: a CLI/library that takes a product JSON, builds queries, normalises/dedupes result URLs (search provider behind an interface, with a fixture provider for tests), and renders a Google removal notice and a host abuse notice from a list of marked URLs.
Exit criteria (testable):
- buildQueries({title:"Notion Finance Template", filename:"finance-template.zip"}) returns ≥ 4 distinct queries, including one containing the quoted title and one containing the filename
- dedupe() of 3 result lists with 2 overlapping URLs (after stripping utm params and trailing slashes) returns the union with no duplicates
- a result whose domain equals the seller's store domain is classified "own" and excluded from candidates
- renderGoogleNotice() with 3 infringing URLs outputs text containing the original URL, all 3 infringing URLs, and the sworn-statement placeholder, and throws if the infringing list is empty
- running the sweep twice with the fixture provider returns the new candidates the first time and none the second time

## M2 — web app + weekly digest
Deliverables: login, product CRUD, review inbox (Infringing/Legit/Ignore), weekly cron, email digest.
Exit criteria: POST /products creates a product; a cron run with the fixture provider inserts 5 candidates; marking a candidate "infringing" makes it appear in the notice generator; the digest email contains only unseen candidates.

## M3 — host lookup, follow-ups, billing
Deliverables: RDAP abuse-contact lookup, host notice template, 7-day follow-up reminder, Stripe $19/mo.
Exit criteria: lookup("example.com") against a recorded RDAP fixture returns an abuse email; a notice marked sent 8 days ago produces one reminder and none the next day; an unpaid account receives no digest.

## Suggested stack
- TypeScript + Node: shared code for CLI and app
- SQLite/Turso: tiny relational data, $0
- Next.js on Vercel Hobby: quick UI and cron at $0
- Search provider behind an interface: swap in whichever API is $0 and available
- Resend free tier: weekly digest email
