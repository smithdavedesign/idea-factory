# feedwarden — daily Merchant Center suspension watch for Shopify stores

## Summary
Shopify merchants who run Google Shopping lose their paid and free listings when Google suspends the Merchant Center account for "Misrepresentation", and Google often does not say what to fix. Today's tools scan the store after the suspension (GMC Scout, GMC.APPS) or sit inside feed apps (AdNabu). feedwarden is a daily watch that checks the store for the things Google's automated checks look at, and alerts the owner when one changes, before a suspension.

## Evidence of the problem
- A Shopify Community thread (posted Jan 5, 2026, replies through Aug 2026): a merchant's account was suspended for Misrepresentation after connecting through the Google & YouTube app, every product showed "Not Approved", and the review failed. Replies disagree on the cause (missing variant URLs, redirects, structured data, business details, policy pages). No one gives a definitive answer. https://community.shopify.com/t/google-merchant-center-suspended/581972
- One reply states the issue is "an account-level trust issue, not a product-data issue" and lists contact page, legal business details, returns policy, visible shipping costs and consistent business naming as the likely fixes (same thread).
- GMCScout (last reviewed Aug 2026) says a suspension "does not time out": it stays until the cause is fixed and Google reinstates. https://www.gmcscout.com/guides/disapproved-vs-suspended
- Search Engine Land case study (could not be fetched, 403; known only from the search snippet): a bot blocker stopped Google's crawlers and Shopify's automatic sync sent conflicting shipping data. https://searchengineland.com/fix-suspended-google-merchant-center-account-474404
- Vendor claims (unverified, no sources given): 11.7M Merchant Center accounts suspended in 2024, $500–$5,000/day cost of a suspension, 23-day DIY fix. https://apps.evotech.au/

## Who pays
- **Buyer:** the owner of a Shopify store that gets meaningful revenue from Google Shopping/free listings (own estimate: roughly $5k+/month store revenue); also freelancers and small agencies that run Shopify stores for clients.
- **Price point:** $15/month flat per store, $49/month for up to 10 stores (agency).
- **Evidence they pay for a workaround today:**
  - Fiverr gigs to fix suspensions: listed from "up to $50" to $50–$100, $100–$200 and $200–$400 per case. https://fiverr.com/shawntellefeg/fix-google-merchant-centre-misinterpretation-fix-suspension-or-reinstate-gmc and https://fiverr.com/seo_kunal/fix-google-merchant-center-suspension-gmc-misrepresentation-feed-errors
  - A vendor says reinstatement agencies charge $300–$950 per case (vendor claim, unverified). https://apps.evotech.au/ and https://www.microns.io/startup-listings/google-merchant-center-compliance-service
  - Paid tools exist at $9–$99/month (GMC.APPS) and from $39.99/month (AdNabu, bundled with feed tools). Paying customers of those are not verified beyond three testimonials on the vendor page.
- **Gap in the evidence:** I found no independent number for revenue lost per suspended merchant, and no forum post where a merchant says they pay monthly for prevention. Demand for prevention (as opposed to cure) is unproven.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| GMC Scout | Free scan, paid "PRO" credits (price not shown on page) | Shopify-only, scans on demand after a problem; no appeals, no continuous watch confirmed |
| GMC.APPS (evotech) | Free; $9, $29, $99/mo | Built around fixing an existing Misrepresentation suspension; advertises "ongoing monitoring" as an add-on feature |
| AdNabu | From $39.99/mo, 14-day trial | Feed app with Merchant Center error alerts; feed-level, bundled with feed management |
| Simprosys Google Shopping Feed | From $4.99/mo | Feed app; no confirmed suspension alerts |
| DataFeedWatch | ~$64–84/mo (review-site figure) | Feed management for larger catalogues |
| Fiverr freelancers | $50–$400 per case | Human, one-off, slow (days to weeks) |
Sources: https://apps.evotech.au/ , https://www.gmcscout.com/guides/disapproved-vs-suspended , https://wiserreview.com/blog/datafeedwatch-alternatives/ , https://apps.shopify.com/google-shopping-feed

## Technical notes
- Needs no Google login for the first version: fetch the public storefront (contact page, return/shipping/privacy/terms pages, footer business details, robots/bot-blocking responses to a Googlebot user agent, structured-data Product markup) and diff against the last snapshot.
- Later: Merchant Center Content API (OAuth) to read account status and issues directly. Requires Google OAuth app verification, which can take time.
- Checks run as a daily cron; email alerts via a free-tier provider. Snapshots are small text hashes.
- Hosting: Vercel Hobby plus a free Postgres/SQLite tier; no LLM needed for M1.

## Risks & open questions
- The market already has at least three cheap tools; differentiation is "continuous watch plus plain-English alerts", which GMC.APPS could add.
- Google's actual suspension triggers are not public, so the checks are a best guess drawn from forum and vendor lists; false comfort is a liability.
- Demand for prevention is unproven; merchants may only buy after a suspension (then a one-off $9–$29 tool wins).
- David has no Shopify merchant network. Reaching buyers means Shopify Community, Reddit and agency groups.
- Content API access needs Google OAuth verification.

## Sources
- https://community.shopify.com/t/google-merchant-center-suspended/581972
- https://www.gmcscout.com/guides/disapproved-vs-suspended
- https://apps.evotech.au/
- https://www.microns.io/startup-listings/google-merchant-center-compliance-service
- https://fiverr.com/seo_kunal/fix-google-merchant-center-suspension-gmc-misrepresentation-feed-errors
- https://wiserreview.com/blog/datafeedwatch-alternatives/
- https://searchengineland.com/fix-suspended-google-merchant-center-account-474404
