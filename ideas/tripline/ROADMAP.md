# tripline — roadmap

## Suggested stack
- TypeScript + Hono on Cloudflare Workers (or Vercel): handles the decoy routes at the edge, free tier covers low volume.
- SQLite/D1 or Turso free tier: small event store, simple 30-day pruning.
- Vitest: pure-function tests for decoy responses, fingerprinting and export formats.
- Resend/free email or SMTP: alert delivery (free tier).

## M1 — Decoy and capture core (one weekend)
Deliverables:
- A server with decoy routes `/mcp`, `/sse`, `/api/tags`, `/v1/models` and decoy files at `/.claude/.credentials.json`-style paths with fake values.
- Hit store recording path, IP, user agent, headers, body and timestamp.
- A `GET /report?site=<id>` JSON endpoint listing hits grouped by IP with counts.
- Blocklist export as plain text and nginx `deny` lines.

Exit criteria (testable):
- `POST /mcp` with a valid JSON-RPC `initialize` body returns 200 and a JSON-RPC result with a `protocolVersion` and an empty `tools` list.
- `GET /api/tags` returns 200 JSON with a `models` array of fake names, and `GET /v1/models` returns an object with `data` array.
- Requesting a decoy credential path returns 200 and the body contains no string that matches a real key pattern (`sk-ant-`, `AKIA`, `ghp_`).
- Three requests from IP 203.0.113.5 to `/mcp` and one to `/sse` produce a report row for that IP with count 4.
- A request to a non-decoy path such as `/index.html` records no hit.
- The nginx export for that report contains the exact line `deny 203.0.113.5;`.

## M2 — Alerts and digest
Deliverables:
- Email alert on the first hit from a new IP per site, with a per-IP rate limit.
- Weekly digest per site.
- Hit retention pruning at 30 days.

Exit criteria:
- A first hit from a new IP triggers exactly one alert; nine more hits from the same IP within an hour trigger none.
- Rows older than 30 days are deleted by the prune job; newer rows stay.
- The digest for a site with 0 hits says so, and one with 12 hits from 3 IPs lists 3 rows.

## M3 — Accounts and setup
Deliverables:
- Sign-in, site creation with a generated site id and a proxy snippet (nginx, Caddy, Cloudflare Worker).
- Per-site Slack webhook.

Exit criteria:
- Creating a site returns a snippet containing its id.
- A request with an unknown site id returns 404 and records nothing.

## M4 — Scanner tracking
Deliverables:
- Fingerprint grouping by body shape and user agent across IPs, a per-site timeline page, and a Cloudflare IP-list export.

Exit criteria:
- Two IPs sending the same `initialize` body and user agent share one fingerprint id; a different body gets a new id.

## M5 — Billing and MSP view
Deliverables:
- Stripe subscription ($29 for 5 sites, $79 for 25), and a multi-client dashboard for MSPs.

Exit criteria:
- A free account cannot create a sixth site; a paid account can create a sixth through a twenty-fifth.
