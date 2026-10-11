# feedwarden PRD

## Problem
Shopify merchants who depend on Google Shopping can have their Merchant Center account suspended for "Misrepresentation" with little explanation. Listings stay down until the cause is found and a review passes; community replies disagree on causes (see the Shopify Community thread in RESEARCH.md). Existing tools mostly act after the suspension.

## Target user
Owner-operators of Shopify stores with real Google Shopping traffic, and freelancers or small agencies who manage 3–10 such stores. The painful moment: the morning they find every product "Not Approved" and sales from Shopping have stopped.

## Competitors & gap
GMC Scout (on-demand scan), GMC.APPS ($9–$99/mo, fix-after-suspension), AdNabu (from $39.99/mo, feed-level alerts), Fiverr fixers ($50–$400/case). Gap: a cheap, flat-price daily watch of the store's trust signals that alerts on change, before a suspension. Unproven that merchants buy prevention.

## MVP scope
- Add a store by URL; no Google login needed.
- Daily fetch of the storefront: contact page, return, shipping, privacy and terms pages, footer business details.
- Checks: required pages exist and return 200, a business name/address/phone/email is visible, Product pages carry price and availability markup, and the site does not block Googlebot's user agent.
- Snapshot diff: alert when a check flips from pass to fail or a policy page's text changes by more than a set amount.
- Email alert with the failing check, a plain-English why, and a link to the relevant Google policy page.
- Dashboard: list of stores, current check status, history.
- Flat $15/month per store via Stripe Payment Link (later).

## Non-goals
- Not a feed manager, no editing of the store or the Merchant Center account.
- No appeal-letter writing in v1.
- Not WooCommerce/Magento in v1.
- No promise Google will not suspend an account.

## Success metrics
- 14-day landing test: at least 50 qualified visitors (Shopify merchants) and at least 5 waitlist signups with a Shopify store URL.
- At least 3 of 10 merchants or agencies interviewed say they would pay $15/month.
- Alert precision: fewer than 1 false alert per store per month on a test set of 10 stores.
- Break-even on the break: 50 paying stores gives $750/month; hosting stays at $0.

## Open questions
- Do merchants buy prevention, or only cure after a suspension?
- Which checks actually correlate with suspensions? Is there any public data?
- Can Content API access be had without a long OAuth verification?
- Should agencies be the first buyer, since one agency means many stores?
