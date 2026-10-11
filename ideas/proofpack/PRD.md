# proofpack — PRD

## Problem
When a customer disputes a SaaS charge, Stripe's automated tooling sees only payment data. The evidence that wins (logins after the charge, usage, ToS acceptance, cancellation records, renewal notices) lives in the founder's own app. Today the founder digs through logs by hand before the deadline, or accepts the loss. Each dispute costs a $15 fee, plus $15 to contest, plus the sale (https://www.chargeflow.io/blog/stripe-dispute-fees).

## Target user
Solo or small-team founder of a Stripe-billed SaaS, API, template or course business at about $5k–$100k MRR who sees 2–20 disputes a month and has a backend where they can add a one-line logging call.

## Competitors & gap
Stripe Smart Disputes (30% of wins), Chargeflow (25% of recoveries), DisputePack ($39–$149/mo, Shopify only). None ingest the merchant's own app logs for a SaaS. Gap: an app-log-fed evidence packet at a flat price.

## MVP scope
- Node/TS SDK `record()` for login, usage, tos_accept, cancel and notice_sent events, stored per Stripe customer id.
- Stripe webhook worker on `charge.dispute.created` and `charge.dispute.updated`.
- Reason templates: fraudulent, subscription_canceled, product_unacceptable, credit_not_processed.
- Evidence builder: text timeline into `access_activity_log` and `uncategorized_text`, plus a PDF via the Files API; stays under the 150,000-character limit.
- Fight-or-accept score based on evidence found (for example no post-charge activity gives "accept").
- Staged submission (`submit=false`) with an email containing a review link and a one-click submit.
- Deadline reminders at 72h and 24h before `due_by`.
- CE 3.0 check: finds two prior undisputed charges with matching IP.

## Non-goals
- No auto-submit in v1, no legal advice, no chargeback guarantee.
- No Shopify, PayPal or non-Stripe processors.
- No fraud prevention or alerts product.
- No CRM or helpdesk integrations.

## Success metrics
- 14-day landing test: at least 40 visits from SaaS founders leading to 8+ email signups (20%) and 2+ pre-orders at $29.
- Within 60 days of build: 5 paying merchants (about $145 MRR).
- At least 1 in 3 staged packets submitted with no edits beyond the review step.
- Time from webhook to staged packet under 60 seconds.

## Open questions
- Will founders add the SDK, or does it need an automatic path (for example reading auth-provider webhooks from Clerk or Auth0)?
- Real win rate with app logs vs Stripe's own packet; unknown until tested.
- Does Stripe expose a hook for external evidence into Smart Disputes?
- Is a flat $29/mo more attractive than pay-on-win for merchants with 1–2 disputes a month?
