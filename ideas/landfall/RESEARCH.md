# landfall — research

## Summary
- Since 9 July 2026 Etsy requires non-US sellers to ship to US buyers Delivered Duty Paid (DDP): duties and import fees are prepaid and built into the price, or the order loses Purchase Protection and Etsy deducts any buyer-charged duty from the seller.
- Etsy's own tariff estimator (powered by Zonos) is a beta "pricing guide": it only suggests a number the seller must type in by hand, and reportedly does not work for variation listings.
- Idea: a small web tool that takes a seller's shop CSV (cost, weight, origin, HS code guess) and returns, per listing and variation, a US price that keeps their target margin after duty, DDP carrier fee and Etsy fees, exported as a CSV they can paste back into Etsy.

## Evidence of the problem
- The mandate and its penalty: "Starting July 9, you'll be expected to account for all of your costs, including duties and import fees, to US buyers upfront in your pricing by using a DDP shipping option." Orders without prepaid duties lose Purchase Protection; buyer-charged tariffs and collection fees are refunded and deducted from the seller. Source: https://www.valueaddedresource.net/etsy-requires-ddp-shipping-us-tariffs/ (Jun 2026).
- Worked example: on a $60 order with $9 duties and a $5 collection fee, Etsy can refund the buyer $14 and deduct it from the seller; a lost parcel means the full $60 falls on the seller because Purchase Protection no longer applies. Source: https://www.alura.io/news/us-orders-ddp-required
- Etsy's estimator is limited: the seller enters description, price and country of origin; it suggests an HS code and tariff, but the estimate "is merely a suggestion", sellers "must enter the amount into US pricing manually", it "appears to be more of a pricing guide than a fully integrated solution" and "does not currently work for variation listings." Source: https://www.valueaddedresource.net/etsy-tests-us-tariff-calculator/
- Etsy's handbook says the calculator is Zonos-powered and Etsy does not guarantee its accuracy. Source: https://www.etsy.com/seller-handbook/article/1355662653395
- Sellers are reacting: some pause US sales or inflate US shipping; a UK Etsy coach says the risk is "too high for many small businesses" who are stopping US sales. Source: https://fortune.com/2025/08/29/etsy-ebay-shein-de-minimis-tariff-exemption-ends-adding-charges/ and https://www.404media.co/2-000-shipping-international-sellers-charge-absurd-prices-to-avoid-dealing-with-american-tariffs/
- An Etsy community thread titled "Navigating US Tariffs as an International Seller — A Workaround and a Plea for Better Tools" says Etsy lacks tools to collect and remit duties for international sellers (body is login-gated; title and search snippet only). Source: https://community.etsy.com/t5/Technical-Issues/Navigating-US-Tariffs-as-an-International-Seller-A-Workaround/td-p/149044160

## Who pays
- **Buyer:** a non-US Etsy seller with a handmade or small-batch catalogue (20–300 listings with variations) who sells a meaningful share to the US and cannot afford to drop it. Typical countries: UK, Canada, EU, Australia, India, Turkey.
- **Price point (my proposal, not researched):** $12–19 per month, or $29 one-off per catalogue re-price. Anchor: the cost of getting pricing wrong is large per order. Carrier DDP service fees "run roughly 15 to 17 dollars per US shipment at the minimum tier"; fixed fees can add $6–17 and a landed increase "can be 25% or more" (https://beancount.io/blog/2026/09/02/etsy-ddp-mandate-landed-cost-bookkeeping-non-us-sellers-guide). One analysis estimates embedded duty pushes a typical listing up 12–18% (https://novadata.io/resources/news/etsy-ddp-tariff-prepay-non-us-sellers-june-2026).
- **Evidence they pay for something like it today: weak.** I found no paid third-party DDP or tariff-pricing tool and no price. Sellers do pay for adjacent Etsy tooling (Craftybase costing, https://app.craftybase.com/blog/how-will-tariffs-affect-etsy) but I did not verify a price. Zonos Dashboard Lite is a free tariff calculator, and its Shipment Quoter for Etsy is "coming soon" (https://zonos.com/docs/global-ecommerce/marketplace-dashboard-lite, https://zonos.com/landing-page/etsy). Treat willingness to pay as unproven; the demand test must settle it.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Etsy US tariff estimator (Zonos) | free, in Shop Manager | one listing at a time; suggestion only, manual entry; no variations; beta; accuracy not guaranteed |
| Zonos Dashboard Lite / Shipment Quoter | Dashboard Lite free; quoter pricing not found | general landed cost, not Etsy fee/margin aware; Etsy quoter "coming soon" |
| Carrier / postal DDP options (UPS, FedEx, Royal Mail DDP) | per-label fee, ~$15–17 minimum tier on UPS/DHL per one source | prices the shipment, not the listing price or margin |
| Craftybase | paid (price not verified) | inventory and costing, no tariff or DDP-aware US price |
| Spreadsheet + ChatGPT for HS codes | free | slow, error-prone, per-variation work |

## Technical notes
- Inputs: Etsy shop listings CSV export (price, variations), plus seller-entered cost, weight, country of origin. HS code suggestion via an LLM with a seller-confirmed override; duty rate from the US HTS (public USITC data, https://hts.usitc.gov) combined with a country-of-origin rate table that the seller can override.
- Output: per variation US price = f(cost, target margin %, duty %, DDP fee, Etsy 6.5% transaction fee and payment fees). CSV compatible with Etsy's bulk listing editor.
- Honest limit: tariff rates for 2026 change often and are country specific. The tool must show a last-verified date and a range, and say it is an estimate. Source for rate volatility: https://novadata.io/resources/news/etsy-ddp-tariff-prepay-non-us-sellers-june-2026
- No Etsy API write access is needed for M1 (CSV only), which avoids Etsy API approval.

## Risks & open questions
- Etsy may ship a fully integrated estimator with variations and bulk apply, which kills the gap. Highest risk.
- Etsy-seller tools have been passed repeatedly here for unproven willingness to pay; this one has the same weakness.
- Wrong HS code or rate costs the seller real money; liability and "estimate only" wording needed.
- Sellers may simply stop selling to the US rather than buy a tool.
- The effective date and rollout are described inconsistently across sources (some say the calculator rollout date is not fixed).
- Closest portfolio overlap is packpass (same seller segment, EU direction); a shared audience could be reused.

## Sources
- https://www.valueaddedresource.net/etsy-requires-ddp-shipping-us-tariffs/
- https://www.valueaddedresource.net/etsy-tests-us-tariff-calculator/
- https://www.alura.io/news/us-orders-ddp-required
- https://www.etsy.com/seller-handbook/article/1355662653395
- https://beancount.io/blog/2026/09/02/etsy-ddp-mandate-landed-cost-bookkeeping-non-us-sellers-guide
- https://novadata.io/resources/news/etsy-ddp-tariff-prepay-non-us-sellers-june-2026
- https://zonos.com/docs/global-ecommerce/marketplace-dashboard-lite
- https://www.404media.co/2-000-shipping-international-sellers-charge-absurd-prices-to-avoid-dealing-with-american-tariffs/
- https://community.etsy.com/t5/Technical-Issues/Navigating-US-Tariffs-as-an-International-Seller-A-Workaround/td-p/149044160
