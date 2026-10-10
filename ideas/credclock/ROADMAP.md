# credclock — roadmap

## M1 — Clock and pre-check (one weekend)
Deliverables:
- Data model: practice, clinician, document, attestation date.
- Pure function `nextAttestation(lastAttested)` = last + 120 days.
- Pure function `blockers(clinician, today)` returning documents expiring on or before the next attestation date.
- Pure function `dueReminders(today)` for document offsets 60/30/14/3 days and CAQH offsets 30/14/3 days, with a sent-log so each reminder sends once.
- Dashboard page listing deadlines soonest first; ICS feed endpoint.

Exit criteria (checks a test could run):
- `nextAttestation("2026-10-01")` returns `"2027-01-29"`.
- A clinician with CAQH last attested 2026-10-01 and malpractice expiry 2026-12-01 returns that malpractice document from `blockers(...)`; with expiry 2027-03-01 it returns none.
- `dueReminders` for a document expiring 2026-12-31 returns the 30-day reminder on 2026-12-01 and none on 2026-12-02; running the send job twice sends each reminder once.
- GET the ICS feed returns a valid VCALENDAR containing one VEVENT per upcoming deadline.

## M2 — Import and email
Deliverables: CSV import, magic-link login, Resend email delivery, practice settings (reminder offsets).
Exit criteria: importing a 12-row CSV creates 12 documents; a malformed date row is rejected with a row number; an emailed reminder contains the clinician, document and due date.

## M3 — Pre-check polish and billing
Deliverables: "will block attestation" banner, flat-price Stripe checkout ($19 up to 5 clinicians, $39 up to 15), disclaimer page.
Exit criteria: a practice with 6 clinicians is prompted for the $39 plan; a canceled subscription stops reminders within 24 hours.

## Suggested stack
- Next.js on Vercel Hobby: one deploy, free, API routes and pages together.
- Turso (SQLite) or Supabase free: small relational data, $0.
- Resend free tier: transactional email at this volume.
- Vercel cron or GitHub Actions: daily reminder job, $0.
- Vitest: pure date functions are easy to test first.
