# landfall — roadmap

## Suggested stack
- Next.js on Vercel Hobby: free, one repo for UI and API.
- Pure TypeScript `priceVariation()` function with Vitest: the logic is arithmetic and must be testable.
- Static `rates.json` (HTS duty by chapter plus country overlay, each row with source URL and verified date): no database in M1.
- papaparse for CSV in and out: handles Etsy export quirks.
- Local LLM or free-tier model for HS code suggestion only, always overridable.

## M1 — Price calculator from CSV (one weekend)
Deliverables:
- Upload page that parses an Etsy listings CSV with variations.
- `priceVariation({cost, weightKg, originCountry, hsChapter, targetMarginPct, ddpFee, etsyTxnPct, paymentFeePct, paymentFixed})` returning price, duty, margin.
- `rates.json` with at least 10 chapters and 5 origin countries, each row with source URL and verified date.
- Results table and downloadable CSV of new US prices.

Exit criteria (tests):
- `priceVariation` with cost 20.00, duty 10 percent, ddpFee 15.00, etsyTxnPct 6.5, paymentFeePct 3, paymentFixed 0.25 and targetMarginPct 30 returns a price whose margin after all fees is 30.00 percent within 0.01.
- Duty 0 percent with ddpFee 0 and no fees returns cost / (1 - margin).
- A CSV with 3 variations in one listing produces 3 output rows with the same listing id.
- Every row in `rates.json` has an https source and an ISO `verified` date (test fails otherwise).
- A row whose price rises more than 25 percent over the current price gets `flag: "large-increase"`; negative margin gets `flag: "not-worth-it"`.

## M2 — HS suggestion and free preview
Deliverables: HS code suggestion with confirm/override; free preview limited to 5 listings; waitlist and pre-pay link ($19).
Exit criteria:
- Uploading 50 listings returns full results for 5 and `locked: true` for the rest.
- Overriding an HS code recomputes that listing's price.
- Suggestion endpoint returns a chapter from the allowed list for 10 fixture titles; an unknown title returns `needsReview: true`.

## M3 — Payment and rate-change alerts
Deliverables: Stripe checkout for the unlock; email alert when a rate row changes and a saved catalogue is affected.
Exit criteria:
- A paid session unlocks all rows; an unpaid session cannot fetch them (403).
- Changing one rate row in `rates.json` produces an alert listing the affected saved listings.
