# Deductwise — roadmap

## M1 — State-aware itemized statement (one weekend)
Deliverables:
- Rules table for 5 states (CA, TX, FL, NY, WA): return deadline in days, whether receipts are required and above what amount, penalty multiplier, each with a statute URL and last-verified date.
- Proration function and line-item builder.
- Statement PDF with itemized deductions and refund amount (photo evidence appendix as a simple list of uploaded files).
- Deadline calculator from move-out date and forwarding-address date.

Exit criteria (testable):
- Deadline(CA, move-out 2026-03-01) returns 2026-03-22; Deadline(TX, 2026-03-01) returns 2026-03-31; Deadline(NY, 2026-03-01 with forwarding address same day) returns 2026-03-15.
- Prorate(replacement 1000.00, useful life 10, age at move-in 7 years, tenant stayed 0 extra) charges 300.00; with cost capped by actual damage 250.00 returns 250.00.
- Deposit 2000.00 with deductions 300.00 and 150.00 produces refund 1550.00 and the PDF shows both lines and the total.
- A CA line item over 125.00 with no receipt attached returns a warning "receipt required".
- A packet whose deadline has already passed shows a "deadline passed" warning and the penalty multiplier for that state.

## M2 — Evidence and reminders
- Photo and receipt upload bundled into the PDF appendix.
- Email reminders at 7 and 2 days before the deadline.
- Pay per packet ($19) with free preview.
Exit: uploading 3 photos and 1 receipt yields a PDF with 4 appendix entries; a reminder email is queued at deadline minus 7 and minus 2 days; unpaid packets expose only a watermarked preview.

## M3 — More states and demand test
- Add 10 more states and a "not covered" fallback with a link to the statute search.
- Landing page and search-phrase pages per state ("[state] security deposit deadline").
Exit: each added state has 5 passing deadline/penalty tests; 10 paid packets or 100 waitlist signups within 60 days.

## Suggested stack
- Next.js on Vercel: free tier, one codebase for form and API.
- Postgres or SQLite via Supabase/Turso: free tiers for packets and reminder schedule.
- Stripe Checkout: one-time per-packet payments with no stored cards.
- A PDF library (e.g. react-pdf or pdf-lib): server-side PDF with no external service.
- Resend free tier: reminder emails.
