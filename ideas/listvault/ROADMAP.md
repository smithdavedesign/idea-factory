# listvault — roadmap

Suggested stack:
- Next.js on Vercel Hobby: one codebase, free hosting.
- Supabase free tier (Postgres, auth, storage): email-link login and file storage with no server to run.
- Pure TypeScript modules for matching and risk rules: testable and no API cost.
- Vitest: fixtures drive the exit criteria.
- Resend free tier: emails.
- Stripe checkout (M2): payment only after demand is shown.

## M1 — Matcher, checklist and packet (one weekend)
Deliverables:
- `normalizeAddress` and `normalizeName` pure functions.
- `findMismatches(listing, documents)` returning per-document field differences.
- `editRisk(location, editType)` returning risk level and missing prep items from a rules table.
- `readinessScore(location)`.
- `buildPacketIndex(location)` producing the index page and document list (zip in the UI).
- A simple page: add a location, enter documents' name/address fields, see mismatches, score and checklist.

Exit criteria (tests):
- `normalizeAddress("123 Main Street, Suite 4")` equals `normalizeAddress("123 main st #4")`.
- A listing "Acme Plumbing LLC" at "123 Main St Ste 4" against a license "Acme Plumbing, LLC" at "123 Main St Ste 4" returns 0 mismatches.
- The same listing against a utility bill at "123 Main St Ste 5" returns exactly 1 mismatch on the address field.
- `editRisk(location, "address")` returns "high" and lists "walkthrough video" and "license at new address" when neither is present, and returns no missing items when both are present.
- `readinessScore` returns 100 for a location with all required slots filled and matching, and under 60 with two required slots empty.
- `buildPacketIndex` lists every document exactly once with its match status.

## M2 — Accounts, storage and payment
Deliverables:
- Email-link login, per-agency workspace, file upload to storage, encrypted at rest, delete on request.
- Dashboard of locations sorted by lowest readiness.
- Stripe checkout for the $29/mo flat plan.

Exit criteria:
- A second agency account cannot read the first account's location (test returns 403/404).
- Deleting a document removes the storage object and the record.
- A completed Stripe test checkout sets the workspace plan to "paid".

## M3 — Alerts and connectors
Deliverables:
- Document expiry reminders (e.g. utility bill older than 90 days).
- Optional read-only GBP API import to prefill the listing fields.
- CSV bulk import of locations.

Exit criteria:
- A bill dated 91 days ago produces a reminder; a bill dated 89 days ago does not; running the job twice sends once.
- Importing a CSV with 50 rows creates 50 locations and reports invalid rows by number.
