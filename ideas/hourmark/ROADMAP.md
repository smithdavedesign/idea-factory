# hourmark — roadmap

Suggested stack: Next.js on Vercel (free, fast to ship), Turso or Supabase free tier (cheap relational data), Resend free tier (reminder email), PDFKit or react-pdf (audit file), TypeScript with vitest (rule engine unit tests). No LLM, so $0 running cost.

## M1 — rule engine and monthly check (one weekend)
Deliverables:
- `rules/` table for CA, OR and TX with monthly minimum, individual/group limit and board source URL.
- `checkMonth(state, entries)` function returning status (ok / at-risk / below-minimum) and a reason.
- Minimal web page: supervisor adds an associate, enters a month's hours, sees the status.
Exit criteria (tests):
- `checkMonth('TX', 3h individual + 0h group)` returns `below-minimum` because 4 hours of direct supervision are required.
- `checkMonth('TX', 4h total with 3h group)` returns `at-risk` because group exceeds 50%.
- `checkMonth('TX', 4h individual)` returns `ok`.
- Every rule object has a non-empty `sourceUrl`; a test fails otherwise.
- POST /associates then POST /hours with a negative number returns 422.

## M2 — invites, logging and co-sign
Deliverables: associate invite link, associate hour log, monthly co-sign with timestamp, signature history.
Exit criteria:
- An associate invited by link can POST /hours but cannot read another associate's data (returns 403).
- Co-signing a month twice leaves exactly one signature record.
- Editing a signed month returns 409 and requires the supervisor to reopen it, which writes an audit-log row.

## M3 — alerts and audit file
Deliverables: mid-month and 3-days-before-month-end alert emails; PDF audit file export.
Exit criteria:
- With an associate 2 hours short on the 27th of a 30-day month, the alert job sends one email to the supervisor and one to the associate, and running it twice sends no duplicates.
- GET /associates/:id/audit.pdf returns a PDF containing the associate name, each signed month and its timestamp.

## M4 — billing and waitlist test
Deliverables: free for 1 associate, $19/month for unlimited via Stripe; landing page and waitlist.
Exit criteria:
- A supervisor with 2 associates and no subscription gets 402 on adding the second.
- A completed checkout webhook sets the plan to `unlimited`; a replayed webhook changes nothing.
