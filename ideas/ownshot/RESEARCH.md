# ownshot — research

## Summary
- Etsy's automated Creativity Standards / "AliExpress bot" checks take down listings when a seller's own product photo also appears on AliExpress, Temu or Shein (usually because a copycat stole it). Sellers are told they cannot appeal, lose reviews and search ranking when they relist, and risk shop suspension on a repeat.
- Today a wrongly flagged seller has no dated proof that they shot the photo first, and no warning that a copycat has already put their photo on the sites Etsy compares against.
- ownshot is a vault that timestamps a seller's original photos (and process shots) at upload and builds an appeal packet on demand, with a later weekly sweep for copies. It is aimed at handmade Etsy sellers who already pay $6–$30 a month for listing tools.

## Evidence of the problem
- A Value Added Resource report (Sept 2024) says Etsy's automated "AliExpress Bot", introduced 2023, flags images also found on AliExpress and Temu. It is aimed at dropshippers but catches handmade sellers whose photos were copied. It quotes a seller with 300+ listings and "over 100,000 sales" who had three wrongly flagged listings, lost Star Seller eligibility and was warned the account would be suspended on a repeat. Sellers are often told "they can't appeal"; escalations to Trust & Safety can go unanswered for months; relisting with new photos forfeits reviews and search ranking. https://valueaddedresource.net/etsy-creativity-standards-takedowns-no-appeal
- The same report says proof such as supply orders and production videos did not get one listing reinstated. That is the gap: the proof sellers assemble after the fact is undated and unsigned. (Whether dated proof would win an appeal is **not** established by any source — see Risks.)
- Etsy's own 2024 transparency report says most enforcement actions were for alleged violations of the Intellectual Property Policy and Creativity Standards, and that the policies apply to listings with AI content. https://investors.etsy.com/_assets/_d7ee8700714b0f6cfcd5c437caf5f524/etsy/db/1016/9831/pdf/2024_Transparency_Report_Digital.pdf
- Etsy Community threads titled "Listing has been deactivated by Etsy for violating creative standards", "Etsy removed my listings due to Ety's Creativity Standards" and "Etsy randomly deactivated some of our listings" show recurring seller complaints (bodies are behind a login, so only titles were seen). https://community.etsy.com/t5/Technical-Issues/Listing-has-been-deactivated-by-Etsy-for-violating-creative/m-p/148332897
- New 2026 rules raise the stakes: a third-party guide says that from Aug 11, 2026 products made with laser cutters, sublimation printers or CNC must come from the seller's own original design, AI use must be disclosed, and undisclosed production partners are "one of the most common reasons for listing deactivation and shop suspension" (single third-party page, not Etsy's own). https://beancount.io/blog/2026/07/09/etsy-2026-fee-hike-ai-disclosure-rules-handmade-sellers-guide

## Who pays
- **Buyer:** a handmade or designed-product Etsy seller with roughly 20–300 listings whose income depends on a few best-selling listings and Star Seller status. Proposed price: **$12/month**, or **$9 one-time per appeal packet** for a shop that has just been hit.
- **Evidence sellers pay for Etsy tools today:** roundups put EverBee at about $10–$20/month, eRank at $5.99–$29.99, Marmalead at about $19 and Alura at $8–$30/month (sources disagree and are affiliate blogs; verify on vendor pages). https://profittree.io/blog/best-etsy-seller-seo-tools-2026
- **Evidence people pay to guard photo theft:** Pixsy sells image-theft monitoring at $19/month (2,000 images, 20 takedowns), $39/month and $89/month, with recoveries on a 50% share. https://creatoreconomytools.com/tool/pixsy
- **Evidence of a paid workaround for takedowns:** the Value Added Resource report names an advocate who "has helped sellers appeal for over a year" (free help, not a price). No source found shows sellers paying for appeal help. **This is the weakest link and the thing a demand test must settle.**

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Pixsy | free (500 images), $19 / $39 / $89 a month | Built for photographers' licensing claims across the open web; not tuned to Etsy's flag sources; no appeal packet for a marketplace takedown |
| Copytrack | contact sales, fee share on recoveries | Same: recovery-focused, not marketplace takedown defence |
| TinEye / Google Lens (manual) | TinEye API about $0.04 a search in bundles; Lens free | Manual one-by-one; no record kept |
| Etsy Support / Trust & Safety escalation | free | Inconsistent, months of delay, "can't appeal" |
| Etsy listing tools (EverBee, eRank, Marmalead, Alura) | $6–$30 a month | SEO and product research; none cover takedown evidence |
| Forum advocates (e.g. the seller advocate in the VAR report) | free, volunteer | Do not scale, no tooling |

## Technical notes
- **Provenance vault (M1, $0):** hash each uploaded original (SHA-256 / SHA-512), read EXIF capture time and camera, and get an RFC 3161 timestamp token from FreeTSA (free; `openssl ts -query` then POST to https://freetsa.org/tsr; certificates valid until Feb 2040). Store the file, hash, token and EXIF; export a PDF/ZIP packet with a verification how-to. https://freetsa.org/index_en.php
- **Process shots:** let the seller attach work-in-progress photos and a short video to the same listing record, timestamped the same way.
- **Listing link:** Etsy's Open API v3 (OAuth) can list a shop's listings and images; M1 avoids it by letting the seller pick a listing manually.
- **Copy sweep (M2, costs money):** reverse-image search is the expensive part. TinEye is about $0.04 per search, so 50 listings weekly is about $8 a month per shop, more than the plan price. Likely route: perceptual-hash match against results the seller's browser/extension sees on AliExpress/Temu search, or Google Lens via a user-side extension. Needs a spike before promising it.
- **Legal:** a timestamp proves a file existed at a time; it does not prove authorship. Packet wording must say so.

## Risks & open questions
- Does Etsy's review process give any weight to third-party timestamps? No source says so. A packet that cannot change the outcome is worth nothing; test by asking sellers in the VAR/Etsy-seller communities whether they would have attached it.
- Etsy may fix the bot, add a real appeal route, or change the standard, removing the pain. Etsy's CEO said on the Q1 2024 call that sellers could appeal (per VAR), so some improvement is plausible.
- The timestamp must exist **before** the takedown to help; sellers only feel pain after. Acquisition is therefore either "upload your top 10 listings now" (prevention, hard to sell) or "just got flagged, build my packet" (urgent, small one-time spend).
- Copy sweep economics (above) and scraping AliExpress/Temu terms.
- Dependence on Etsy for distribution; Etsy could ban or restrict API use.
- Evidence of paying is indirect (Pixsy, listing tools), not for this product.

## Sources
- https://valueaddedresource.net/etsy-creativity-standards-takedowns-no-appeal
- https://investors.etsy.com/_assets/_d7ee8700714b0f6cfcd5c437caf5f524/etsy/db/1016/9831/pdf/2024_Transparency_Report_Digital.pdf
- https://community.etsy.com/t5/Technical-Issues/Listing-has-been-deactivated-by-Etsy-for-violating-creative/m-p/148332897
- https://beancount.io/blog/2026/07/09/etsy-2026-fee-hike-ai-disclosure-rules-handmade-sellers-guide
- https://getcoai.com/news/etsy-balances-ai-and-authenticity-with-new-creativity-standards-for-sellers
- https://profittree.io/blog/best-etsy-seller-seo-tools-2026
- https://creatoreconomytools.com/tool/pixsy
- https://blog.tineye.com/new-image-search-pricing/
- https://freetsa.org/index_en.php
