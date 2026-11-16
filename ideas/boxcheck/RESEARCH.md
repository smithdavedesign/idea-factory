# boxcheck — research

## Summary
From 2026, employers must put each employee's qualified overtime (only the "half" premium, not the whole overtime pay) in W-2 Box 12 code TT. Small employers on spreadsheets, cheap payroll, or non-standard pay (bonuses, differentials, mixed rates) can get it wrong, and a wrong figure costs the employee a deduction until a W-2c is filed.
boxcheck takes a payroll register CSV, recomputes the premium per employee per week and shows the TT value to enter or compare, with a line-by-line working an owner or bookkeeper can show a payroll provider.
Confidence is Low: the rule change and deadline are real, but I found no first-hand evidence that anyone pays for this check today.

## Evidence of the problem
- For 2026, qualified overtime compensation goes in Box 12 code TT, and employees generally may deduct only what the W-2 reports there. The employer must report the full amount paid even if the employee hits the cap. Source: https://www.thetaxadviser.com/news/2026/aug/irs-updates-overtime-deduction-faqs-adds-reporting-details/
- Only the premium counts: at a $20 regular rate and $30 overtime rate, QOC is $10 an hour. Source: https://blog.taxbandits.com/w-2-box-12-code-tt-vs-box-14-what-changed-for-qualified-overtime-reporting/
- If the employer under-reports, the employee cannot claim more without a corrected W-2c, and cannot use Form 4852 for it. The Tax Adviser source above. A W-2c is then the employer's job to file.
- TaxBandits warns that when payroll cannot identify QOC, "the risk of incorrectly reporting all wages internally categorized as overtime increases" (same TaxBandits source).
- A law-firm note says modifying payroll to track the premium is "significantly more challenging" for employers paying overtime by a non-FLSA formula. Source: https://bbklaw.com/resources/la-062426-take-note-mandatory-reporting-of-employees-qualified-overtime-compensation-for-2026
- Search snippet from a Mondaq article titled "Is your payroll company correctly calculating the no tax on overtime rule? Penalties will apply for the 2026 tax year": https://webiis10.mondaq.com/unitedstates/employee-rights-labour-relations/1784372/is-your-payroll-company-correctly-calculating-the-no-tax-on-overtime-rule-penalties-will-apply-for-the-2026-tax-year (I only saw the title, not the body).
- Workers overestimate the deduction by about double because they count the whole time-and-a-half. Source: https://247wallst.com/personal-finance/2026/08/22/the-overtime-tax-break-only-counts-the-half-not-the-time-and-a-half-most-workers-are-overestimating-it-by-double/
- Bonuses, shift differentials and commissions feed the regular rate, which is why overtime is often miscalculated (blog claim, unverified): https://support.gusto.com/article/106622205100000/

## Who pays
- Buyer: the owner or bookkeeper of a 5–50 employee hourly business (restaurants, shops, clinics, trades, light manufacturing) who runs payroll from a spreadsheet, a low-end payroll tool or an outside bookkeeper, and who has to produce W-2s by the 2027 filing deadline (one source says February 1, 2027; unverified, check IRS dates).
- Price point I would test: a one-time $29 per payroll year per business, or $149 for a bookkeeper covering up to 20 clients. This is my guess, not a researched number.
- Evidence they pay for something like it: small employers already pay $49 base + $6 per worker a month for payroll (OnPay/Gusto entry plans, about $109 a month at 10 employees) and Patriot from about $57 a month. Sources: https://gusto.com/resources/guides/switch-payroll-providers/onpay-pricing and https://gusto.com/resources/guides/best-cheap-payroll-services . That proves they pay to have payroll compliance done, not that they pay for a separate check. Honest gap: no direct evidence of paying for a TT audit.
- Penalty exposure is a reason to pay: one source says the IRS may add a second penalty for each employee copy with wrong Box 12 information (the TaxBandits-linked search result quoted "$680"; I could not confirm the amount on an IRS page).

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Payroll providers (Gusto, OnPay, ADP and others) | included in plans from about $49 base + $6 per worker | Most will calculate TT for employers inside their own system; the gap is only employers outside them or with non-standard pay, and no independent check |
| Free overtime calculators (Indeed Flex, Everhour, Toggl) | free | Estimate the employee's deduction; none takes a payroll register and reports per-employee TT. https://indeedflex.com/career-hub/tools/overtime-calculator , https://toggl.com/overtime-calculator/ |
| overtimeproof.pages.dev | free | Browser "Overtime Deduction Audit Report" aimed at the worker's deduction; employer-side register reconciliation not seen. https://overtimeproof.pages.dev/ |
| W-2 filing vendors (TaxBandits) | per-form fees | File what you give them; they do not recompute the premium |
| CPA or bookkeeper time | hourly | Manual, expensive for a 10-person payroll |

## Technical notes
- Core calculation is deterministic: per workweek, overtime hours over 40 × 0.5 × regular rate, where the regular rate includes bonuses and differentials. The Tax Adviser says the IRS FAQs cover regular-rate calculations and alternative methods but gives no formulas, so M1 should cover the plain 40-hour week and flag everything else rather than guess.
- Eligibility depends on FLSA-covered, non-exempt status; exempt categories and a bona fide 20% owner-manager are excluded (Tax Adviser source).
- Input is a CSV (employee, week, hours, pay lines). Runs fully in the browser, so no payroll data leaves the machine, which is also the privacy pitch.
- State daily-overtime and double-time rules may or may not count as FLSA overtime; M1 should flag those rows, not decide.

## Risks & open questions
- Payroll providers may simply get this right for most customers, shrinking the market to the unusual cases.
- Tax and payroll advice liability: the tool must say it reports a calculation, not advice, and show its working.
- IRS FAQs have changed more than once (Box 14 for 2025, TT for 2026), so rules can move.
- Seasonal: demand peaks in January; a build in winter is on a tight window.
- No first-hand quote from an employer or bookkeeper confirming they would pay.
- Reaching buyers: bookkeeper and small-business forums are the realistic channel; unverified.

## Sources
- https://www.thetaxadviser.com/news/2026/aug/irs-updates-overtime-deduction-faqs-adds-reporting-details/
- https://blog.taxbandits.com/w-2-box-12-code-tt-vs-box-14-what-changed-for-qualified-overtime-reporting/
- https://bbklaw.com/resources/la-062426-take-note-mandatory-reporting-of-employees-qualified-overtime-compensation-for-2026
- https://webiis10.mondaq.com/unitedstates/employee-rights-labour-relations/1784372/is-your-payroll-company-correctly-calculating-the-no-tax-on-overtime-rule-penalties-will-apply-for-the-2026-tax-year
- https://247wallst.com/personal-finance/2026/08/22/the-overtime-tax-break-only-counts-the-half-not-the-time-and-a-half-most-workers-are-overestimating-it-by-double/
- https://support.gusto.com/article/106622205100000/
- https://gusto.com/resources/guides/switch-payroll-providers/onpay-pricing
- https://gusto.com/resources/guides/best-cheap-payroll-services
- https://indeedflex.com/career-hub/tools/overtime-calculator
- https://toggl.com/overtime-calculator/
- https://overtimeproof.pages.dev/
