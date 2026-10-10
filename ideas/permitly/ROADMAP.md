# permitly — Roadmap

Suggested stack (all free tier):
- Next.js on Vercel Hobby: one deploy for UI and API.
- SQLite via Turso or Supabase free tier: the relational data is tiny.
- Resend free tier: simple transactional email.
- GitHub Actions or Vercel cron: daily deadline and ordinance jobs.
- Vitest: the date and diff logic is pure and easy to unit test.

## M1 — Deadline tracker with reminders (one weekend)
Deliverables:
- Property and permit data model with CRUD (single account via magic-link email).
- Pure function `dueReminders(permits, today)` returning reminders for 90/60/30/7 days.
- Daily job that emails due reminders and records sent ones so none repeat.
- Dashboard sorted by next deadline.
- ICS feed.

Exit criteria:
- `dueReminders` with a permit expiring 2026-12-31 and today 2026-10-02 returns the 90-day reminder; on 2026-12-01 returns the 30-day reminder; on 2026-10-03 returns none.
- Running the job twice on the same day sends each reminder once.
- A permit with an expiry in the past appears as overdue and sorts first.
- GET /calendar.ics for an account with 2 permits returns 2 VEVENTs with the correct dates.
- Creating a permit with a missing expiry returns a 400 error.

## M2 — Ordinance watch
Deliverables:
- Per-jurisdiction URL field and daily fetch.
- Text normalization, hash, stored previous version, line diff.
- Alert email with diff and source link.

Exit criteria:
- A fixture page changed from "renew annually" to "renew every 6 months" produces an alert containing both lines.
- Whitespace-only and script-tag changes produce no alert.
- A fetch failure records an error and sends no alert.

## M3 — Templates and import
Deliverables:
- CSV import/export.
- Template library of 10 cities.
- Landing page with signup and a payment link (created by David).

Exit criteria:
- Importing a CSV with 5 rows creates 5 permits; a row with a bad date is reported and skipped.
- Selecting a template prefills cadence and portal link.
- Export then import round-trips with identical data.
