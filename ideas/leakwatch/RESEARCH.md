# leakwatch — research

## Summary
Solo sellers of templates, ebooks and courses on Gumroad/Etsy/Payhip get their files re-posted on free-download aggregator sites and Telegram. Takedown services exist but start around $45–$99/mo or $99–$199 per notice, and Google's own removal form is free but manual. leakwatch is a $19/mo weekly sweep that finds leaked copies and prepares ready-to-send takedown notices, aimed at the gap below $45/mo.

## Evidence of the problem
- A piracy-scanning vendor claims free course aggregator sites account for ~55% of Gumroad piracy, Telegram ~30%, torrents ~10%, cloud storage ~5%, and that manual searching catches only 20–30%. Gumroad delivers direct file downloads, so copies spread easily. (vendor's own data, unverified) — https://coursepiracy.com/blog/gumroad-course-piracy-prevention-guide-2026
- DMCA Masters says private Telegram channels charge ~$5/month for access to stolen creator content and that most takedown tools skip Telegram. — https://dmcamasters.com/platforms/telegram-takedown
- Caveat: all of this comes from companies selling takedowns. I found no independent prevalence data and no first-hand seller complaints in search.

## Who pays
- **Buyer:** a solo creator or tiny studio selling digital products (Notion/Figma/Canva templates, design packs, ebooks, small courses) on Gumroad, Etsy or Payhip, roughly $1k–$10k/mo revenue.
- **Price point:** $19/mo (below the cheapest paid competitor found, $45/mo).
- **Evidence people pay for a workaround today:**
  - Remove.tech creator plans: $99 / $199 / $249 / $399 per creator per month ($79 on annual Starter). — https://www.remove.tech/creator-protection
  - BranditScan "from $45/month" for content creators. — https://bustem.com/blog/best-dmca-takedown-service
  - Altahonos Telegram removal from $149 per channel; DMCA Masters sells Telegram removal too. — https://dmcamasters.com/platforms/telegram-takedown
  - Pixsy (images) $209/yr personal, $429/yr advanced per its monitor page. — https://www.pixsy.com/monitor
- This shows a paid market exists at $45+. It is NOT evidence that sellers earning under $5k/mo will pay $19; the demand test must prove that.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Remove.tech | $99–$399/mo per creator | Priced for larger creators/agencies; testimonials are 30K–5M followers |
| BranditScan | from $45/mo | Creator-focused; anecdotally less thorough than Rulta |
| Ceartas | $99–$199/takedown (search summary) | Per-notice pricing too high for a $30 template |
| DMCA Masters / Altahonos | from $149 per Telegram channel | Telegram only |
| coursepiracy.com | free first scan, paid price not published | Course-focused; low-end pricing unclear |
| DMCA.com | pay-on-success, amount not stated | Manual filing |
| Pixsy | $0 / $209/yr / $429/yr | Images only |
| Google removal form | free | Manual: sworn statement + URL list per request |

## Technical notes
- Google Search removals use a web form; the submitter swears under penalty of perjury to be the rights owner or authorised, and supplies a description of the work, the original URL and each infringing URL. Removal from Search does not delete the source page; a separate notice to the host is needed. — https://support.google.com/transparencyreport/answer/7347743
- I found no bulk/API submission for Google's form, so the tool prepares notices that the owner pastes and submits (this also keeps the legal declaration with the owner).
- Detection: search-API queries built from product title, filename and distinctive strings ("free download", "nulled", site:t.me). Which search API is usable at $0 for a new project is an open question.
- Host lookup via RDAP/DNS to find abuse contacts for host-level notices.

## Risks & open questions
- Demand is unproven below $45/mo; sellers may shrug at piracy of $30 files.
- Private Telegram channels are not web-indexed, so the ~30% Telegram share is out of reach in M1.
- False positives (licensed resellers, reviews, affiliates): a wrongful notice is a legal risk; every notice must be human-approved and the tool must never file on the user's behalf.
- Search-API cost/availability at $0 is unverified.
- Vendor piracy-share stats are self-reported.
- Whack-a-mole: aggregators re-post, so perceived value may be low.

## Sources
- https://www.remove.tech/creator-protection
- https://coursepiracy.com/blog/gumroad-course-piracy-prevention-guide-2026
- https://bustem.com/blog/best-dmca-takedown-service
- https://dmcamasters.com/platforms/telegram-takedown
- https://www.pixsy.com/monitor
- https://support.google.com/transparencyreport/answer/7347743
