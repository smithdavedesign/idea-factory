# Deductwise — research

## Summary
Self-managing landlords with 1–10 units must return or itemize a tenant's security deposit by a state-specific deadline (14–60 days). Missing it, or deducting full replacement cost instead of a prorated share, can void the right to withhold and expose them to double or triple damages. Deductwise turns a move-out walkthrough into a state-correct, prorated, evidence-attached itemized statement before the deadline, at a per-move-out price.

## Evidence of the problem
- Missing the deadline is the costliest mistake: "Miss the deadline or fail to itemize and many states void your right to withhold"; tenants may be awarded two to three times the wrongfully withheld amount plus legal costs. https://www.landlordstudio.com/blog/security-deposit-return-letter-f8403
- A state-by-state guide lists deadlines from 14 days (AZ, NE, NY, VT, HI, AK) through 21 (CA, WA, MN, WI), 30 (TX, most states) to 60 (AL, AR, WV). It says 38 states allow double damages for willful non-compliance and at least 12 (including CA, GA, MA) allow triple damages for bad faith. It estimates a $1,200 dispute can cost $4,000–$8,000 once fees are included, and that a $2,000 deposit can become a $4,000 judgment if the deadline is missed by a day. These figures come from a landlord-software vendor blog, not a statute. https://www.verticalrent.com/blog/returning-a-security-deposit-state-deadlines-every-landlord-must-know
- The same page cites an American Apartment Owners Association claim that deposit disputes are nearly 40% of rental small-claims cases, and a 2023 TransUnion SmartMove survey saying 68% of renters would pursue legal action over a wrongly withheld deposit. Both are second-hand and unverified.
- New York firm reports small-claims judges often rule for tenants when the landlord lacked adequate documentation or missed the 30-day deadline, and require objective proof rather than assertion. https://www.daeryunlaw.com/us/practices/detail/security-deposit-refund
- Receipts are required for deductions over $125 in California, and an untimely itemization is treated as no itemization. A vendor blog says leases signed after 1 Jan 2026 need move-in and move-out photos to justify deductions in California (unverified against the statute). https://terms.law/Demand-Letters/respond/landlord-tenant/california-landlord-respond-security-deposit.html and https://apps.apple.com/app/proofmi/id6756241402
- Landlords may charge only a prorated share of an item's remaining useful life, not full replacement. Worked example: 10-year carpet, 7 years old at move-in leaves about 30% of replacement cost. Useful-life figures vary by source (carpet 5–10 yrs, paint 2–5 yrs) and are guidelines, not law. https://ipropertymanagement.com/laws/landlord-carpet-replacement-law

I found no first-person landlord complaint threads in this session (search returned law-firm and vendor pages only). The evidence of pain is therefore vendor- and law-firm-sourced.

## Who pays
- **Buyer:** the self-managing landlord with 1–10 units (accidental landlords, small investors), at the moment a tenant moves out. Also small property managers handling a few doors.
- **Price point:** $19 per move-out packet, or about $49/yr for unlimited packets. This is a proposal, not a measured number.
- **Evidence they pay for something like it today:**
  - TurboTenant Pro is listed at $119/yr billed annually ($9.92/month) and Premium $149/yr, with extra charges for some landlord forms. https://capterra.com/p/147659/Turbo-Tenant/
  - Lease agreements cost $59 each on TurboTenant's free plan, per a competitor comparison. https://www.tenantcloud.com/?p=7558
  - ProofMi, a rental inspection app with timestamped photos, charges $4.99–$14.99/month or $39–$119/yr. https://apps.apple.com/app/proofmi/id6756241402
  - Attorneys and demand-letter template sites sell deposit letters in many states (e.g. ezel.ai templates; a California attorney practice page). https://ezel.ai/templates/security-deposit-itemization-letter/ut and https://www.terms.law/practice-areas/security-deposit-attorney/
  - The downside is a money loss of 2–3x the deposit plus fees, which is the budget justification.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Landlord Studio | Free GO tier; PRO trial 14 days; free return-letter template | Generic letter, no state-deadline check or proration found; unclear if deposit tools sit in the free tier |
| Pendo Rental (iOS) | Free | Inspections and deposit tracking; no state-law-aware itemization or proration found |
| ProofMi | $4.99–$14.99/mo | Timestamped photo inspections; not a deductions statement builder |
| RentCheck | not shown | Inspection software aimed at property managers, integrates with AppFolio etc. |
| Tenwell | Export free | Deposit record-keeping; photos exported separately |
| TurboTenant / Avail / TenantCloud | Free to about $119–$149/yr | Leasing and screening suites; deposit receipts, no itemization generator found |
| Paperform template | Free | Form with deduction calculator; no state rules or proration |
| Attorney letters / template sites | Varies (not verified) | One-off, expensive, state by state |
| ChatGPT with a pasted statute | Free | No stored evidence, no deadline tracking, easy to get the state wrong |

Main weakness: free templates and general AI are the real substitute.

## Technical notes
- Core is deterministic: a data table of state deadlines, itemization and receipt rules, interest rules and penalty multipliers, plus a proration formula (replacement cost × remaining life ÷ useful life, capped at actual cost).
- Input: tenant, deposit, move-out date, forwarding address date, and line items (description, cost, photo, item age at move-in). Output: PDF statement, evidence appendix with photos, and a deadline countdown email.
- Statute data must be sourced from official state statutes and carry a "last verified" date. Deadlines are state-level only; some cities (e.g. rent-controlled cities) add rules.
- Stack is a small web app with no photo-OCR needed; PDF generation is server-side.
- Not legal advice; ship with a clear disclaimer and per-state statute links.

## Risks & open questions
- Unauthorized practice of law and liability if the statute table is wrong; mitigated by showing the statute text and "verify" date.
- Free competitors and ChatGPT cover the template. The differentiator is the state check plus proration plus evidence bundle, and it is unproven that landlords pay for it.
- Seasonal and episodic: a purchase happens once per move-out; unclear repeat rate.
- Demand evidence is vendor/law-firm content, with no first-person landlord posts gathered yet.
- Reach: search for "[state] security deposit itemization letter" is crowded with free templates.

## Sources
- https://www.landlordstudio.com/blog/security-deposit-return-letter-f8403
- https://www.verticalrent.com/blog/returning-a-security-deposit-state-deadlines-every-landlord-must-know
- https://www.daeryunlaw.com/us/practices/detail/security-deposit-refund
- https://terms.law/Demand-Letters/respond/landlord-tenant/california-landlord-respond-security-deposit.html
- https://ipropertymanagement.com/laws/landlord-carpet-replacement-law
- https://apps.apple.com/app/proofmi/id6756241402
- https://capterra.com/p/147659/Turbo-Tenant/
- https://www.tenantcloud.com/?p=7558
- https://ezel.ai/templates/security-deposit-itemization-letter/ut
- https://www.terms.law/practice-areas/security-deposit-attorney/
