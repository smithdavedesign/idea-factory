# Research — listlint

## Summary
- On 22 Oct 2026 Etsy announced that most listings need at least one unedited photo of the real item, and it banned AI-generated patterns, recipes and instructions. The announcement gave no grace period. Enforcement is "planned for early 2027" (updated 7 Nov).
- Sellers with hundreds or thousands of listings have no way to see which ones break the rule, and Etsy's automated takedowns have a record of wrongful removals and weak appeals.
- listlint is a browser-only check that scans a seller's photo folder and listing export, flags listings that lack a provably unedited photo, and builds a per-listing evidence file for appeals. Confidence is Low: the rule is new and no seller has been seen paying for a check like this.

## Evidence of the problem
- Etsy's Oct 22 2026 policy: every listing needs at least one unedited photo of the actual item against a real background. Cropping, resizing, straightening, lighting, exposure and background changes were all barred on that photo. A 7 Nov revision allows non-AI cropping, resizing and watermarks but still bans lighting, exposure and colour changes on it. The announcement set no deadline or grace period for existing listings. Source: https://www.valueaddedresource.net/etsy-bans-ai-patterns/
- The same article says Etsy planned "proactive enforcement ... for early 2027, with advance notice promised", and that Etsy is adding upload-time warnings when AI-generated images are detected, with plans to extend them to existing listings. Same source.
- Sellers worried about retaking photos for "hundreds or thousands" of existing listings, especially when the originals are gone. A professional photographer questioned why an uncorrected photo is more trustworthy, since phones already process images with AI. Same source.
- Sellers may owe refunds when buyers open cases for items "materially different" from the listing images, and repeated violations can lead to shop removal. Same source.
- Wrongful takedowns are already common. Seller reports include a top-selling listing removed as AI-flagged, repeated wrongful removals of listings using the seller's own photos, and sellers told no human can check the computerised flag. Sources: https://community.etsy.com/t5/Technical-Issues/Etsy-falsely-removed-my-best-selling-listing/td-p/146515383 , https://community.etsy.com/t5/Technical-Issues/My-listings-continue-to-be-wrongfully-taken-down-by-Etsy-s-AI/m-p/146626966 , https://www.valueaddedresource.net/etsy-creativity-standards-takedowns-no-appeal/
- Appeals: only listings removed under the Creativity Standards after 15 July 2025 can be appealed, within 90 days, and a denied appeal cannot be repeated. Etsy says that by the end of 2026 appeals will cover most policy areas. Source: https://help.etsy.com/hc/en-us/articles/33558571339159
- A suspended shop disappears from Etsy and stops making sales; customers may open cases during an appeal. Sources: https://help.etsy.com/hc/en-us/articles/115015672628-What-Can-I-Do-If-My-Account-Is-Suspended- , https://community.etsy.com/t5/Technical-Issues/False-Suspension-Led-To-Open-Cases-Which-Ruined-Store/m-p/146579614
- Etsy's VP of Customer Operations said Etsy is developing tools for sellers to demonstrate authorship, with no details given. This is a risk (see below). Source: https://www.valueaddedresource.net/etsy-bans-ai-patterns/

## Who pays
- **Buyer:** an Etsy seller with roughly 50–2,000 listings who earns a real income from the shop (physical goods, craft patterns, print-on-demand), not a hobbyist with 10 listings.
- **Price point:** $9/month, or $19 for a one-off full-shop scan and evidence pack. Both sit inside the range sellers already pay for tools.
- **Evidence they pay for adjacent tools today:** eRank starts around $5.99/month, Marmalead about $19/month with no free plan, Alura sources list $3.99–$69.99/month, EverBee $19.99–$99/month. Prices differ between sources, so treat them as rough. Sources: https://revenuegeeks.com/etsy/seller-tools , https://craftybase.com/blog/best-etsy-seo-tools , https://dev.to/makertoolst_5671ac6d1fa330ba6c/best-etsy-seo-tool-2026-erank-vs-alura-vs-marmalead-compared-10cn
- **Gap in the evidence:** those tools pay for search ranking, not for compliance. No source shows anyone paying for a policy check or for appeal evidence. The price is a guess anchored on the SEO-tool range.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| eRank | about $5.99/mo, free tier | SEO keywords and listing grades; no photo-provenance or policy check |
| Marmalead | about $19/mo | Scores titles, tags, descriptions; does not check photos against policy |
| Alura | $3.99–$69.99/mo (sources conflict) | Keyword and analytics suite; no compliance check |
| EverBee | free, $19.99–$99/mo (sources conflict) | Product research; no compliance check |
| Etsy's own listing-form warnings and Policy violations page | free | Only warns on upload and lists removals after the fact; does not audit the existing catalogue before enforcement |
| Do it by hand | free | Open each listing and judge it; unworkable at hundreds of listings |

No dedicated "will this photo be flagged" tool turned up in search; any AI-detector for this use is unverified.

## Technical notes
- The core check runs in the browser, so hosting is free and photos never leave the seller's machine. It reads EXIF (software tag, camera make/model, original vs modified timestamps) and C2PA Content Credentials where present, and compares perceptual hashes against the other photos in the same listing folder to find the likely original.
- The Etsy API is the hard path. A seller app can only read the registering seller's own shop. A product used by other sellers needs a Personal App first, then manually reviewed Commercial Access, and the docs state no rate limit number. Screen-scraping is not allowed. Listing-image endpoints were not confirmed. Source: https://developers.etsy.com/documentation/ and https://developers.etsy.com/documentation/essentials/authentication . So M1 uses the listing CSV export and a local photo folder, with no Etsy API.
- A metadata check can show a file was untouched (no editing software, camera tag present). It cannot show a file was never edited, because metadata can be stripped or forged. The tool must say "evidence", not "compliant".
- Etsy's exact policy page (https://www.etsy.com/legal/policy/listing-image-requirements/253962679005) returned 403 and was not read. Rules above come from secondary reporting.

## Risks & open questions
- The rules are in flux (revised 15 days after announcement). A tool built on today's wording may be wrong by January.
- Etsy has said it is building authorship tools. If they ship a native "prove it's mine" feature, the product loses its reason to exist.
- Etsy has not said how it will tell prohibited from permitted edits, so no external check can promise a listing will survive.
- Commercial API access is gated and manually reviewed, which caps a no-upload path.
- Demand is unproven: no seller was found asking for this. Reach is an assumption (Etsy seller forums and subreddits), and self-promotion rules there are unchecked.
- Sellers with print-on-demand or digital goods are mostly exempt, which shrinks the buyer pool to makers of physical goods and craft patterns.
- Open question: how many sellers actually lack an unedited photo? If most already have one, there is little to sell.

## Sources
- https://www.valueaddedresource.net/etsy-bans-ai-patterns/
- https://help.etsy.com/hc/en-us/articles/33558571339159
- https://help.etsy.com/hc/en-us/articles/115015672628-What-Can-I-Do-If-My-Account-Is-Suspended-
- https://community.etsy.com/t5/Technical-Issues/Etsy-falsely-removed-my-best-selling-listing/td-p/146515383
- https://community.etsy.com/t5/Technical-Issues/My-listings-continue-to-be-wrongfully-taken-down-by-Etsy-s-AI/m-p/146626966
- https://community.etsy.com/t5/Technical-Issues/False-Suspension-Led-To-Open-Cases-Which-Ruined-Store/m-p/146579614
- https://www.valueaddedresource.net/etsy-creativity-standards-takedowns-no-appeal/
- https://developers.etsy.com/documentation/
- https://developers.etsy.com/documentation/essentials/authentication
- https://revenuegeeks.com/etsy/seller-tools
- https://craftybase.com/blog/best-etsy-seo-tools
- https://dev.to/makertoolst_5671ac6d1fa330ba6c/best-etsy-seo-tool-2026-erank-vs-alura-vs-marmalead-compared-10cn
