# Research — tablepeace

## Summary
Couples building a wedding seating chart have to decide who can't sit near whom, and the information lives in other people's heads (parents, grandparents, the maid of honor) and is awkward to ask for out loud.
tablepeace gives each of those people a private link to submit "keep apart / seat together" notes that no one else can see, then auto-seats the room and explains any conflict it couldn't solve.
Existing solvers exist ($19–$30 one-time, or free tiers) but all assume the couple already knows every relationship and types it in alone.

## Evidence of the problem
- WeddingWire forum threads show couples stuck on feuding and divorced relatives, with worry that splitting family up will itself cause a scene: https://www.weddingwire.com/wedding-forums/seating-chart-drama/9599b93c33ce19cb.html and https://www.weddingwire.com/wedding-forums/seating-chart-stress/d9cf7a9bb5d5cc15.html
- One bride described having to seat parents with each other's siblings and struggling to get her future mother-in-law to accept it: https://www.weddingwire.com/wedding-forums/everything-coming-together-but-seating-chart-stress/4569c423d9439d2e.html
- Advice commonly given: seat the hardest guests first, wait for RSVPs, and "pick a neutral helper" — i.e. the couple is told to gather the sensitive info manually: https://www.spain4weddings.com/how-to-make-a-wedding-seating-chart-without-stressing-out/
- These are forum anecdotes, not measured prevalence. No survey of how many couples lose sleep over it was found.

## Who pays
- Buyer: an engaged couple (or the family member/planner doing the chart) with 80–200 guests, one time, in the 3–6 weeks between RSVP deadline and the wedding.
- Price point: $19–$29 one-time.
- Evidence they pay for something like it today: PerfectTablePlan sells a one-time license from $29.95 (https://www.perfecttableplan.com/html/seating_plan_software.html); the "Wedding Seating Conflict Solver" sells at $19 launch / $29 regular on Payhip (https://payhip.com/b/v7mjB); Table Tailor has an in-app Pro Pack (https://apps.apple.com/app/id1615013728). Price of the Pro Pack not found.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| PerfectTablePlan | from $29.95 one-time, Windows/Mac desktop | Desktop software; the couple types every rule themselves |
| Wedding Seating Conflict Solver (Payhip) | $19 launch / $29, offline browser app, Chrome/Edge desktop | Tables only, not seat order; CSV import; single user; no phone flow |
| Table Tailor (iOS) | free up to 75 guests, Pro Pack price not found; 2.9/5 from 7 reviews | Small, weakly rated; single user |
| Seatbee | free up to 100 guests (listing claims rules for together/apart, unverified) https://www.producthunt.com/p/seatbee | Free tier is the real price anchor; single user |
| Zola free seating chart | free | Floor plan + drag-and-drop; no keep-apart rule mentioned on its page https://zola.com/wedding-planning/seating-chart |
| Sticky notes / spreadsheet | free | What most couples do |

## Technical notes
- Seating with must/avoid pairs is a small constraint problem; a greedy-plus-local-search (swap hill-climb) solver is enough for 200 guests and runs in the browser. The Payhip competitor shows such a solver ships as a static browser app.
- Private collection: each contributor link carries a random token; contributors see only the guest list names (or just their own family subset) and submit pairs. The couple sees all pairs with who submitted them; other contributors never do.
- Stack must stay $0: static front end plus a small free-tier database for the tokens and submissions.

## Risks & open questions
- Free tools (Seatbee up to 100 guests, Zola) set a low price anchor; the wedge has to be the multi-contributor private input, not the solver.
- Unverified: whether couples would actually forward a link to parents for this, or just text them. Needs a demand test.
- Seasonality: weddings cluster May–Oct; buyers are reached in a 3–6 week window each.
- Sensitive data (family feuds): must be deletable and never shown to other contributors.
- Competitor sources are marketplace listings and may be inaccurate; Zola/The Knot feature sets could not be confirmed.

## Sources
- https://www.weddingwire.com/wedding-forums/seating-chart-drama/9599b93c33ce19cb.html
- https://www.weddingwire.com/wedding-forums/seating-chart-stress/d9cf7a9bb5d5cc15.html
- https://www.weddingwire.com/wedding-forums/everything-coming-together-but-seating-chart-stress/4569c423d9439d2e.html
- https://www.spain4weddings.com/how-to-make-a-wedding-seating-chart-without-stressing-out/
- https://www.perfecttableplan.com/html/seating_plan_software.html
- https://payhip.com/b/v7mjB
- https://apps.apple.com/app/id1615013728
- https://www.producthunt.com/p/seatbee
- https://zola.com/wedding-planning/seating-chart
