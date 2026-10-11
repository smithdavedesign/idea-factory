# listvault — research

## Summary
- Google Business Profile (GBP) suspensions are frequent, often triggered by ordinary edits (address, hours, name), and appeals are slow (about 5 weeks in 2025) and strict (reportedly 60 minutes to upload documents once prompted).
- Local businesses and agencies already pay $100–$800 per case for reinstatement help, and monitoring tools ($19/mo and up) alert on changes. Nobody sells the *before* step: a per-location evidence vault that is appeal-ready and checks an edit's risk before it is made.
- The wedge is an agency-facing "appeal-ready" vault: documents that exactly match the listing, a pre-edit risk checklist, and a one-click appeal packet, at a flat price per agency.

## Evidence of the problem
- Mike Blumenthal (Search Engine Journal, 2025-03-21): appeal resolution grew from about 5 days to nearly 5 weeks; suspensions follow even minor edits; he advised making no changes to listings. https://www.searchenginejournal.com/google-business-profile-suspensions-rise-appeals-are-delayed/542602/
- LocalSearchForum thread "Is it too dicey to change address right now?" (started 2026-02-03; replies through 2026-07-20): video verification after an address change is followed by suspensions "within a few days"; one member was suspended after submitting a lease and a bar association profile, with no explanation from Google. Advice: align lease, utilities, bank, licenses and citations first. https://localsearchforum.com/threads/is-it-too-dicey-to-change-address-right-now.63046/post-203180
- BrightLocal (Oct 2025): "Have your required documents, like your business license, ready before a suspension hits." Checklist: business license matching GBP name and address exactly, Secretary of State record (link or screenshot showing the search URL), utility bills matching the business name, cell bill in the business name, DBA info, third-party proof (BBB, Chamber). Once prompted, you may have only 60 minutes to upload all files. https://www.brightlocal.com/learn/expert-tips-for-gbp-suspensions-verification-and-local-ranking/
- Whitespark: "Google rarely tells you exactly which rule you broke"; even "minor or accidental infringements" can trigger a suspension. https://whitespark.ca/gbp-reinstatement-service/

## Who pays
- **Buyer:** a local-SEO freelancer or small agency managing roughly 10–100 client listings, and secondarily multi-location owners (clinics, law offices, home-service firms) who lose calls while a profile is down.
- **Price point:** $29–$49/month flat for up to about 50 locations; a $9/mo solo tier for one business.
- **Evidence they pay for something like it today:**
  - Whitespark charges $599 per reinstatement project. https://whitespark.ca/gbp-reinstatement-service/
  - Sterling Sky lists $800 per location, charged only on successful reinstatement. https://www.sterlingsky.ca/google-business-profile-suspension-help/
  - A Fiverr reinstatement gig is listed at $100–$200. https://fiverr.com/proconsultify/google-profile-suspension-recovery-and-restoration-service
  - Steady Demand lists $79 per location per month for monitoring and reinstatement assurance. https://steadydemand.com/?p=3735
  - Monitoring tools (Omitted $19/mo for 1 location, $79/mo for 10; MyReputation.ie from €12/location/yr) show agencies pay recurring fees for GBP risk tooling. https://trustmrr.com/startup/omitted , https://www.g2.com/sellers/sevenoways-innovations
- One reinstatement avoided pays for years of the subscription, which is the sales argument.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Omitted (change monitoring + review-attack alerts) | $19/mo 1 loc, $39 for 3, $79 for 10 | Alerts after something changed; no evidence vault, no appeal packet |
| MyReputation.ie | Free 1 loc; from €12/location/yr | Hourly diffs and revert; nothing for appeals |
| GBP Monitor (Apify) | about $1.50/mo per location, pay per run | Developer-grade snapshots; no documents |
| LOCL Profile Lock | not listed | Reverts unauthorized edits; not appeal prep |
| Steady Demand | $79/location/mo + consult | Service-heavy, not self-serve software |
| Whitespark / Sterling Sky | $599 / $800 per case | Done-for-you after the suspension; expensive for small clients |
| BrightLocal checklist, spreadsheets, Drive folders | free | Manual, per-client chaos; no name/address consistency check |

## Technical notes
- M1 needs no Google API: the user enters each location's listed name, address, phone and category, then uploads or links documents. A pure-function checker compares exact strings (normalised case, punctuation, suite formatting) across the GBP listing, license, SOS record and utility bill fields, and flags mismatches.
- Pre-edit risk checklist rule engine: address change, name change, category change, service-area change and hours edits each map to risk notes and required prep drawn from the sources above. Rules are data, easy to update.
- Appeal packet: a zipped bundle plus a one-page index, generated server-side. Storage: Supabase or Cloudflare R2 free tiers.
- Later (M3): optional GBP API read access (OAuth) to auto-pull the listing; not needed for the test.

## Risks & open questions
- Demand evidence is practitioner commentary and vendor pricing; no one has been interviewed or has paid for a vault.
- Monitoring incumbents ($19/mo) could bolt on a document store.
- Google could fix the suspension wave (one source says a bug was fixed), shrinking the pain.
- Storing business license scans means handling sensitive documents: encryption, retention limits and a clear policy are needed.
- A vault doesn't guarantee reinstatement; marketing must not promise it.
- Reaching agencies without a network: LocalSearchForum, r/LocalSEO and BrightLocal community are the channels.

## Sources
- https://www.searchenginejournal.com/google-business-profile-suspensions-rise-appeals-are-delayed/542602/
- https://localsearchforum.com/threads/is-it-too-dicey-to-change-address-right-now.63046/post-203180
- https://www.brightlocal.com/learn/expert-tips-for-gbp-suspensions-verification-and-local-ranking/
- https://whitespark.ca/gbp-reinstatement-service/
- https://www.sterlingsky.ca/google-business-profile-suspension-help/
- https://steadydemand.com/?p=3735
- https://trustmrr.com/startup/omitted
- https://www.g2.com/sellers/sevenoways-innovations
- https://apify.com/moganes/gbp-monitor
- https://fiverr.com/proconsultify/google-profile-suspension-recovery-and-restoration-service
