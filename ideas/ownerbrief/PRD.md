# ownerbrief — PRD

## Problem
Small property managers send each owner a numbers-only statement from their PMS. Owners who don't understand a line (why maintenance doubled, why rent is short) call or email, and owners who feel ignored leave (vendor claims 8–15% annual owner churn). Managers write explanatory letters by hand, or skip them.

## Target user
Principal or ops manager at a 50–300 door property management company with 1–5 staff, on Buildium, AppFolio, Rentvine, DoorLoop or similar, who exports owner statements monthly. Moment of pain: the 1st–5th of the month, drafting 40+ owner emails.

## Competitors & gap
PMS-native statements and portals deliver numbers in one format for everyone; consultancies build custom agents at custom prices; generic chatbots need manual pasting. Gap: a self-serve, per-owner plain-English letter built from verified numbers, with a human approval step, at a flat low price.

## MVP scope
- Upload a CSV owner-statement export (one file, many owners); map columns once per PMS format.
- Compute per-owner facts in code: income, expenses by category, management fee, net payout, change vs prior month, vacancy/late rent flags.
- Draft a short letter per owner (earned / deducted and why / what's next) from those facts only.
- Flag anomalies for the manager (expense >2x prior month, negative payout, missing month).
- Review screen: edit, approve, copy or download as email text/PDF.
- Prior-month history kept only as numbers the manager opts to save.
- Flat monthly subscription via Stripe payment link; first batch free.

## Non-goals
No PMS API integrations or stored PMS credentials; no accounting or trust-account functionality; no tenant communication; no legal or tax advice; no auto-sending without approval.

## Success metrics
- Letter generation for a 50-owner file in under 2 minutes.
- 100% of figures in letters match the source CSV (tested).
- Demand test: 5 property managers try a free batch and 2 say they'd pay $39/mo within 3 weeks.
- 20 signups from NARPM/PM community posts in the first month, 10% converting to paid.

## Open questions
- Do small managers actually write explanatory letters today, or only send the statement?
- Which PMS export formats first (Buildium vs AppFolio vs Rentvine)?
- Does anyone pay for this separately from their PMS?
- Is it acceptable to process owner financials on a third-party model, and what do managers need to be told?
