# packpass — research

## Summary
- Since 12 Aug 2026 the EU packaging regulation (PPWR) applies with no minimum sales threshold, and France has required a local authorised representative since 10 Jul 2026. Small non-EU Etsy/Shopify sellers must work out, country by country, what to register, who to pay and which labels to print.
- Etsy now collects EPR numbers (France, Germany, Spain) but explicitly does not register, pay or tell sellers which rules apply to them; sellers are "responsible for determining which requirements apply".
- Today's help is either a generic free guide or a vendor selling a representative service (from about €190/year per country). Nobody sells a neutral, seller-specific obligation plan plus a ledger of the IDs and filing dates.

## Evidence of the problem
- Etsy's own announcement says the rules "can be a barrier to selling cross-border" for a "one-person shop", asks sellers to sign a petition for harmonised rules, and says sellers are responsible for determining which requirements apply. Etsy also raised Regulatory Operating Fees earlier in 2026 citing the cost of local compliance. https://www.valueaddedresource.net/etsy-petition-eu-packaging-rules/
- Trade press: the EPR provisions apply "without a minimum sales threshold", registration is national, and businesses warn combined costs could make some cross-border sales "commercially unattractive"; small and micro online sellers serving several EU countries without a presence are hit hardest. https://www.packaging-gateway.com/features/eu-packaging-rules-increase-compliance-burden-for-cross-border-sellers/
- Etsy sellers report conflicting advice: one UK seller was quoted a 400 EUR annual admin fee, another said no representative is needed and they file German reports themselves; an Etsy community thread claims fees run from about $10 (Germany) to over $165 (France) per year. Dated (likely 2021-2022) but shows the confusion. https://www.ukbusinessforums.co.uk/threads/germany-epr-compliance-packaging.417648/ and https://community.etsy.com/t5/Technical-Issues/Shipping-to-France-for-Tech-team/m-p/145933514/highlight/true
- Shopify merchants asked about LUCID/VerpackG registration in community threads. https://community.shopify.com/t/lucid-registrierung-verpackungsgesetz-zum-01-07-2022/131406
- A fulfilment provider must stop servicing a seller not registered with LUCID and licensed with a dual system (vendor blog, verify against VerpackG). https://deutsche-recycling.de/blog/fulfilment-dienstleister-verpackungsgesetz/
- Germany penalties up to 100,000 EUR (200,000 for skipping a recycling scheme); France up to 30,000 EUR (per listadum guide, vendor source). https://www.listadum.com/blog/eu-packaging-regulations-for-etsy-sellers

## Who pays
- **Buyer:** the owner of a small non-EU (US/UK/Canada/Australia) shop on Etsy, Shopify or similar that ships its own parcels, or mixes self-shipped and print-on-demand orders, to 2-6 EU countries. Revenue roughly $20k-$300k/year.
- **Price point:** $29 one-time plan, or $9/month while the ledger and reminders are active. Anchor: a representative is from about 190 EUR/year per country excl. VAT plus setup fee and deposit, so a 3-country seller faces 570+ EUR/year before any scheme fees (https://eprrepresentative.com/guides/epr-france-from-united-states). A plan that tells them which countries are worth it, or when to stop shipping, is worth far more than $29.
- **Evidence they pay for a workaround today:** representative services at 190 EUR/year per stream (EPR Representative); Spain/Italy/other countries at roughly 300-1,200 EUR/year each and a stated representative cost from 190 EUR/year (listadum guide, vendor estimates, https://www.listadum.com/blog/eu-packaging-regulations-for-etsy-sellers); Shopify app EUReady sells a paid scan-and-fix for GPSR/EPR gaps (https://pickyourapp.com/es/products/euready); Etsy itself raised fees to cover compliance. Sellers already pay for adjacent GPSR compliance help. Caveat: no direct evidence yet that sellers pay a third party for a plan; that is what the demand test must show.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Listadum EU packaging guide | Free | Generic per-country article, estimates only, no per-seller plan, no ledger |
| EPR Representative | From 190 EUR/yr per stream + setup + deposit | Sells the representative service, not neutral; does not tell you whether you should ship to the country |
| RegSurance | Not published | Vendor guide and services, aimed at larger sellers |
| EUReady (Shopify app) | Not retrieved | Shopify-only; scans GPSR/EPR gaps in listings, not a country-by-country registration plan |
| Lizenzero / Der Grüne Punkt / Reclay / Citeo | Germany licence from about 39 EUR/yr; France varies by volume | Single-country scheme operators; each covers only its own country |
| Etsy Seller Handbook | Free | Tells sellers to determine requirements themselves; collects IDs only for FR/DE/ES |
| Print-on-demand partners (Printful, Printify, Gelato) | Free | Publish EPR numbers only for orders they fulfil; self-shipped orders remain the seller's duty |
| Spreadsheet + calendar | Free | The real status quo |

## Technical notes
- Core is a rules table (country x stream x seller-situation) plus a pure function that turns a seller questionnaire into an ordered checklist, a cost range and a deadline list. No scraping and no customer credentials needed.
- Rules data must carry a source URL and "last verified" date per row, because implementation is changing (a Commission proposal to suspend the authorised-representative requirement until 2035 has not been adopted; Council dropped related work in June 2026 per press). https://www.packaging-gateway.com/features/eu-packaging-rules-increase-compliance-burden-for-cross-border-sellers/
- Output: PDF/HTML plan plus an ID ledger (LUCID number, Citeo IDU, representative contact, next filing date) to paste into the Etsy Shop Manager.
- France identifier timing differs by eco-organisation (about 5-10 business days) and the representative must be appointed per stream; most US sellers need 2-4 of France's 19 streams. https://eprrepresentative.com/guides/epr-france-from-united-states
- Stack can be a static site plus a small serverless function and Stripe Payment Link; $0 on free tiers.

## Risks & open questions
- Legal-advice liability: must frame as an information tool with sources and "last verified" dates, not legal advice.
- Rules churn quickly; the data is a maintenance burden and a stale row is a trust failure.
- Vendor-sourced cost figures conflict (France: 165 USD per forum vs 300-700 EUR guide); the product must show ranges and source each.
- Etsy petition or an EU simplification (pay-on-behalf via platforms) could shrink the problem within a year.
- Reachability: Etsy seller forums and subreddits allow some self-promotion but risk looking like spam; test via a free calculator lead magnet.
- Does a plan alone convert, or do buyers want the registration done for them (partner/affiliate with a representative)?

## Sources
- https://www.valueaddedresource.net/etsy-petition-eu-packaging-rules/
- https://www.packaging-gateway.com/features/eu-packaging-rules-increase-compliance-burden-for-cross-border-sellers/
- https://www.listadum.com/blog/eu-packaging-regulations-for-etsy-sellers
- https://eprrepresentative.com/guides/epr-france-from-united-states
- https://www.ukbusinessforums.co.uk/threads/germany-epr-compliance-packaging.417648/
- https://community.etsy.com/t5/Technical-Issues/Shipping-to-France-for-Tech-team/m-p/145933514/highlight/true
- https://community.shopify.com/t/lucid-registrierung-verpackungsgesetz-zum-01-07-2022/131406
- https://deutsche-recycling.de/blog/fulfilment-dienstleister-verpackungsgesetz/
- https://pickyourapp.com/es/products/euready
