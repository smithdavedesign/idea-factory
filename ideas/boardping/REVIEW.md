# Verdict: PASS — score 4/10

Category spend is real (BidNet $599–$1,999/yr), but there is no first-hand evidence that small K-12 MSPs want agenda-stage alerts, Civic IQ already offers pre-RFP signals free to start, and David has no route to these buyers.

## Forcing questions

### Q1 Demand reality — 3/10
Evidence is all vendor marketing (nationgraph, Civic IQ blogs) and one 2015 EdWeek piece. RESEARCH.md says outright that no MSP complaints were found. The Apify E-rate 470 alert actor has 2 users at $5/mo: the thin open-data version shows low willingness to pay. Paid bid-alert tools prove spend on posted RFPs, not on agenda-stage signals. Pattern: "adjacent category spend mistaken for demand". Stronger evidence would be 3 MSP owners who name the last deal they learned of too late, or who pay for a pilot digest.

### Q2 Status quo — 5/10
The workaround is real: BidNet or other portals, Visualping, manual agenda reading, and cooperative contracts. But the status quo is already paid tools plus staff time, and RESEARCH.md says about a third of purchases never publicly solicit. Nobody quantifies hours or lost deals. Agenda items may also reach MSPs through existing relationships with district IT directors.

### Q3 Desperate specificity — 4/10
The buyer is "owner or sales lead of a 5–50 person MSP selling to K-12 in one state". That is a filter, not a person. No name, no state chosen, and the reach channel is "to be confirmed". Consequence of missing a lead is plausible (lost contract) but unheard from anyone.

### Q4 Narrowest wedge — 5/10
The wedge is good in shape: one state, one trade, a weekly email, quote-verified. The narrowest test needs no code: hand-build one digest for one state's 20 districts and send it to 10 MSPs. But the quality bar (messy PDFs, BoardDocs unsupported by civic-scraper, terms unchecked) makes a automated version costly in false positives.

### Q5 Observation (M1 watch list)
Watch whether an MSP owner opens the digest, clicks the quoted source, and says "I didn't know that." Watch for "Civic IQ already shows me this" and for whether alerts they ignore are false positives or things they already knew.

### Q6 Future-fit — 4/10
Cheaper LLM reading of documents lowers the barrier for everyone, including Civic IQ, BidNet and RFPSchoolWatch, who can add agenda parsing. E-rate and cyber-grant spend may rise, but a $79/mo niche has no moat against a platform adding a filter.

## Premises
1. Small MSPs miss deals because they learn of purchases at the RFP stage. Unsupported; no first-hand evidence.
2. Agenda-stage signal is early enough and specific enough to act on. Plausible (Austin ISD publishes agendas ahead), but the 6–18 month claim is a vendor claim.
3. They'll pay $79–$149/mo when BidNet is about $50/mo and Civic IQ has a free tier. Unsupported.
4. A free model can classify messy agendas with under 20% false positives. Untested.
5. David can reach these buyers. No evidence; no existing audience, no bookmarks or repos in this space.

## Alternatives
- **A. Minimal / concierge**: hand-curate one state's digest for a month and email 10 MSPs. Effort S, no automation; the only way to learn demand.
- **B. Ideal**: multi-source engine (Legistar, BoardDocs, E-rate 470, grant awards) with state filters. Effort L; competes with funded platforms.
- **C. Lateral**: sell the same pipeline to a different buyer (e.g. local security vendors, school-safety installers) or fold into a generic watch-and-alert engine shared with permitly and lienclock.
- **Extend existing repo**: permitly and lienclock use the same watch-and-alert pattern; sharing code lowers the build cost, but doesn't fix demand or reach.

Recommendation: A, and only after David has a named reachable state and 3 MSP contacts. Not worth a landing-page test now.

## Narrowest wedge
One state's 20–50 districts, one weekly email, only items with a verbatim quote and link.

## M1 feasibility
- Weekend build: yes. The fixture-driven extractor is a pure-function CLI with Vitest tests.
- Zero cost: yes (free models, GitHub Actions, Vercel Hobby).
- Single proving test: a fixture agenda with a Chromebook and firewall item yields exactly one alert whose quote is a substring of the source, and the same on a second run.
- But M1 proves only extraction, not demand. The riskiest parts (fetching BoardDocs/PDFs, terms) are in M2.

## Risks
- Crowded: Civic IQ is free to start and broad; BidNet, RFPSchoolWatch and BidPrime are established.
- No evidence of MSP demand; no reach channel.
- Messy PDFs and scans; one false alert loses trust.
- BoardDocs not covered by civic-scraper; robots and terms unchecked.
- Price roughly matches or exceeds BidNet, with a tiny niche (few hundred MSPs per state at best).
- Overlaps conceptually with several other watcher ideas already in the pipeline; adds one more B2B cold-outreach product.

## Kill criteria
Drop if: fewer than 3 of 10 contacted MSP owners say they'd pay $79 after seeing a hand-built sample digest; or the sample shows Civic IQ's free tier already surfaces the same items; or fewer than 8 of 10 sampled alerts check out against the source; or David can't name an association or community to reach MSPs in one state.

## Next action if revisited
Pick one state, hand-build one digest from five districts' agendas, and send it to five MSP owners found via LinkedIn. No code.
