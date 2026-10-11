# listvault — PRD

## Problem
Google Business Profiles get suspended after ordinary edits, appeals take weeks, and once prompted the owner may have about 60 minutes to upload documents whose names and addresses must match the listing exactly. Agencies keep this evidence scattered across Drive folders and email, discover mismatches only mid-appeal, and edit listings without knowing which edits are risky. Sources are in RESEARCH.md (SEJ, LocalSearchForum, BrightLocal, Whitespark).

## Target user
A local-SEO freelancer or small agency managing 10–100 client GBP listings, who has already lost or nearly lost a listing and who can charge clients for "profile protection". Secondary: owners of 2–10 location service businesses.

## Competitors & gap
Monitoring tools (Omitted from $19/mo, MyReputation.ie, GBP Monitor) alert after a change. Reinstatement services (Whitespark $599, Sterling Sky $800) act after the suspension. Nothing prepares the evidence beforehand or scores an edit's risk before it is made. listvault owns the "before" step: a vault, a mismatch checker, a pre-edit checklist and an appeal packet.

## MVP scope
- Locations: add a client and location with the exact listed name, address, phone, category and service-area type.
- Document slots per location (license, Secretary of State record, utility/phone bill, DBA, third-party proof, lease, signage photos, walkthrough video link) with upload or URL.
- Mismatch checker that compares the normalised name and address across all entered documents and flags differences.
- Pre-edit risk checklist: pick the planned edit (address, name, category, hours, service area) and see risk notes plus the missing prep items for that location.
- Appeal packet export: a zip with an index page listing every document and its match status.
- Readiness score per location (0–100) and an agency dashboard sorted by weakest.
- Email-link login; flat pricing page with Stripe checkout (M2).

## Non-goals
- No GBP API connection, auto-edit or auto-revert in the MVP.
- No guaranteed reinstatement and no submitting appeals on the user's behalf.
- No review management or rank tracking.
- No done-for-you reinstatement service.

## Success metrics
- Landing test: at least 5 waitlist signups stating 10+ locations within 14 days and 50+ qualified visitors (cheap but meaningful for a niche this small).
- At least 3 of 10 interviewed agencies would pay $29/month.
- Product: the checker flags 100% of seeded mismatches in the test fixtures; a packet is produced in under 10 seconds for a 10-document location.
- Revenue target: 35 agency customers at $29/mo is about $1k/mo.

## Open questions
- Will agencies pay for prevention, or only after a suspension?
- Is a flat agency price or per-location pricing better?
- Is the suspension wave still ongoing in late 2026, or fading?
- How much document handling (retention, encryption) must be promised to earn trust?
- Do agencies prefer a document vault tied to their Drive instead of uploads?
