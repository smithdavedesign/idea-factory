# Verdict: PASS — score 4.5/10

**Summary:** A real, dated trigger (TPT's 1 Oct 2026 Basic/Exclusive split, Premium decision due 31 Dec) but no evidence anyone pays for tier math or migration help, the calculator is free-substitutable, and the decision window closes before a 14-day test could finish. Pass.

## Six forcing questions (pre-product: Q1–Q4, Q6; Q5 as watch plan)

### Q1 Demand Reality — 3/10
Evidence is of *pain about the policy*, not demand for this tool: Change.org petition with 1,523 signatures, Chalkbeat quotes of angry sellers, Facebook-group complaints (RESEARCH.md, Evidence of the problem). Petition signatures are interest, not demand. RESEARCH admits "no seller was found saying 'I'd pay for this'" and no first-person migration post was retrieved ("weakest link"). Adjacent spending (courses $115, $25/mo, platform fees) shows sellers pay for education and selling fees, not for this. Would change my mind: one seller in a Facebook group asking "is there a tool for…", or 3 $19 pre-orders.

### Q2 Status Quo — 4/10
Competitor is a free spreadsheet, ChatGPT, or the vendor blog calculators. Tier math is ~5 lines of arithmetic (break-even ≈43 sales/yr on a $5 resource); a seller can do it free in minutes. The migration chore is real (a Gumroad→Shopify guide says ~a week for under 10 products) but that is a different platform pair, inferred. Whether Payhip/Gumroad/Sellfy have CSV import is unconfirmed; if they do, the listing pack is a thin reformatter.

### Q3 Desperate Specificity — 5/10
The persona is reasonably sharp: an established TPT seller with 30–300 resources on Premium, facing the 31 Dec opt-in screen. But no named person, and the buyer is split: someone with 300 listings and real income may just pick Exclusive (80% payout, 39 sales/yr break-even) and need nothing. Those who leave TPT are the buyers of the listing pack, and that group is the one with no evidence.

### Q4 Narrowest Wedge — 5/10
The right wedge is the listing pack, not the calculator; the calculator is the lead magnet. The PRD ships both plus PDF summary, 4 platforms and fee tables (M1–M3), and M1 as written is the free part. Narrowest testable version: a landing page with a worked example of Basic vs Exclusive and a $19 pre-order for "your catalogue, ready to paste into Payhip/Etsy".

### Q5 (watch plan, M1)
Watch 5 sellers: do they enter real numbers or abandon at the CSV step? Do they screenshot the result and leave (free value captured) or click the $19 unlock? Which question do they ask that the calculator doesn't answer (likely "will TPT penalise me for selling elsewhere?" and "where do my buyers come from?").

### Q6 Future-Fit — 3/10
The trigger is a one-time policy cliff. After 31 Dec/1 Jan 2027 the urgency decays, and TPT may soften terms after the petitions. Annual re-decision is a weak recurring hook. Fees change, which gives a refresh reason, but this is a seasonal tool, not a growing one.

## Premises
1. Sellers face a real money decision by 31 Dec — supported (Chalkbeat, edubracket; fee figures are secondary and disagree in places).
2. Sellers can't get a personalised answer free — weak; arithmetic is trivial.
3. Migration by hand is painful enough to pay $19 — inferred, not evidenced.
4. A solo developer with no seller network can reach them in time — unsupported; reach is Facebook groups with rules unchecked.
5. Sellers will leave exclusivity to sell elsewhere — unclear: those storefronts bring no buyers (RESEARCH competitor table), which is the real reason many will stay.

## Alternatives
- **Minimal:** one free blog/page with the Basic vs Exclusive calculator, posted in seller groups, as a probe. Effort S, $0. Tests reach and questions before any listing-pack build.
- **Ideal:** the full calculator + listing pack with refresh subscription. Effort M, high risk given seasonal demand.
- **Lateral:** reuse the "seller facing a platform policy change" pattern already in the portfolio (landfall, ownshot, packpass, leakwatch all target Etsy/Amazon sellers) and bundle a single "marketplace seller toolkit" landing page, so one audience-building effort serves several ideas. David's portfolio has no extendable repo here; the overlap is in audience and tooling, not code.

## Narrowest wedge
Listing-pack-only: paste a catalogue sheet, get Payhip/Etsy-ready copy and fee-adjusted prices, $19. The calculator stays free.

## M1 feasibility
- One person, one weekend: yes (static Vite/TS, fee JSON, Vitest). The roadmap's own exit tests are concrete and correct (245.00 / 387.50 / 400.00 / 43).
- Zero cost: yes (Cloudflare Pages/Vercel, Stripe Payment Link takes fees only on sale).
- One test proving M1: the 245.00/387.50/400.00/43 cases plus no network calls.
- Caveat: M1 is the free calculator; the paid thing (M2) is where demand is unproven.

## Risks
- Deadline: 31 Dec is six weeks away; a 14-day test plus build leaves little time to act on the result.
- Free substitutes make the calculator worth $0.
- TPT may soften terms; sellers may default to Basic on 1 Jan and never decide.
- Fee numbers from secondary sources; wrong figures in a money tool destroy trust.
- No reach into seller communities; group rules may ban promotion.
- Possible conflict with TPT terms if marketed as "get off TPT".

## Kill criteria
Drop if after 14 days there are fewer than 3 $19 pre-orders or 8 signups from ≥100 qualified visitors, if TPT relaxes the off-platform restriction, or if Payhip/Gumroad/Sellfy offer CSV import that makes the listing pack redundant.

## What stronger evidence looks like
A seller saying in their own words that migrating listings is the blocker, a thread of sellers asking for a tool, or a pre-order. Not petition signatures.
