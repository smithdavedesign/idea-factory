**Verdict: PASS. Score 2/10.** Offline trip expense splitting is crowded and has no demand evidence. The proposed stack (React Native, app stores) also breaks the $0 rule.

## Forcing questions

**Q1 Demand Reality: 1/10.** Every "evidence of the problem" item in RESEARCH.md is a competitor's marketing copy (TripLedger, Deudin, Kitty, SpndX). There are no user quotes, no complaints, no behavior and no payment. Interest is not demand, and here there isn't even interest. This is "hypothetical users". What would change my mind: three trip organizers describing, in their own words, a trip where Splitwise or a spreadsheet failed because they were offline.

**Q2 Status Quo: 4/10.** The status quo is Splitwise's free tier, a spreadsheet, chat threads, plus four to five free offline-first apps. The problem is real but already well served, so the workaround costs little. "Nothing exists" is not the claim here; the opposite is, and that is a competitive problem.

**Q3 Desperate Specificity: 1/10.** "Organizers of group trips" is a category, not a person. There is no name, no role, no consequence. Nothing in David's context (interests: job search, design, Webflow, AI tools, family tree) shows a travel-expense contact. His Open Fly Travel Assistant bookmark and Open-Travel repo show travel interest, not a user with this pain.

**Q4 Narrowest Wedge: 2/10.** The PRD's gap (no account, invite link, per-currency, offline) is already claimed by Deudin per RESEARCH.md. The M1 slice (single currency, equal split, settle up) is the most commoditized part and nobody pays for it. No wedge here is differentiated.

**Q5 Observation (not scorable yet).** Watch M1 users while they log a real trip's expenses: where they hesitate on split modes, whether they bother with offline at all, whether non-installers actually open a link, and whether anyone settles with the output.

**Q6 Future-Fit: 3/10.** Better connectivity and eSIMs shrink the offline pain. Splitting is a commodity feature that OS vendors or chat apps can absorb. No thesis for why this gets more essential.

## Premises
1. Offline is the pain that stops people using existing splitters. Unsupported: only competitor marketing says so.
2. Non-installers joining by link is unserved. Contradicted: Deudin already does it.
3. Users will switch from Splitwise or a spreadsheet. Unsupported: the research lists acquisition as an open risk.
4. This can earn money. Unsupported: competitors are free or ad-supported.

## Alternatives
- **A. Minimal:** a static web PWA with the ledger encoded in a shareable URL (localStorage, no backend). Effort S, risk Low, $0. Still undifferentiated.
- **B. Extend an existing repo:** add a split-expenses tab to Open-Travel / Open Fly Travel Assistant (live on Vercel). Effort S-M, risk Low, free distribution, but still no demand evidence.
- **C. Lateral:** a multi-currency settle-up calculator only (enter who paid what, get minimal transfers). Effort S, SEO-competitive, free.
- **D. Ideal architecture:** local-first CRDT sync app. Effort XL, risk High, not justified without demand.

**Recommendation:** none of them yet. If forced, A, and only after a landing page proves interest.

## Narrowest wedge
A zero-install PWA where the whole multi-currency ledger lives in a shareable link and works offline after the first load. Even this is untested and undifferentiated against Deudin.

## M1 feasibility
- **Weekend build:** the engine is a weekend of work for one person. A shippable app on stores is not.
- **$0:** no. React Native with App Store and Play Store distribution costs $99/yr and $25 and adds review delays. A web PWA on Vercel Hobby would be $0.
- **Scope check:** the 5-milestone roadmap with CRDT-style sync, encryption and store listings is far beyond a solo, no-risk demand test.
- **Test that proves M1:** log 10 mixed-split expenses offline, run settle up, and unit-test that the transfers match a hand-computed minimum.

## Risks
- Crowded market with five free offline-first competitors, one with the same differentiator.
- No demand evidence; the research is competitor marketing only.
- App store fees break the $0 rule.
- Free-or-ads pricing everywhere means little revenue.
- Sync and conflict resolution are heavy for a solo developer.
- Handling money invites trust and privacy questions.

## Kill criteria
Pass now. If revived as a web PWA landing-page test, drop it if under 5 signups from 50+ visitors in 14 days, or if two real trip organizers say Splitwise or a spreadsheet is good enough.

## What to watch M1 users doing
Whether they log expenses offline at all, which split mode they pick, whether the non-installer link gets opened, and whether anyone uses the settle-up output to actually pay each other.

## Assignment
Before building anything, ask five people who organized a group trip in the last year how they split costs and what went wrong. If none mention being offline, the premise is dead.
