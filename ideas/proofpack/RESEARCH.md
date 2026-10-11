# proofpack — research

## Summary
- Stripe's Smart Disputes auto-submits evidence, but only from payment-layer data. It cannot see a SaaS's logins, usage, ToS acceptance or cancellation logs, which are the evidence that wins SaaS disputes.
- proofpack is a tiny server-side SDK plus a Stripe webhook worker. The SDK records those events; when `charge.dispute.created` fires, the worker builds an evidence packet and stages it through the Disputes API for the founder to approve.
- Buyer: a bootstrapped SaaS or digital-product seller on Stripe with a handful of disputes a month, each costing $15 plus the lost revenue. Priced flat at about $29/mo against 25–30% success fees.

## Evidence of the problem
- Chargeflow says the following sit outside Stripe and the merchant must add them: subscription cancellation logs, login activity, ToS acceptance timestamps and usage data. Smart Disputes sees only payment-layer data (transactions, IP, AVS/CVC, device). It handles fraud and duplicate disputes best; "cancelled subscription", "services not provided" and "not as described" usually need merchant review. (https://www.chargeflow.io/blog/what-stripe-smart-disputes-covers-and-what-it-doesnt — competitor source, treat with caution)
- Redo's SaaS guide: SaaS has no shipping proof, so disputes are won or lost on login timestamps after the charge, feature/API usage tied to the account, the signup acceptance record (terms version, timestamp, IP), IP/device continuity, and renewal notices sent. It calls continued use after the charge the strongest single item. Unrecognised trial conversions are the largest category. Some disputes (stolen cards) are unwinnable. (https://redo.com/resources/articles/chargebacks/saas-chargebacks — vendor article)
- Stripe's own docs confirm the API has the fields to carry this: `access_activity_log`, `customer_purchase_ip`, `service_date`, `service_documentation`, `cancellation_rebuttal`, `uncategorized_text`; combined text limit 150,000 characters; `submit=false` stages evidence. (https://docs.stripe.com/api/disputes/update)
- Visa Compelling Evidence 3.0 for fraud reason 10.4 needs the disputed charge to match prior undisputed transactions on two data points, one a technical identifier such as IP or device ID. Merchants with few repeat purchases may not qualify. (vendor guide: https://payproglobal.com/answers/what-is-saas-chargeback-reversal/)
- No first-hand forum complaints were found by search. Demand evidence here is vendor content and fee structures, not user quotes. This is the main weakness.

## Who pays
- Buyer: founder or ops lead at a bootstrapped SaaS, API, template or course business billing through Stripe, roughly $5k–$100k MRR.
- Cost they already bear: Stripe charges $15 per dispute received and, since June 2025, a further $15 counter fee in the US to contest, refunded on a win (https://www.chargeflow.io/blog/stripe-dispute-fees). A lost dispute also forfeits the sale.
- Paid alternatives today: Stripe Smart Disputes at 30% of won amounts plus the $15 fee (Chargeflow article above; https://docs.stripe.com/disputes/smart-disputes confirms a fee only on wins); Chargeflow Automation at 25% of recovered chargebacks, Alerts at $29 per deflected chargeback, with SaaS startup discounts up to 70% (https://www.chargeflow.io/pricing); DisputePack for Shopify at $39–$149/mo (https://apps.shopify.com/disputepack).
- Price point: $29/mo flat (up to ~20 disputes), $79/mo above that. Flat pricing beats 25–30% of recovered amounts once a merchant recovers more than roughly $100–$120 a month. This is arithmetic from the competitor fees above, not a measured revenue number.
- Not shown: any evidence that SaaS founders specifically pay a flat monthly fee for this. DisputePack proves flat monthly pricing exists in the Shopify neighbour market, but it launched on 2026-08-21 and has zero reviews.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Stripe Smart Disputes | 30% of won amount + $15 received fee | Payment-layer data only; no app logs; cancelled/service disputes need manual work |
| Chargeflow | 25% of recovered; alerts $29 each | Success-fee model; broad ecommerce focus; SaaS usage data limited to Recharge/Chargebee |
| DisputePack (Shopify) | $0–$149/mo | Shopify Payments only; physical goods |
| Redo | claims $0 install, $0 success fee | Shopify-centred; vendor claim unverified |
| Manual in Stripe Dashboard | free | Founder copies logs by hand under a deadline |

## Technical notes
- Inputs: `charge.dispute.created` webhook; Stripe API to fetch charge, customer, invoice and subscription.
- SDK: `proof.record({customerId, type: 'login'|'usage'|'tos_accept'|'cancel', ip, ua, ts, meta})` appends to a per-customer log; `proof.packet(disputeId)` renders a text timeline plus a PDF to upload via the Files API.
- Map dispute `reason` to a template (fraudulent, subscription_canceled, product_unacceptable, credit_not_processed). Compute whether CE 3.0 matching is possible (two prior undisputed charges, same IP).
- Always stage with `submit=false`; the founder approves. Warn when evidence is thin ("fight or accept?").
- Store: SQLite or Postgres free tier; hosting on Vercel Hobby or similar; Stripe restricted key with dispute read/write.

## Risks & open questions
- Demand is inferred, not observed from users. Needs a landing-page test with a real signup count.
- Smart Disputes may add an app-data hook, or Stripe may let merchants push logs, erasing the wedge.
- Founders must instrument their app with the SDK; that is a real integration cost.
- Winning is never guaranteed and many SaaS disputes are stolen-card fraud, which logs cannot fix.
- Logs hold customer IPs and emails: privacy, retention and GDPR duties.
- A third-party tool still triggers Stripe's $15 counter fee.

## Sources
- https://docs.stripe.com/disputes/smart-disputes
- https://docs.stripe.com/api/disputes/update
- https://www.chargeflow.io/blog/what-stripe-smart-disputes-covers-and-what-it-doesnt
- https://www.chargeflow.io/blog/stripe-dispute-fees
- https://www.chargeflow.io/pricing
- https://redo.com/resources/articles/chargebacks/saas-chargebacks
- https://apps.shopify.com/disputepack
- https://payproglobal.com/answers/what-is-saas-chargeback-reversal/
