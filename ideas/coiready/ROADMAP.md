# coiready — roadmap

## M1 — Rule checker on pasted/uploaded certificate text (one weekend)
Deliverables:
- Next.js page: upload a text-based COI PDF, or paste the text; seller types their Seller Central legal name
- Deterministic rules module: one function per Amazon criterion (limits, occurrence form, deductible, additional insured wording, name match, carrier rating present, dates, signature, 30-day cancellation notice)
- LLM extraction step turns the PDF text into a fixed JSON of fields; rules run only on that JSON
- Result page with pass / fail / can't-tell per criterion and the quoted certificate text
- Paste-ready fix email for the failing items (shown blurred, until payment is wired in M2)

Exit criteria (tests can run these):
- A fixture certificate with limits of 500,000 per occurrence returns `fail` for the per-occurrence-limit rule and `pass` for the aggregate rule when that is 1,000,000
- A certificate listing Amazon.com Services LLC only as certificate holder returns `fail` for additional insured
- Named insured "Acme Goods LLC" vs Seller Central name "ACME Goods, LLC" returns `fail` on name match with both strings shown
- A certificate with deductible 25,000 returns `fail`; 10,000 returns `pass`
- A claims-made certificate returns `fail` for occurrence form
- A fully compliant fixture returns zero fails
- The fix email for a certificate with two failures mentions exactly those two items

## M2 — Payments and saved reports
Deliverables:
- Stripe Checkout $19 one-time unlock of the fix email and a saved report link
- Uploads deleted after 30 days; report stores only extracted fields
- Email receipt with the report link

Exit criteria:
- A test-mode checkout marks the report unlocked and the fix email becomes visible
- A report older than 30 days has its stored upload removed and the page still shows the extracted fields
- Visiting an unpaid report shows the free pass/fail summary but not the fix email text

## M3 — Renewal reminders and consultant pack
Deliverables:
- Email reminders 45 and 14 days before policy expiry, with a link to re-check the new certificate
- Pack of 5 checks for consultants at $9 each, with a simple list of their sellers' reports
- Scanned/photo certificates via OCR

Exit criteria:
- For a policy expiring 2027-06-30 the job selects the 45-day reminder on 2027-05-16 and the 14-day reminder on 2027-06-16, and running it twice sends each once
- A consultant with a 5-pack can run 5 checks and the sixth is refused with a payment prompt
- A photographed fixture certificate yields the same extracted fields as its PDF version

## Suggested stack
- Next.js on Vercel Hobby: fastest single-person web app and free hosting
- Postgres on Neon/Turso free tier: small reports table, no heavy data
- pdf text extraction library plus an LLM call (free model through the existing LiteLLM pool) for field extraction; rules stay in plain TypeScript for testability
- Stripe Checkout: payment only, no accounts needed
- Resend free tier: receipts and reminders
- Vitest for the rule fixtures, run with one worker
