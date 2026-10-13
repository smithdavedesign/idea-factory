# boardping — research

## Summary
- Small IT/cybersecurity MSPs that sell to K-12 districts learn about purchases late: districts post to their own sites, regional portals, BoardDocs-style agenda systems and newspapers, with no single national portal.
- Paid bid-alert services exist (BidNet Direct $599–$1,999/yr; RFPSchoolWatch; Civic IQ's pre-RFP signals), so buyers pay for this class of data, but they mostly alert at the posted-RFP stage or are generic across all trades.
- Wedge: a narrow, one-state, one-trade watcher that reads school-board agendas and budget packets for IT/security buying signals, deduplicates, verifies against the source document and emails a short weekly digest to local MSPs.

## Evidence of the problem
- Every district is its own procurement entity: "13,000+ individual websites, each with different posting schedules, formats, and requirements" (vendor blog) — https://www.nationgraph.com/post/where-to-find-k-12-rfps-how-to-build-a-school-bids-rfps-database-in-2025
- "No single national portal" for school RFPs; districts post to own pages, regional networks, state portals and legal notices; about a third of purchases go through cooperative contracts with no public solicitation — https://civiciq.com/blog/best-tools-to-find-school-safety-rfps-in-2026 (vendor marketing; not independent)
- Startups find district procurement a "challenging puzzle" — https://marketbrief.edweek.org/blog/2015/12/the_procurement_puzzle_startups_district_rfps (2015, dated)
- Board agendas are public ahead of the bid: Austin ISD publishes agendas through BoardDocs the Friday before each meeting and announces award recommendations in them — https://www.austinisd.org/cp/doing-business/process
- Civic IQ claims pre-RFP signals appear 6–18 months before an RFP (vendor claim, unverified) — https://civiciq.com/public-project/the-handbook-said-staff-may-not-use-an-ai-tool-with-76d54c55-889e-4ca5-8c07-0795cd8b7a51

No first-hand MSP complaints (forum threads) were found: the community search returned nothing usable. This is the biggest evidence gap.

## Who pays
- Buyer: owner or sales lead of a 5–50 person MSP/cybersecurity/network-cabling firm that sells to K-12 districts in one state. Reachable in MSP communities and state school-technology associations (to be confirmed).
- Price point: $79–$149/month per state-and-trade filter (the seed suggests $50–$200).
- Evidence they pay for something similar: BidNet Direct supplier tiers of $599 (one state), $1,199 (three states), $1,999 (nationwide) per year — https://civiciq.com/blog/civic-iq-bidnet-direct-pricing (figures from a search summary; the page returned 403 on direct fetch). BidPrime and HigherGov hide pricing (quote only) — https://www.g2.com/products/bidprime/pricing. RFPSchoolWatch is paid but pricing is not published — https://www.g2.com/sellers/rfpschoolwatch. An Apify actor sells E-rate Form 470 alerts at $0.45 each plus $5/month per filter, but has 2 total users — https://apify.com/yungstentech/erate-470-bid-radar (suggests low willingness to pay for the thin, open-data version).
- Honest read: category spend is proven; spend on this specific wedge is not.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| BidNet Direct | $599–$1,999/yr | Portal bids, all trades; no agenda-stage signals |
| RFPSchoolWatch | not published | Covers ~15,000 districts, posted RFPs; broad, not trade-specific |
| Civic IQ | free account; paid tiers unpublished | Pre-RFP signals from 80,000+ agencies; generic, wide net, marketing-led |
| BidPrime / HigherGov | quote only | General government |
| Apify E-rate 470 radar | $0.45/alert + $5/mo | One data source; 2 users |
| Visualping per-district pages | free tier / paid | One page at a time; no classification |
| Manual agenda reading | staff time | Hours per week |

Sources: https://www.extruct.ai/hub/rfpschoolwatch-com/ · https://civiciq.com/blog/best-tools-to-find-school-safety-rfps-in-2026 · https://apify.com/barking_wisdom/us-k12-cyber-it-rfp-monitor.md

## Technical notes
- Legistar has a read-only public API (token for some cities); civic-scraper supports Legistar, Granicus, CivicPlus, CivicClerk, PrimeGov but not BoardDocs — https://civic-scraper.readthedocs.io/en/latest/usage.html · https://council.nyc.gov/legislation/api
- USAC E-rate Form 470 open data (Socrata jt8s-3q52) is a free, structured second signal — https://apify.com/yungstentech/erate-470-bid-radar
- Pipeline: fetch agenda packets for ~50–150 districts in one state weekly → extract text → classify IT/security purchase signals with a free model → require a verbatim quote from the source doc and a link → dedupe → email digest. Near $0 on free models and GitHub Actions cron.
- Robots/terms for each platform unchecked.

## Risks & open questions
- Crowded: Civic IQ already does this broadly and is free to start; a one-state niche may not beat it.
- No first-hand evidence of MSPs asking for this; reach unproven.
- Agenda text is messy (PDFs, scanned packets); false positives kill trust.
- BoardDocs terms/robots unchecked; could block automation.
- $79/mo is not cheaper than BidNet (~$50/mo) and must justify itself by earlier signals.

## Sources
- https://www.nationgraph.com/post/where-to-find-k-12-rfps-how-to-build-a-school-bids-rfps-database-in-2025
- https://civiciq.com/blog/best-tools-to-find-school-safety-rfps-in-2026
- https://www.austinisd.org/cp/doing-business/process
- https://civiciq.com/blog/civic-iq-bidnet-direct-pricing
- https://www.g2.com/products/bidprime/pricing
- https://apify.com/yungstentech/erate-470-bid-radar
- https://civic-scraper.readthedocs.io/en/latest/usage.html
- https://www.extruct.ai/hub/rfpschoolwatch-com/
- https://marketbrief.edweek.org/blog/2015/12/the_procurement_puzzle_startups_district_rfps
