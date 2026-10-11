# proofpack — roadmap

## M1 — Packet builder (one weekend)
Deliverables: a TypeScript library with `record(event)` (SQLite storage) and `buildPacket(disputeId, stripeClient)` that returns the evidence object; a CLI `proofpack packet <dispute_id> --dry-run` printing the JSON; fixtures for four reason templates.
Exit criteria (testable):
- `record` called with 3 logins for customer `cus_1` at IP `1.2.3.4`, then `buildPacket` for a `subscription_canceled` dispute on a `cus_1` charge, gives `access_activity_log` containing all 3 timestamps in ascending order.
- A packet whose combined evidence text would exceed 150,000 characters is truncated to at most 150,000 characters, keeping the most recent events.
- For a dispute with zero events recorded after the charge date, `score()` returns `accept`; with 1 or more post-charge logins it returns `fight`.
- `ce3Check` returns `eligible: true` for two prior undisputed charges sharing the disputed charge's IP, and `false` with only one.
- `buildPacket` sets `customer_purchase_ip` from the charge's recorded IP and never calls `disputes.update` with `submit: true`.

## M2 — Webhook worker and staging
Deliverables: HTTP endpoint verifying the Stripe signature; on `charge.dispute.created` stage evidence with `submit=false`; email with the packet summary.
Exit criteria:
- POST with an invalid signature returns 400 and writes nothing.
- A valid `charge.dispute.created` fixture results in one `disputes.update` call (mocked) with `submit=false`, and replaying the same event id makes no second call.
- Reminders are scheduled for `due_by - 72h` and `due_by - 24h`.

## M3 — Review page and submit
Deliverables: magic-link review page showing the timeline and score; one-click submit; PDF upload via Files API.
Exit criteria:
- Submitting calls `disputes.update` once with `submit=true`; a second click is a no-op.
- The magic link expires after 7 days and returns 410.

## M4 — Billing and landing
Deliverables: Stripe Checkout for $29/$79 plans; usage cap enforcement; landing page with waitlist.
Exit criteria:
- A merchant on the $29 plan who requests a 21st packet in a month gets a plan-upgrade prompt rather than a packet.

## Suggested stack
- TypeScript + Node: shares types between SDK and worker; Stripe SDK is first-class.
- SQLite (libSQL/Turso free tier): $0, simple per-customer append log.
- Hono or Next.js route handlers on Vercel Hobby: free webhook hosting.
- Vitest with a mocked Stripe client: lets exit criteria run as tests with no network.
- Resend free tier for email.
