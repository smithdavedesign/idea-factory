# credclock — PRD

## Problem
A clinician's payer enrollment depends on a CAQH profile re-attested every 120 days and on current license, DEA and malpractice documents. CAQH sends one reminder near day 120 and does not flag expired documents until attestation is blocked. Lapses are silent: existing claims may keep paying, then new panels and re-credentialing stall, and claims can be held (one vendor anecdote: over $38,000 denied). Small practices track this in spreadsheets or pay a service $45–$500 per provider per month. (RESEARCH.md, Evidence and Who pays)

## Target user
The owner or practice manager of a 1–10 clinician practice (NP-led primary care, behavioral health group, PT clinic, med-spa) who today owns the credentialing spreadsheet. Moment of pain: a payer holds claims or a panel application stalls because CAQH or a malpractice certificate lapsed.

## Competitors & gap
CAQH ProView (free, reminder only), spreadsheets, CredentialMyDoc, Modio, Medallion (per-provider pricing, sales-led), RosterSafe (billing firms), and credentialing services ($45–$500 per provider/mo). Gap: a self-serve, flat-price tracker for 1–10 clinicians whose key feature is the pre-check "which documents will block your next attestation".

## MVP scope
- Practice account with up to 10 clinicians (name, role, state) and no patient data.
- Document records per clinician: type (license, DEA, malpractice, board cert, other), expiry date, last 4 of number, optional file link; no file storage in M1.
- CAQH clock: store last attestation date; next due = +120 days.
- Pre-check: list every document expiring before the next attestation date, flagged as "will block attestation".
- Email reminders at 60/30/14/3 days for documents and 30/14/3 days for the CAQH clock, sent once each.
- ICS calendar feed per practice.
- CSV import and a single dashboard sorted by soonest deadline.

## Non-goals
- No CAQH login, scraping or auto-attestation.
- No payer enrollment filing or credentialing services.
- No patient data or PHI; no storing full license/DEA numbers.
- No primary-source verification (NPDB, OIG exclusion) in M1.
- No hospital/MSO-scale workflows.

## Success metrics
- Landing test (14 days): 50+ qualified visitors from practice-manager communities and at least 5 waitlist signups stating 2+ clinicians.
- At least 3 of 10 interviewed practice managers say they would pay $19/month.
- M1 correctness: a clinician with CAQH attested 2026-10-01 (next due 2027-01-29) and malpractice expiring 2026-12-01 is flagged "will block attestation".
- Revenue target for a go signal: 50 practices at $19 = about $950/month.

## Open questions
- Will practices pay over a spreadsheet plus free CAQH reminders?
- Where do practice managers gather, and will they respond to cold outreach?
- Is a document-expiry pre-check enough, or must payer enrollment status be tracked too?
- What disclaimer wording is needed for missed alerts?
