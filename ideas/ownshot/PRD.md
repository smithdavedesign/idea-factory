# ownshot — PRD

## Problem
Handmade Etsy sellers whose photos are copied by AliExpress/Temu/Shein sellers get their own listings auto-flagged under Etsy's Creativity Standards. They are told they cannot appeal, lose reviews and ranking by relisting, and are warned of suspension on a repeat (Value Added Resource, Sept 2024). The proof they scramble together afterwards (supply receipts, videos) is undated and has not reinstated listings. Nothing today records, at the time of shooting, that the seller made the photo first.

## Target user
The owner of a one-person handmade or design shop on Etsy with about 20–300 listings, where a few best-sellers carry the income and Star Seller status matters. The moment: an email says a top listing was deactivated for violating Creativity Standards, with a suspension warning on the next one. They are active in Etsy seller forums and Facebook groups.

## Competitors & gap
Pixsy ($19–$89 a month) and Copytrack monitor the open web for licensing claims and share recoveries; Etsy listing tools (EverBee, eRank, Marmalead, Alura; $6–$30 a month) do SEO. None records dated originals per listing or builds a marketplace-takedown packet. Etsy's own route is Support then Trust & Safety, with inconsistent results. Gap: a cheap, per-listing, independently timestamped originals record plus an appeal-ready export. Unproven: whether Etsy gives such a packet any weight.

## MVP scope
- Upload original photos (and optional process photos/video) per listing; store the SHA-256 hash and EXIF capture time.
- Get an RFC 3161 timestamp token (FreeTSA) for each upload and keep it with the file.
- Per-listing "case file" page: originals, process shots, notes (materials, tools, date made).
- One-click appeal packet export (PDF + ZIP) with a plain-English "how to verify this timestamp" page and honest wording that it proves existence at a time, not authorship.
- Paste-in appeal message drafts for Etsy Support/Trust & Safety using the case file.
- "Flag received" quick start: seller pastes the listing URL and email text, and gets a checklist of what to attach.
- Simple account and Stripe checkout ($9 one-time packet or $12/month for unlimited listings).

## Non-goals
- No automatic copy detection or takedown notices in M1.
- No Etsy API integration or listing edits in M1.
- No legal advice, no claim that Etsy will reinstate a listing.
- No coverage of other marketplaces (Amazon Handmade, Shopify).

## Success metrics
- 30 Etsy sellers reach a landing page "build my packet" signup within 4 weeks of posting in seller communities (reach test, number is a guess).
- At least 5 of 30 say in follow-up they would pay $9 for a packet (about 15%).
- At least 3 sellers report attaching a packet to an Etsy appeal, and we record the outcome of each; success target is learning whether any reinstatement happens (even 1 of 3 is a signal).
- M1 builds a verified timestamp for 100% of test uploads in under 10 seconds each.

## Open questions
- Does Etsy support staff or Trust & Safety weigh independent timestamps at all?
- Is the better first buyer the flagged seller (urgent, one-time) or the careful seller (prevention, subscription)?
- Can a copy sweep be run at under $2 per shop per month?
- Will sellers upload originals to a new service they have not heard of?
