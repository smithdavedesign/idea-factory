# leakcheck — roadmap

Suggested stack: Node + Playwright (renders pages and records network/console), GitHub Actions cron (free scheduling), SQLite/JSON files (no database cost), static HTML reports on Vercel Hobby, Resend free tier for alerts.

## M1 — Single-site audit CLI (one weekend)
Deliverables: `leakcheck audit <url>` renders the page, detects tags, lists forms, collects console errors, writes `report.html` with screenshots.
Exit criteria:
- Given a fixture page with GTM-ABC123 and G-TEST123456 whose collect request is stubbed, the report lists both IDs as "firing".
- Given a fixture where the GA4 snippet is present but the collect request is blocked, the report flags "GA4 tag present, no collect request".
- Given a fixture page with a form lacking an action attribute, the report flags it as high severity.
- Given a page that throws `console.error`, the report includes the message and a screenshot file exists.
- Auditing a fixture with a form never sends a POST request (test asserts zero POSTs).

## M2 — Crawl and broken links
Deliverables: depth-limited internal crawl, link status checks, robots.txt respect.
Exit criteria:
- A fixture site with 5 pages and 1 link to a 404 reports exactly that link.
- A path disallowed in robots.txt is not fetched.
- Crawling 20 pages makes at most 1 request per URL.

## M3 — Scheduled runs and diff alerts
Deliverables: site list config, GitHub Actions cron, stored run history, diff between runs, email alert.
Exit criteria:
- Two runs where a tag disappears in run 2 produce one "new finding" entry and one email payload.
- Two identical runs produce no alert.
- A finding absent in run 3 is listed as resolved.

## M4 — Agency report pack
Deliverables: multi-site index page, shareable per-site report, severity ranking, suggested-fix text.
Exit criteria:
- Index lists all configured sites sorted by highest severity first.
- Each finding in a report has screenshot, request/console evidence and a fix suggestion.

## M5 — Opt-in test-submission tier (only after a paying agency asks)
Deliverables: for agency-owned sites, submit a test lead to a supplied mailbox and verify delivery.
Exit criteria:
- With a consent flag absent, the submit step refuses to run.
- With a mailbox stub, a delivered test is marked pass and a missing one flags "form not delivering".
