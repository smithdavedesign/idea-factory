# credclock — research

## Summary
Small clinics (1–10 clinicians: NP-led practices, therapy groups, med-spas) must keep each clinician's state license, DEA, malpractice certificate and CAQH re-attestation (every 120 days) current, or payers hold claims. Nothing warns them about expired documents; they use spreadsheets or pay a credentialing service $45–$500 per provider per month.
credclock is a flat-price expirables and CAQH-clock tracker for practices too small for Medallion/Modio-class tools, built on provider data only (no patient data).
The paid wedge is the 120-day CAQH clock plus a "will this attestation get blocked?" pre-check against document expiry dates.

## Evidence of the problem
- CAQH requires re-attestation every 120 days; it sends one reminder near day 120 but does not warn about expired licenses or malpractice certificates on file until you try to attest and get blocked. A missed attestation does not break loudly: existing claims may keep flowing, then new panel requests and re-credentialing stall. Source: https://omnimd.com/blog/caqh-profile-setup-maintenance-guide/
- The same vendor cites one anecdote (not verified) of a profile inactive under a month leading three payers to hold claims: over $38,000 denied and dozens of patients rescheduled. Same source.
- Malpractice face sheets are the most common lapse because policies renew annually. Source: search summary of https://omnimd.com/blog/caqh-profile-setup-maintenance-guide/
- No Reddit/forum thread was found in this research; evidence is vendor content only. This is a weakness (see Risks).

## Who pays
- **Buyer:** owner or practice manager of a 1–10 clinician practice (NP-led primary care, behavioral health group, med-spa, PT clinic). The person who today owns the credentialing spreadsheet.
- **Price point:** $19/month flat for up to 5 clinicians, $39/month up to 15 (the suggested test price; it sits under every priced alternative below).
- **Evidence they pay for a workaround today:**
  - Credentialing services charge ongoing maintenance of $100–$500 per provider per month, with one vendor describing a $45–$60 per provider maintenance plan covering recredentialing and CAQH attestations. https://www.carepatron.com/blog/how-much-does-credentialing-cost and https://medwave.io/2026/03/how-much-does-medical-credentialing-cost/
  - Software: CredentialMyDoc entry tier est. $300–$400 per provider/year (third-party estimate); Modio est. $50–$125 per provider/month; Medallion est. $150+ per provider/month (aggregator estimates, conflicting). https://www.spendbase.co/?p=37330 and https://www.sprypt.com/blog/credentialing-software-healthcare-solutions
  - Illustrative revenue at risk: 12 sessions a week at $120 is about $5,760 a month, about $1,440 per week of delay. https://www.carepatron.com/blog/how-much-does-credentialing-cost
- Caveat: all prices come from vendor or aggregator pages. No practice has been interviewed.

## Competitors & alternatives
| Name | Price (est.) | Gap |
|---|---|---|
| CAQH ProView | Free for providers | Reminder only at day ~120; does not flag expired documents until attestation is blocked; no practice-wide view |
| Spreadsheet + calendar | Free | Goes stale; single owner |
| CredentialMyDoc | ~$300–$400 per provider/yr entry tier (third-party estimate) | Contact-sales pricing; built around payer enrollment workflow |
| Modio Health | ~$50–$125 per provider/mo (estimates conflict) | Per-provider pricing adds up; broader than a small practice needs |
| Medallion | ~$150–$500 per provider/mo (estimates conflict) | Enterprise/custom pricing |
| RosterSafe | Free for 1 provider, then $25 per active provider/mo, $100/mo minimum (Capterra listing) | Aimed at billing firms |
| Credentialing services | $45–$500 per provider/mo maintenance | Human service, expensive for 1–5 clinicians |

Source for RosterSafe and others: https://www.getapp.sg/software/115143/credentialmydoc and search listings above.

## Technical notes
- Data model is small: clinician, document (type, issuer, number, expiry), CAQH attestation date. Clock rule: next attestation = last + 120 days; alerts at 30/14/3 days.
- Pre-check: warn when any document expiring before the next attestation date would block it.
- No patient data, no PHI; do not store SSN, DEA or license numbers in M1 (store only type, last 4 and dates). This keeps HIPAA scope out.
- Reminder delivery by email (Resend free tier) and an ICS calendar feed. No CAQH scraping or login (against terms, brittle). Entry is manual or CSV.
- Stack can be fully $0: Vercel Hobby, free Postgres/SQLite (Turso), GitHub Actions or Vercel cron.

## Risks & open questions
- Demand is unproven: no forum thread, interview or purchase signal found beyond vendor marketing.
- Free CAQH reminders plus a spreadsheet may be "good enough"; the paid wedge must be the document-expiry pre-check and multi-clinician view.
- Practice owners may distrust a new vendor with credential data; keep stored data minimal.
- Reminder-only tools risk liability if an alert fails; needs a clear disclaimer.
- Sales channel unclear: David has no healthcare network. Test with a landing page and practice-manager communities.
- Do not claim compliance or credentialing services; this is a calendar and checklist.

## Sources
- https://omnimd.com/blog/caqh-profile-setup-maintenance-guide/
- https://www.carepatron.com/blog/how-much-does-credentialing-cost
- https://medwave.io/2026/03/how-much-does-medical-credentialing-cost/
- https://www.spendbase.co/?p=37330
- https://www.sprypt.com/blog/credentialing-software-healthcare-solutions
- https://www.getapp.sg/software/115143/credentialmydoc
