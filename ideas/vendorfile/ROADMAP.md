# vendorfile — roadmap

## M1 — Register, request text, binder (one weekend)
Deliverables:
- Vendor CRUD (name, contact email, data accessed, criticality).
- Request template rendering per vendor with the 72-hour notice clause and attestation ask (copy-paste text, no sending yet).
- Per-vendor status log (requested / reminded / received / refused) with timestamps.
- Binder export to a single PDF (or HTML print) listing vendors and every status entry.

Exit criteria (checks a test can run):
- POST /vendors with 3 vendors returns 3 rows from GET /vendors.
- GET /vendors/:id/request contains the vendor name and the string "72 hours".
- POST /vendors/:id/events with status "requested" then "received" yields a log of 2 entries in chronological order.
- GET /binder returns a document containing all 3 vendor names and 2 event timestamps for the vendor that has events.
- A vendor with no events is listed in the binder as "no request recorded".

## M2 — Reminders and email
Deliverables: send requests from the adviser's connected Gmail/SMTP; automatic reminders at 7 and 14 days; reply capture through a forwarding address; attestation expiry date field.
Exit criteria:
- A vendor with status "requested" dated 8 days ago is returned by the due-reminders function; one dated 3 days ago is not.
- An attestation expiring in 29 days is flagged; one expiring in 31 is not.
- A forwarded email to the inbound address attaches an event to the right vendor by token.

## M3 — Annual review and billing
Deliverables: yearly review checklist with sign-off; Stripe $49/month subscription; account export.
Exit criteria: completing the checklist writes a signed entry into the binder; an unpaid account can still export its data.

## Suggested stack
- Next.js + SQLite/Turso: fast to ship, free tier, simple relational data.
- Resend or Gmail API for mail: low-volume transactional sending.
- Playwright or react-pdf for the binder: deterministic PDF from stored records.
- Vercel cron for reminders: no server to run.
- Stripe Checkout for billing: flat price, no custom billing code.
