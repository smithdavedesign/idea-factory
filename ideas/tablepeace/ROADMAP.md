# Roadmap — tablepeace

## Suggested stack
- Next.js on Vercel Hobby — free hosting, one codebase for UI and API routes.
- Turso/SQLite free tier — stores events, guests, token links and submissions.
- Pure TypeScript solver module — greedy placement plus swap hill-climbing, unit-testable with Vitest.
- Resend free tier — magic-link email for the couple.
- jsPDF or print CSS — PDF export without a server.

## M1 — Solver and guest list (one weekend)
Deliverables:
- Guest list CSV/paste parser; tables with capacity.
- `solve(guests, tables, rules)` returning assignments, a score and unmet rules.
- Minimal page: paste guests, add pair rules by hand, see tables, print list.

Exit criteria (testable):
- Parsing "Ann Lee, Bob Ray" lines yields 2 guests with those names; duplicate names are flagged.
- 8 guests, 2 tables of 4, rule must-avoid(Ann, Bob): Ann and Bob are never at the same table.
- 8 guests, rule must-seat(Ann, Bob) and must-avoid(Bob, Cy): Ann and Bob together, Cy elsewhere.
- Total guests exceeding total capacity returns an error naming the shortfall.
- An impossible rule set (must-seat A,B; B,C; must-avoid A,C) returns the unmet rule and a suggested relaxation.
- 150 guests, 30 pair rules, 15 tables of 10: zero must-avoid violations, run time under 2 seconds.

## M2 — Contributor links
- Token links per contributor; contributor page lists names and collects pairs with reasons.
- Couple review page with the submitter shown; accept/reject.

Exit criteria:
- POST with a valid token stores a pair tagged with that contributor; an invalid token returns 403.
- GET on contributor A's link never returns contributor B's submissions.
- Deleting an event removes its guests, tokens and submissions.

## M3 — Export and payment
- PDF table list, place-card CSV; Stripe Payment Link unlock for $19.

Exit criteria:
- Export of a solved plan lists every guest exactly once.
- Unpaid events receive 402 on the export route; paid events receive the file.
