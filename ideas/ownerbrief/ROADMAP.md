# ownerbrief — roadmap

## M1 — CSV in, approved letters out (weekend)
Deliverables: web page with CSV upload; parser for one generic owner-statement CSV schema (owner, property, category, amount, month); fact computation module; template-plus-model letter drafting; review page with copy button.
Exit criteria (testable):
- Uploading a CSV with 3 owners and 2 months returns 3 letters.
- For owner A with income 2,000.00, expenses 450.00, fee 160.00, the letter states net 1,390.00 (exact string match on the computed number).
- A category whose amount is more than 2x the prior month is returned in the `flags` array for that owner.
- A CSV missing the amount column returns HTTP 400 with an error naming the column.
- No letter contains a currency figure that is not in the computed facts for that owner (test scans letters).

## M2 — Real formats and history
Deliverables: column-mapping UI saved per PMS; presets for Buildium and AppFolio exports; opt-in saved numbers for month-over-month.
Exit criteria: preset files for two PMS formats parse into identical fact objects; saved prior month produces a correct delta in a test.

## M3 — Pay and send
Deliverables: Stripe payment link gating after first free batch; per-owner PDF download; email-ready HTML.
Exit criteria: a paid-flag account can generate a second batch; an unpaid account gets 402 after the first.

## Suggested stack
- TypeScript + Next.js on Vercel Hobby: one deployable, free tier.
- Papa Parse for CSV: robust, no cost.
- Facts in plain TS functions: deterministic, unit-testable.
- Free-tier LLM through the existing router, text-only: phrasing only.
- Stripe payment links: no billing code to write.
