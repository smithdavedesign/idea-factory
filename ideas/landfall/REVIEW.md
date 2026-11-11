# Verdict: PASS — score 5/10

Real, dated pain (Etsy DDP rule since 9 Jul 2026), but willingness to pay is unproven, the free incumbent (Etsy/Zonos) is improving, and the output is a liability-laden estimate that sellers must trust with their margins.

## Forcing questions

### Q1 Demand reality — 3/10
Evidence is of a *problem*, not of demand. The mandate and its penalty are well sourced (valueaddedresource.net, alura.io). Sellers are reacting by pausing US sales or inflating shipping (Fortune, 404 Media), and an Etsy community thread asks for "better tools" (title only, login-gated). But RESEARCH.md found no paid third-party DDP pricing tool, no price point and no seller asking to pay. Absence of competitors here reads as "no one has proven a market", not "open market". The $12–19 and $29 prices are the researcher's own proposal. Would change my mind: a seller in a community thread posting their re-pricing spreadsheet, or anyone pre-paying $19.

### Q2 Status quo — 5/10
The workaround is Etsy's free estimator one listing at a time, a spreadsheet plus ChatGPT for HS codes, or dropping the US. The estimator's gaps (no variations, manual entry, beta) are real for a 100-listing shop. However the rule has been live four months, so the sellers who stayed have already re-priced or padded shipping. Remaining pain is rate changes and variations, a smaller and shrinking pool. Etsy shipping bulk apply is the stated highest risk, and Etsy has every incentive to do it.

### Q3 Desperate specificity — 4/10
The target is a category: "non-US handmade seller, 20–300 listings, UK/CA/EU/AU/IN". No named person, no consequence heard from their mouth. The consequence (lost Purchase Protection, duty deducted) is concrete, but whether this seller is desperate enough to pay a third party instead of raising prices 15% by hand is unknown.

### Q4 Narrowest wedge — 6/10
Good: CSV in, CSV out, no API, no login, arithmetic core. The truly narrow wedge is a free no-upload calculator (cost, duty, DDP fee, Etsy fees → price) plus a one-time $19–29 bulk CSV. Weakness: the value hinges on correct HS code and duty rate, which sellers cannot verify and which change often. Pure margin arithmetic alone is a spreadsheet template.

### Q5 Observation (what M1 users should be watched doing)
Whether sellers know unit cost and weight per listing (Etsy exports don't contain them). Whether they trust the HS suggestion or leave it. Whether they actually paste the CSV back into Etsy or just read the numbers. What they do on seeing a "not-worth-it" flag: act or abandon.

### Q6 Future-fit — 4/10
Tariff volatility makes rate alerts useful, but the product is a one-time re-price, and each Etsy improvement (variations, bulk apply) erodes it. Marketplace-native tooling and carrier DDP products are the natural home. Not more essential in three years unless it becomes an ongoing rate/margin monitor, a different and larger product.

## Premises
1. Non-US sellers have a recurring, painful re-pricing task — supported, but shrinking after the first months.
2. A third party will be paid for what Etsy gives free — **unsupported**; no price evidence.
3. A solo-built estimate with LLM HS guesses is trustworthy enough to price from — weak; liability wording hurts conversion.
4. Etsy won't ship bulk/variation support soon — unsupported; Zonos Etsy quoter is "coming soon".
5. Sellers have cost and weight data at hand — unverified.

## Alternatives
- **A (minimal):** free single-page calculator plus Sheets template posted in seller communities; email capture for the bulk CSV. Effort S, risk low.
- **B (ideal):** ongoing duty-rate and margin monitor across marketplaces with alerts. Effort L, risk high.
- **C (extend existing):** fold into the packpass audience (same non-US Etsy seller segment). Effort S; better as a second product to an audience with proven demand.
Recommendation: A, and only after packpass demand data exists.

## Scope reduction
Right problem? Partly: the seller's outcome is "keep selling to the US without losing money", and the answer may be "raise US shipping" or "stop selling", neither needing a tool. Doing nothing: sellers use the free estimator or pad prices. Narrowest version worth testing: free calculator, no upload.

## M1 feasibility
- One person, weekend: yes (Next.js, pure `priceVariation()`, static `rates.json`, papaparse; ~6 files).
- Near-zero cost: yes (Vercel Hobby, no DB, local/free LLM for HS suggestion only).
- Single proving test: cost 20, duty 10%, DDP 15, fees, 30% target margin returns 30.00% ±0.01.
- Hidden cost: keeping `rates.json` correct is ongoing manual work that grows with tariff churn.

## Risks
- Etsy ships a bulk/variation-aware estimator (highest).
- Wrong HS/rate makes the seller lose money; liability.
- Sellers stop US sales instead of buying a tool.
- Etsy exports lack cost and weight, adding input friction.
- Same willingness-to-pay weakness as earlier Etsy-seller ideas.

## Kill criteria
Drop if Etsy or Zonos ships bulk/variation apply; fewer than 5% of 200 qualified visitors start an upload; fewer than 10 reach pay or pre-pay $19 in two weeks; or sellers say they've already re-priced.

## Assignment
Before building, ask in r/EtsySellers and UK Etsy groups: "How did you re-price variations for DDP, and would you pay $19 to automate it?" Count named, specific replies.
