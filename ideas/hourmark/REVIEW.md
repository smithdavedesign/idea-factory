# Verdict: pass — score 4/10

Real audit exposure for supervisors, but no direct demand evidence, a crowded field, and no route to the buyers.

## Forcing questions
- **Q1 Demand (3/10).** No first-person complaint found. The one "unsolved pain" lead is a marketing roundup with no quotes or URLs (nicheloom, RESEARCH.md). Paid competitors (Guidara $29/seat, Psych Logger $9.99) show spend on the category, not on this wedge. Interest is not demand. Stronger evidence: a supervisor who lost or nearly lost an associate's month, or one who pays for a tracker now.
- **Q2 Status quo (5/10).** Per-state spreadsheets and free or cheap associate apps. Rules are strict (Oregon voids the month's hours; 14-day record production), so the pain is real, but a spreadsheet plus a calendar reminder covers most of it.
- **Q3 Specificity (4/10).** Private-practice LMFT/LPC/LCSW supervisor with 2–10 associates, billing about $300/month each (Texas example). No named person, nothing heard directly. Associates usually choose the tracker.
- **Q4 Wedge (5/10).** Flat $19, unlimited associates, monthly-minimum alarm, audit PDF. Small to build, but close to Guidara and easy to copy; only the pricing differs.
- **Q6 Future-fit (4/10).** Boards are tightening verification (CA 2021 notice), a tailwind. But hand-kept rule tables go stale, and an EHR or board portal could absorb this.
- **Q5 (watch, not scored).** See the end.

## Premises
1. Supervisors, not associates, adopt and pay: unsupported.
2. Audit and voided-month risk is painful enough to buy: partly supported by rules, no user quotes.
3. Flat price beats per-seat Guidara: unproven; a supervisor with 2–3 associates pays about the same.
4. A solo developer can keep a 3-state rule table correct: weak; a wrong rule costs real hours.

## Alternatives
- **Extend credclock** (David's clinic credential tracker, same small-practice buyer): add a supervisor-hours module and reuse its reminders. Effort S–M, low risk.
- **Free no-login rule checker** (state, hours, status plus board link): tests whether supervisors search for this at all. Effort S.
- **Interview first:** talk to 10 supervisors before any build. The full invite, co-sign and audit SaaS (ideal architecture) waits for that.

## Narrowest wedge
No-login monthly check: pick the state, enter individual and group hours, get ok, at-risk or below-minimum with the board source. Charge later for co-sign history and the audit PDF.

## M1 feasibility
- One weekend: yes (rule table, `checkMonth`, one page).
- Zero cost: yes (Next.js on Vercel or Cloudflare, no LLM, no paid APIs).
- Proving test: `checkMonth('TX', 3h individual)` returns below-minimum; every rule has a `sourceUrl`.
- Buildable is not the problem; demand and distribution are.

## Risks
- Guidara and many cheap apps already exist.
- No therapist network, so a demand test would draw weak traffic.
- Stale or wrong rules harm users and bring liability.
- $19/month needs about 53 payers for $1,000/month.
- Another compliance tracker in a pile (credclock, permitly, vendorfile) with no distribution edge.

## Kill criteria
- Fewer than 3 of 10 supervisors describe a missed or near-missed month, or pay for a tracker today.
- Fewer than 5 supervisor signups from 50+ qualified visitors in 14 days.
- Supervisors say the associate chooses the tool.

## Watch M1 users
Watch a supervisor enter a real month for two associates without help. Note whether they know their state's rule, whether they trust the status without checking the board link, and whether they reach for their spreadsheet instead.

## Assignment
Post the honest question in r/LMFT and r/therapists and talk to 10 supervisors before building anything.
