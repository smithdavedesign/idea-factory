# citeproof — research

## Summary
Local-service marketing agencies (SEO, web, GBP) are being asked by clients "does ChatGPT recommend us?" and have no defensible way to answer, because AI answers vary run to run. citeproof runs each client's buyer-style prompts many times on the agency's own API keys and reports mention rate with a confidence range, the competitors named instead, and the sources cited, as a white-label monthly PDF.
The seed's catch is real: funded tools (Profound, Otterly, Peec) and local-agency tools (ThriveStack citedby, Rankability, LocalSeen, Locals Rank) already sell this. The only open wedge is credible measurement (repeated runs, ranges, raw answers kept as evidence) for one niche.
Confidence is low: demand for the category is proven, demand for this wedge is not.

## Evidence of the problem
- AI answers are unstable. SparkToro/Gumshoe ran 2,961 prompts, each 60–100 times per platform; the same brand list came back in under 1 in 100 runs, and the same list in the same order under 0.1% of the time. They recommend measuring how often a brand appears across many runs, not an "AI ranking position". (https://www.searchenginejournal.com/ai-recommendations-change-with-nearly-every-query-sparktoro/)
- Answer variance is now a named issue among AI-search practitioners. (https://www.airops.com/glossary/answer-variance)
- Local coverage is thin, so clients ask: LocalSeen's own study of 48 US markets reports AI assistants name only about 12 of the ~97 businesses Google Maps returns for a typical query (vendor claim). Locals Rank claims only 13% of 7,600+ local businesses appear in AI results (vendor claim). (https://alternativeto.net/software/localseen/about/, https://es.trustpilot.com/review/locals-rank.com)
- Agencies are told to sell this to clients: Insites frames AI visibility as a way to sell website work to local clients. (https://insites.com/selling-ai-visibility-to-local-business-clients)
- A tool-vendor founder argues pooled numbers hide per-engine differences and a dashboard export doesn't give the raw answers behind the worst number. (https://cloro.dev/blog/white-label-ai-visibility/) I found no first-hand agency complaints on Reddit in search; this is a gap.

## Who pays
- Buyer: owner or head of search at a small local-marketing agency (5–30 clients, home services, dental, legal) that needs a monthly AI-visibility section in client reports.
- Price point: $49–$149/month per agency for up to ~10 clients, or ~$10 per client per month on top. Anchored below.
- Evidence they pay for something like it today: Locals Rank charges agencies/clients a $298 setup + $149/month; LocalSeen lists $49–$149/month; Otterly Lite $29/month and Standard $189/month; Peec ~$80–$100/month with unlimited seats; Knowatoa from $59; Profound $99–$499/month; AthenaHQ from $295; Scrunch ~$250–$300. (https://www.capterra.ca/software/1097547/Locals-Rank, https://dupple.com/blog/best-ai-search-visibility-tools-2026, https://www.tooljunction.io/blog/ai-search-visibility-geo-platforms, https://marketful.com/?p=37628)
- AgencyAnalytics already adds an AI tracker to agency report dashboards, which shows agencies pay to put AI metrics in client reports. (https://agencyanalytics.com/features/ai-tracker)

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Profound | $99–$499/mo, enterprise custom | Brand/enterprise focus; Starter is ChatGPT only, 50 prompts |
| Otterly.ai | $29 Lite (15 prompts), $189 Standard (100) | Prompt-limited; extra engines raise price |
| Peec AI | ~$80–$100/mo, unlimited seats | Generic, not local; engine add-ons |
| ThriveStack citedby | not verified | Local-agency white-label, 20–40 prompts/location, 6 engines. Closest competitor |
| Rankability | not verified | Local SEO agencies; AI + GBP + local pack reports |
| LocalSeen | $49–$149/mo | Direct to businesses, free tier |
| Locals Rank | $298 setup + $149/mo | Service-heavy, direct clients |
| AgencyAnalytics AI tracker | part of agency plans | Generalist reporting |
| Manual checks in ChatGPT | free | One answer, not repeatable, no evidence |
Gap: none of the vendors' marketing pages that I read advertise confidence ranges from repeated runs or retained raw answers as the headline; this is unverified and may be wrong.

## Technical notes
- Run each prompt N times (e.g. 20) per engine. Mention rate = share of runs naming the client; show a Wilson interval. Store every raw answer plus cited URLs as evidence.
- Cost: OpenAI's and Anthropic's built-in web search are listed at about $10 per 1,000 searches plus tokens; Gemini grounding about $14 per 1,000 queries on Gemini 3 (secondhand). Dedicated search APIs run $5–$35 per 1,000. 20 prompts × 20 runs × 3 engines = 1,200 calls per client per month, roughly $12+ at API rates. (https://ecorpit.com/agent-web-search-api-cost-comparison-2026/) So the agency brings its own API keys (BYO key) to keep David's cost at $0, and results are API-based, not scraped from consumer apps (scraping breaks provider terms).
- API answers may differ from the consumer ChatGPT app. The report must say so; this is the biggest credibility risk.
- Stack idea: static front end plus small serverless function; PDF via headless browser; keys stay in the user's browser.

## Risks & open questions
- Crowded: at least 8 funded or established competitors, several local-specific.
- API vs consumer-app mismatch undermines "this is what customers see".
- Provider caps/cost fall on the agency; BYO key adds setup friction.
- No first-hand evidence agencies would switch for statistical rigor; need 5 agency conversations.
- AI-search engines or AgencyAnalytics may add ranges natively.
- Which engines matter for local queries (Google AI Overviews has no official API).

## Sources
- https://www.searchenginejournal.com/ai-recommendations-change-with-nearly-every-query-sparktoro/
- https://www.airops.com/glossary/answer-variance
- https://dupple.com/blog/best-ai-search-visibility-tools-2026
- https://www.tooljunction.io/blog/ai-search-visibility-geo-platforms
- https://marketful.com/?p=37628
- https://insites.com/selling-ai-visibility-to-local-business-clients
- https://alternativeto.net/software/localseen/about/
- https://www.capterra.ca/software/1097547/Locals-Rank
- https://agencyanalytics.com/features/ai-tracker
- https://cloro.dev/blog/white-label-ai-visibility/
- https://ecorpit.com/agent-web-search-api-cost-comparison-2026/
