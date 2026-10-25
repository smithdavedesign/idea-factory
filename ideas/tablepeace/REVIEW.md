# Verdict: PASS — score 5/10

One sentence: a one-time $19 purchase for a 3–6 week window, with free tools (Seatbee, Zola) as the price anchor and nothing but forum anecdotes as demand, is too thin to justify a test; the private multi-contributor input is a real wedge, but "couples text their parents" is the likely status quo.

## Forcing questions

### Q1 Demand Reality — 3/10
Evidence is WeddingWire forum threads (seating-chart-drama, seating-chart-stress, everything-coming-together) and one advice article telling couples to gather the info manually. These show the pain exists. They do not show anyone wants a tool for it, and RESEARCH.md admits there is no prevalence data and no sign anyone asked for this. Paid alternatives exist (PerfectTablePlan $29.95, Payhip solver $19–$29), so some people pay for solvers; none of that is demand for the contributor-link wedge. Interest is not demand. Stronger evidence: a couple or planner who has already tried to collect family conflicts and paid or asked for a better way, or 3 pre-sales at $19.

### Q2 Status Quo — 5/10
Status quo is sticky notes, a spreadsheet, a free tool (Zola, Seatbee), and above all a phone call or text to Mom. That last workaround is cheap and, for a couple who talks to their parents, arguably better than a link. The cost is mostly awkwardness and a few hours, not dollars. Position: the workaround is free and good enough for most. It would change my mind if couples describe the text-thread version as painful (lost replies, relatives unwilling to say it to the couple's face).

### Q3 Desperate Specificity — 5/10
The buyer is "an engaged couple with 80–200 guests" and a secondary parent or planner. That is a category, not a named person, and nobody has been spoken to. The sharpest persona is the bride doing the chart who has divorced parents and a feuding side of the family. The consequence is a scene at the reception, which is emotional but a one-day event, not a recurring cost. David has no wedding bookmarks or related repos.

### Q4 Narrowest Wedge — 6/10
The wedge is correctly the contributor links, not the solver. The narrowest testable version is one page: add guests, send 1–3 private links, see submitted pairs with the submitter, and get a table assignment. The PRD's free tier (2 links free, $19 unlock for export) is sound. The risk is that a competitor adds a "share a form" feature in an afternoon, since the wedge is a form plus tokens.

### Q5 (M1 observation)
Watch couples go from guest-list import to sending the first contributor link: do they send the link at all, or copy the names into a text? Do contributors fill it in, and do they write honest reasons? Does the couple trust the output enough to print it? Note where they drop out.

### Q6 Future-Fit — 4/10
Seating charts and weddings persist, but purchases are one-time and low-frequency, so there is no retention. AI makes a solver a commodity, and free tools improve. Nothing about the next three years makes this more essential. The wedge only matters if family-sourced conflict data becomes a recognised step, and there is no evidence it will.

## Premises
1. The conflict knowledge sits with parents and the wedding party, not the couple — plausible (forum threads), unmeasured.
2. Couples will send a link rather than text or call — **unsupported**, flagged in RESEARCH.md as unverified.
3. Family members will honestly submit "keep apart" notes through a link — unsupported; many will not answer, or will not put a feud in writing.
4. Couples will pay $19 when Seatbee and Zola are free — weakly supported by the existence of $19–$30 competitors.
5. Buyers can be reached through search ("wedding seating chart maker") — plausible but crowded and seasonal (May–Oct).

## Alternatives
- **A. Minimal: solver-only static page** (guests + rules, free, no database). Ships fastest, competes straight with free tools, no wedge. Not recommended.
- **B. Contributor-link MVP (the PRD).** The wedge, on a Turso/Next.js stack. Medium risk, low demand evidence.
- **C. Lateral: a family-input form only.** Skip the solver: the couple gets a private link per relative and a plain list of who flagged whom, exported to their existing tool (Zola/spreadsheet). Smallest build, tests the real hypothesis (will family submit?), but harder to charge $19 for.
- **D. Extend an existing David repo:** context search shows none about weddings or seating. The closest in spirit are the pettycourt and squadwrap ideas (friend-submitted input via links), which could share the private-submission pattern, but they are ideas, not code.

Recommendation: if tested at all, C then B. Not worth a slot now.

## Scope challenge (reduction mode)
Narrowest version worth testing: a landing page plus a fake-door flow ("add guests → generate contributor links"), no solver, to see whether anyone gets as far as generating links. The solver, PDF export and Stripe are deferrable. As written, the roadmap's M1 is just the solver, which is the commodity part and does not test the wedge; the wedge lands in M2.

## M1 feasibility
- One weekend: yes. A TypeScript hill-climb solver, CSV parser and a minimal page are a weekend of work. The wedge (M2 tokens and the privacy guarantee) is a second weekend.
- Zero cost: yes. Vercel included usage, Turso free, Resend free, and a Stripe Payment Link only on revenue.
- Single proving test: 150 guests, 30 pair rules, 15 tables of 10, zero must-avoid violations, under 2 seconds. It proves the solver, not the demand.

## Risks
- Free anchors (Seatbee ≤100 guests, Zola) cap the price.
- Seasonality: weddings cluster May–Oct, buyers show up in a 3–6 week window; it is late October now, so a two-week test would reach few couples in peak planning.
- Low-frequency, one-time purchase; no repeat revenue.
- Copyable: the wedge is a form with tokens.
- Sensitive data about family feuds: needs deletion, no cross-contributor leakage, and privacy copy.
- Trust: contributors may refuse to write down a conflict.
- Competitor details came from marketplace listings and could not be fully verified.

## Kill criteria
Drop it if, after a two-week test, 50+ visitors yield fewer than 3 waitlist signups or no one reaches the link-generation step; if interviewed couples say they would just text their parents; or if Zola/Seatbee add contributor input.

## Assignment
Post the question in r/weddingplanning: "How did you find out who couldn't sit together, and would you have used a private link for your family?" Count how many describe a real pain and a workaround worse than a text.
