# RESEARCH — shelfhop

## Summary
- On 1 Oct 2026 Teachers Pay Teachers (TPT) closed its Premium seller plan to new sellers and split sellers into Basic (55% payout, $0.30 per resource, own-site selling allowed) and Exclusive ($59.95/yr, 80% falling to 77.5% on 1 Jan 2027, must sell digital resources only on TPT). Existing Premium sellers must choose by 31 Dec 2026 or become Basic on 1 Jan 2027.
- Sellers now face a money decision (stay exclusive, or keep TPT on Basic and also sell on their own store/Payhip/Etsy) and, if they choose to diversify, a tedious job: re-creating a catalogue of dozens to hundreds of listings elsewhere by hand.
- shelfhop is a $19 one-time tool: a per-store "which tier and where" calculator built from the seller's own sales numbers, plus a listing-pack generator that turns a catalogue sheet into ready-to-paste listings for other storefronts. No competitor found that does this.

## Evidence of the problem
- TPT told sellers about the tier change and, per TPT's own Q&A quoted by Chalkbeat, justified it by "a growing dynamic impeding the expansion of the marketplace: TPT resources are being increasingly sold on sites outside of TPT." A TPT spokesperson confirmed it "adjusted its Seller programs." (https://www.chalkbeat.org/2026/10/15/teachers-pay-teachers-to-ban-ai-generated-teaching-resources/)
- Fee mechanics, dates and break-even as compiled on 19 Oct 2026: Basic $29 one-time, 55%, $0.30/resource; Exclusive $59.95/yr, 80% "for a limited time" then 77.5% from 1 Jan 2027, exclusivity required; Premium closed to new sign-ups 1 Oct 2026; the Basic fee "cannot be applied towards an Exclusive Seller subscription"; break-even for Exclusive about 39 sales/year on a $5 resource (43 at 77.5%). (https://edubracket.com/articles/best-platforms-to-sell-teaching-resources-2026, a secondary source; figures not checked against TPT)
- Seller backlash: a Change.org petition created 1 Oct 2026 asks TPT to reconsider terms that "would restrict sellers from offering their educational resources through their own websites, memberships, storefronts, or other platforms"; 1,523 verified signatures when read on 19 Nov 2026. (https://www.change.org/p/teachers-pay-teachers-reconsider-the-new-seller-terms-restricting-off-platform-sales) A second petition asks TPT to keep Premium. (https://www.change.org/p/teachers-pay-teachers-tpt-keep-premium-membership)
- Chalkbeat reports a New Jersey teacher with a large following calling it "a slap in the face for teachers," and Facebook groups for TPT sellers complaining about a crackdown on stores that appear to use AI. TPT also plans an AI-generated-resource ban (no effective date given). (Chalkbeat URL above)
- Existing Premium sellers must opt in to Exclusive by 11:59 pm ET 31 Dec; otherwise the account becomes Basic on 1 Jan 2027 (search-result summary of TPT terms; verify at https://www.teacherspayteachers.com/Become-A-Seller).
- No first-person seller post describing a hand migration was retrieved; the manual-migration burden is inferred from how other platform moves work (below). This is the weakest link in the evidence.

## Who pays
- **Buyer:** an established TPT seller (a teacher-author or teacherpreneur running a store of roughly 30–300 resources) who sells at least a few hundred dollars a month and is now choosing a tier. Not hobbyists with five free resources.
- **Price point:** $19 one-time for the exit plan + listing pack (about one Exclusive annual fee, $59.95, divided by three; well under a month of the cheapest storefront plan at $29/mo).
- **Evidence sellers already pay for adjacent help:**
  - Seller education is a paid category: a "Learn to Sell on TPT" Teachable course bundle lists $115 one-time (https://selling-teaching-resources-101.teachable.com/courses/381398); Teacher Seller Academy is a paid monthly membership (https://mistymiller.thinkific.com/courses/teacher-seller-academy); a seller-SEO product page lists $25/month or $300/year (https://landingpage-claude.pages.dev/, a low-authority page, price may be stale).
  - Sellers already pay platform fees to sell off-TPT: Payhip Plus $29/mo, Sellfy Starter $29/mo, Shopify Basic $39/mo (https://edubracket.com/articles/best-platforms-to-sell-teaching-resources-2026).
  - TPT itself charges $29 or $59.95 for the right to sell, so sellers treat seller-side fees as a cost of business (edubracket URL above).
- Caveat: no source shows anyone paying specifically for tier-decision or catalogue-migration help. That is the thing the demand test must prove.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Doing it by hand (spreadsheet + copy/paste into new store) | $0, plus hours | A Gumroad-to-Shopify guide estimates about a week for a store under 10 products, all manual (https://conversionproplus.com/blog/how-to-move-from-gumroad-to-shopify-complete-migration-guide) |
| Platform-vendor comparison blogs (Sellfy, Payhip, CartMango, EduBracket, Getly) | free | Compare fees generically; none take the seller's own sales and give a number; marketing for their own platform (https://sellfy.com/blog/teachers-pay-teachers-alternatives/, https://cartmango.com/teachers-pay-teachers-alternative/, https://www.getly.store/alternatives/teachers-pay-teachers) |
| Payhip / Sellfy / Gumroad / Shopify storefronts | $0–$99/mo; Gumroad 10% + $0.50 | Bring no buyers of their own; no TPT import mentioned on the comparison page (edubracket URL) |
| Etsy | $0.20/listing, 6.5% + processing | Marketplace; separate listing format and rules |
| Boom Learning, Tes | 10–40% | Format or region limited (edubracket URL) |
| TPT seller courses | $25/mo–$300/yr, $115 one-time | Teach marketing, not the tier math or the migration chore |
| Generic bulk-import features of store platforms | included | Search did not confirm CSV import for Payhip/Gumroad/Sellfy; must check each vendor's help centre |

## Technical notes
- M1 needs no integrations: the seller types or pastes per-resource price and monthly sales (or uploads a CSV of their own sales report), and the browser computes net payout under Basic, Exclusive (80% and 77.5%) and an own store (Payhip 5% free plan / Sellfy / Gumroad fee tables), plus break-even sales and the Exclusive-vs-both comparison. Pure client-side JS; nothing stored.
- Listing pack: seller pastes titles, descriptions, grade levels and price in a sheet/CSV; output is a per-platform copy sheet (title length limits, tags, SEO description variants, price rounding after fees). Optional local-LLM rewrite is not needed for M1.
- Open: whether TPT lets a seller export their own sales or product list (not confirmed; do not build scraping, which would breach TPT terms). Whether Payhip, Gumroad and Sellfy accept CSV product import is also unconfirmed.
- Fees will change: keep fee tables in one data file with a "last checked" date, and show it.

## Risks & open questions
- **Demand unproven:** no seller was found saying "I'd pay for this." The only demonstrated pain is the tier change itself and the petitions.
- **Short window:** Premium sellers decide by 31 Dec 2026, six weeks away. The calculator can ship in a weekend, but the decision may be made before a test finishes. Partly mitigated: Basic vs Exclusive remains a live annual question and the Exclusive rate drops on 1 Jan 2027.
- **Free substitutes:** a spreadsheet or ChatGPT can do the tier math; a plain calculator on its own may be worth $0. The paid wedge has to be the listing pack and the "stay on TPT + sell elsewhere" plan.
- **Platform dependency:** TPT may soften terms after backlash (the petitions), shrinking the need.
- **Fact accuracy:** fee figures come from secondary sources that disagree in places (Premium status, 80% vs 77.5%). Every number must be re-verified on TPT's own pages before launch.
- **Reach:** sellers gather in Facebook groups and podcasts (Chalkbeat mentions seller Facebook groups; podcast listings show a TPT seller niche). David has no known seller network; posting in those groups needs the rules checked.

## Sources
- https://www.chalkbeat.org/2026/10/15/teachers-pay-teachers-to-ban-ai-generated-teaching-resources/
- https://edubracket.com/articles/best-platforms-to-sell-teaching-resources-2026
- https://www.change.org/p/teachers-pay-teachers-reconsider-the-new-seller-terms-restricting-off-platform-sales
- https://www.change.org/p/teachers-pay-teachers-tpt-keep-premium-membership
- https://sellfy.com/blog/teachers-pay-teachers-alternatives/
- https://cartmango.com/teachers-pay-teachers-alternative/
- https://www.getly.store/alternatives/teachers-pay-teachers
- https://conversionproplus.com/blog/how-to-move-from-gumroad-to-shopify-complete-migration-guide
- https://selling-teaching-resources-101.teachable.com/courses/381398
- https://mistymiller.thinkific.com/courses/teacher-seller-academy
- https://www.teacherspayteachers.com/Become-A-Seller
