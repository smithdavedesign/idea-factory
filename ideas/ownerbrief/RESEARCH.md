# ownerbrief — research

## Summary
Seed: a productized "automate one repetitive workflow for one niche" offer. A person-sold service doesn't fit David's constraints (day job, no sales calls), so this takes the seed's "recurring client reports / weekly operating summaries" example and makes it self-serve software for one niche: small property managers (50–300 doors) who write a monthly owner letter by hand on top of the system's raw owner statement.
ownerbrief takes the owner-statement export (CSV/PDF) and drafts a plain-English letter per owner (what you earned, what was deducted and why, what's next, flagged oddities). The manager approves and sends.
Evidence is mostly vendor blogs; confidence is low until a real property manager says they'd pay.

## Evidence of the problem
- Rentvine's retention article calls the owner statement "the most important document" a management company produces; names late, confusing, and format-changing statements as the failure modes; claims the average company loses 8–15% of owners a year (unsourced, vendor claim). https://www.rentvine.com/blog/how-to-improve-owner-retention-with-better-workflows-communication-reporting
- Enterprise DNA (an automation consultancy, so a sales pitch) estimates 15–20 minutes per property per month on performance reports, i.e. 45–60 hours/month for 180 properties. Unverified. https://enterprisedna.co/resources/blog/real-estate-track-property-owner-communication
- Comparison reviews say custom report builders in AppFolio/Buildium stop short of true BI, and owner-level customization is limited; all owners on an account get the same format. https://ustechautomations.com/resources/blog/property-management-reporting-automation-comparison-2026
- Buildium and AppFolio can schedule and send statements natively, so the gap is the narrative/explanation, not the delivery. https://www.buildium.com/blog/how-to-generate-financial-statements-in-property-management/
- Searches did NOT find a first-person manager complaint thread (no Reddit results). That is an open gap.

## Who pays
- Buyer: owner/principal or operations manager at a self-run property management company with ~50–300 doors and 1–5 staff, who currently writes owner emails by hand.
- Price point: $29–$79/month flat. Anchors: Buildium plans roughly $62 / $192 / $400 a month (third-party sources), AppFolio minimum around $280–$300/month. A $49 add-on is small against those and against Rentvine's own estimate of $4k–$8k lifetime value per door. https://www.costbench.com/compare/buildium-vs-appfolio/
- Evidence they pay for a workaround: staff time (above, unverified), and consultancies selling owner-report automation (Enterprise DNA, US Tech Automations) — shows that someone is hired to do it, but no published price. https://ustechautomations.com/resources/blog/how-to-client-reporting-for-property-managers-2026
- Weakness: no direct evidence of a price someone paid for narrative owner letters specifically.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| AppFolio / Buildium native owner statements and portals | in the PMS plan (~$62+/mo Buildium, ~$280+/mo AppFolio min) | Numbers only, same format for every owner; no explanation of why a line changed |
| SimplifyEm, ProhostAI owner statements | not published in results | Statement generation, no narrative layer found (https://prohost.ai/learn/financial/guide/owner-statements) |
| Consultancy-built AI agents (Enterprise DNA, US Tech Automations) | custom, not published | Custom service, needs sales calls; the thing ownerbrief productizes |
| ChatGPT/Claude by hand | $0–$20 | Manager must paste financial data into a general chatbot each month; no templates, no per-owner batch, no variance checks |
| Rentvine / DoorLoop etc. | PMS subscriptions | Dashboards and portals, not letters |

## Technical notes
- Input: CSV/PDF owner-statement exports (every PMS can export them); no API integration or credentials in M1 — upload only, so no custody of PMS logins.
- Variances are computed in code (month vs prior month, expense outliers, vacancy, late rent); the model only phrases verified numbers. This keeps figures correct.
- Text on free models; PDF parsing is the main engineering risk (varied statement layouts). CSV first.
- Hosting: static front end + serverless on free tiers; email via a free-tier provider.

## Risks & open questions
- Demand evidence is vendor-sourced. Biggest risk: managers say "the portal is enough".
- Statement formats vary by PMS; parsing PDFs is brittle.
- Financial data about owners/tenants: storage and privacy duties; process in memory, don't store by default.
- PMS vendors could add AI summaries natively.
- Wrong number in a letter damages trust: needs a human approval step and numbers sourced from code.
- Distribution to property managers without sales calls is unproven (SEO, PM Facebook groups, NARPM).
- Sibling niche rejected: bookkeeper document chasing ($12–$49/mo DocChase) is already served by Content Snare ($29–$99) and ClientClose.

## Sources
- https://www.rentvine.com/blog/how-to-improve-owner-retention-with-better-workflows-communication-reporting
- https://enterprisedna.co/resources/blog/real-estate-track-property-owner-communication
- https://ustechautomations.com/resources/blog/property-management-reporting-automation-comparison-2026
- https://ustechautomations.com/resources/blog/how-to-client-reporting-for-property-managers-2026
- https://www.buildium.com/blog/how-to-generate-financial-statements-in-property-management/
- https://www.costbench.com/compare/buildium-vs-appfolio/
- https://prohost.ai/learn/financial/guide/owner-statements
- https://hunted.space/product/docchase
