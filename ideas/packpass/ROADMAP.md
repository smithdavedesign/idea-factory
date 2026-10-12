# packpass — roadmap

## M1 — Plan generator (one weekend)
Deliverables:
- `rules.json` with Germany, France, Spain, Italy: fields `country`, `register`, `scheme`, `repRequired`, `label`, `costMinEur`, `costMaxEur`, `source`, `verified`.
- Pure function `buildPlan(profile)` returning ordered steps, per-country cost range and total range.
- Single-page questionnaire and plan view; no accounts, no database.

Exit criteria (checks a test could run):
- `buildPlan({origin:"US", countries:["DE"], selfShipped:true})` returns steps beginning with "Register at LUCID" and a DE cost range of min 39 and max at least 39.
- `buildPlan` with countries `["FR"]` includes a representative step and a label step "Triman and Info-tri".
- `buildPlan` with `countries:["DE","FR","ES"]` has total min equal to the sum of the three country mins.
- Every row in `rules.json` has a non-empty https `source` and an ISO `verified` date; a test fails otherwise.
- A profile with `podShare:100` and `podPartner:"printful"` returns zero required registrations for DE.

## M2 — Paywall and ledger
Deliverables: Stripe Payment Link gating the full plan; ledger form storing IDs and next filing date; export as plain text.
Exit criteria:
- Without a paid token, `GET /plan/full` returns 402; with a valid token it returns 200.
- Saving a ledger entry with filing date 2027-01-15 and reading it back returns the same values.
- Export for 2 entries yields 2 lines each containing country and ID.

## M3 — Reminders and more countries
Deliverables: scheduled email 30 days before each filing date; add Netherlands, Ireland, Belgium, Sweden; "consider not shipping" margin flag.
Exit criteria:
- With a filing date 30 days out, the reminder job emits exactly one email; a second run emits none.
- Rules rows exist for 8 countries and the source/verified test still passes.
- `buildPlan` flags a country when annual cost exceeds parcels x margin entered by the seller.

## Suggested stack
- Next.js on Vercel Hobby: single deploy, free tier.
- JSON rules file in the repo: reviewable diffs, no database for M1.
- Turso/SQLite for ledger in M2: free tier, simple.
- Stripe Payment Links: no custom checkout code.
- Resend free tier for reminders.
