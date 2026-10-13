**Verdict: pass. Score 4/10.** Crowded category, unproven wedge, no route to the buyer, and the BYO-key design makes it harder than the incumbents.

## Six forcing questions (pre-product: Q1-Q4 and Q6; Q5 becomes a watch list)

**Q1 Demand reality: 3/10.** Category demand is real: AgencyAnalytics sells an AI tracker inside agency reports, Insites tells agencies to sell AI visibility, and vendors charge $29-$499/month (RESEARCH.md). But there is no first-hand evidence from agencies that variance is a problem they would pay to fix; the research says so itself ("I found no first-hand agency complaints"). SparkToro's finding that brand lists repeat in under 1 in 100 runs proves the variance exists, not that anyone is upset about it. This is interest in a category, not demand for this wedge. Would change my mind: one agency that has lost or nearly lost a client over an unprovable AI-visibility claim.

**Q2 Status quo: 5/10.** Agencies already have ThriveStack citedby (local-agency white-label, 6 engines), Rankability, LocalSeen ($49-$149), Otterly ($29) or a manual ChatGPT check. The paid options are cheap and already white-label. The workaround costs little, so the pain looks mild rather than urgent.

**Q3 Desperate specificity: 3/10.** "Owner or search lead at a 5-30 client local agency" is a category, not a person. No name, no quote, no consequence beyond a client asking a question. David's bookmarks and repos show no agency connection, so no one is reachable by name.

**Q4 Narrowest wedge: 4/10.** Rigor (repeat runs, Wilson interval, retained raw answers) is narrow and cheap to build, but unverified as a switching reason, and an incumbent could add run counts and intervals quickly. Price is in the same band as LocalSeen and Otterly with no edge, and the agency also pays about $12+ per client per month in API costs and must create keys. That is a worse deal than the hosted incumbents, not a wedge.

**Q5 Observation (not answerable yet).** Watch an agency owner set up a client and read the report cold: do they get past creating an API key, do they read the interval or only the percentage, and do they paste the number into a client report?

**Q6 Future-fit: 4/10.** AI search will grow, but measurement is the first thing engines and reporting platforms absorb. A static client-side tool with no data of its own has no moat, and Google AI Overviews, the main local surface, has no API and is out of scope.

## Premises
1. Agencies need a defensible AI-visibility number. Partly supported, not shown to block a sale or renewal.
2. Confidence ranges and raw-answer evidence beat incumbents. Unsupported; PRD and research call it unverified.
3. Agencies will bring and pay for their own API keys. Unsupported, and a friction incumbents lack.
4. API answers are a fair proxy for consumer apps. Weak; named as the biggest credibility risk.
5. A solo developer can get 5 agency conversations from 100 cold posts. Unsupported; no audience.

## Alternatives
- **Minimal:** a free Wilson-interval AI mention-rate calculator as a lead magnet. Effort S, risk low, no revenue path.
- **Ideal:** hosted scheduled runs, history, client portal. Effort L, needs server-side keys and spend, breaks the $0 rule.
- **Lateral:** sell a one-off $99-$199 AI-visibility audit to 5 local businesses or agencies using the same engine. Effort S, tests willingness to pay with no product. This is the only version I'd back.
- **Extend David's repos:** no code overlap. The nearest agency-facing idea is listvault; both rely on reaching local-SEO agencies, which David hasn't shown he can do.

## Scope reduction: narrowest version worth testing
One page: business, city, service and an OpenAI key; 10 prompts x 20 repeats; per-prompt mention rate with a Wilson interval; CSV of raw answers. No PDF, Gemini, accounts or payments.

## M1 feasibility
- One person, one weekend: yes. Pure functions plus a small browser UI.
- Zero cost: yes. Vite static app on Vercel Hobby, no server; the user's key and spend are theirs.
- Single proving test: `wilson(7, 20)` gives about 0.18-0.57 and a stubbed 7-of-20 run reports 0.35.
- Building is not the risk; demand and reach are.

## Risks
- 8+ competitors, several local-specific with white-label.
- Rigor may not be a buying reason; agencies may want only a chart.
- API vs consumer-app mismatch invites disputes of the headline number.
- BYO-key friction and agency-borne API cost.
- No distribution channel for David into agencies.
- Incumbents or AgencyAnalytics add intervals natively.

## Kill criteria
Drop it if fewer than 2 agencies run a real client report, if none say the interval or raw-answer evidence is why they'd pay, or if 5 cold conversations show they prefer a hosted tracker with no API key.

## Next action
If David wants to pursue it anyway, do the lateral version first: offer a paid one-off audit to 5 agencies before writing any app.
