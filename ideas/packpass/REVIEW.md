# Verdict: validate — score 6/10

Real, dated trigger (EU PPWR applies since 12 Aug 2026; Etsy asks for EPR IDs but leaves sellers to work out the rules) and a cheap-to-build wedge. Whether sellers pay for a plan, rather than having it done for them, is unproven, so it earns only a two-week waitlist test.

## Forcing questions
**Q1 Demand reality: 4/10.** No evidence anyone pays a third party for a plan (RESEARCH.md says so itself). What exists is pain and confusion: Etsy's petition post (valueaddedresource.net), conflicting advice in the UK Business Forums and Etsy community threads (dated), adjacent spend on representatives (190 EUR/yr) and EUReady. That is interest, not demand. Stronger evidence: a seller pre-paying $29, or replying "I'd pay for this" to a specific post.

**Q2 Status quo: 7/10.** Free guides (Listadum), forums, a representative per country, or a spreadsheet. The cost is concrete: 570+ EUR/yr for three countries; fines up to 100k EUR (DE) and 30k EUR (FR), from vendor sources. Etsy's ID prompt makes inaction visible.

**Q3 Desperate specificity: 5/10.** A category with a moment: a non-EU Etsy/Shopify owner at $20k-$300k/yr shipping to 2-6 EU countries who just got the EPR prompt. No named person. Reachable in seller forums, with spam risk.

**Q4 Narrowest wedge: 7/10.** DE + FR questionnaire into an ordered checklist and cost range, no accounts, no DB. Ledger, reminders and paywall wait.

**Q5 Observation:** can't be answered pre-product. Watch M1 users: which countries they pick, whether they enter parcel counts or bail, whether they ask "can you register me?", whether they distrust the cost ranges, and whether they click the $29 pre-pay.

**Q6 Future-fit: 4/10.** The rules churn favours a maintained source, but an EU simplification, platform pay-on-behalf, or Etsy's petition could shrink it within a year (the suspension proposal isn't adopted). A 1-2 year window, not a durable business.

## Premises
1. Small non-EU sellers must act now. Supported by timing and Etsy's ID collection; enforcement on micro-sellers unproven.
2. They want to decide, not delegate. Unsupported; flagged open in the research.
3. A neutral $29 plan beats free guides. Unproven; Listadum covers part of it.
4. One person can keep the rules accurate. Plausible for 4 countries, a growing burden beyond.

## Alternatives
- **Minimal:** free calculator and checklist with email capture, monetised later by affiliate referral to a representative. Effort S, risk low.
- **Ideal:** full packpass (8 countries, ledger, reminders, Stripe). Effort M-L, risk medium; maintenance before proof.
- **Lateral:** paid, dated "EU EPR rules digest" or template; no app to run.
- **Extend David's repos:** feedwarden and permitly share the "rules change, alert the small operator" pattern; reuse the rules-table/diff scaffold.

Recommendation: the minimal one, as the wedge below.

## Narrowest wedge (scope reduction)
Free DE + FR questionnaire producing a checklist and cost range for a US/UK Etsy self-shipper, with a $29 waitlist for the multi-country plan and ledger.

## M1 feasibility
- Weekend build: yes. Next.js on Vercel Hobby, `rules.json` in the repo, pure `buildPlan`, no DB or accounts (ROADMAP M1).
- Zero cost: yes (free tiers; Stripe Payment Link only on a sale).
- Single proving test: `buildPlan` for DE+FR+ES totals the sum of per-country mins, and every row has an https source and ISO verified date. The real work is verifying the rules, not the code.
- Complexity: under 8 files, no new services.

## Risks
- Legal-advice liability; stale rows break trust.
- Conflicting vendor cost figures: show ranges only.
- Buyers may want it done for them.
- EU simplification or platform handling could end the need.
- Distribution: seller forums punish promotion.
- Free guides cover the generic part.

## Kill criteria
Drop it if after 14 days and about 200 targeted visitors there are fewer than 10 signups or pre-pay clicks (5%) and no one says they'd pay; if replies show sellers stop shipping to the EU or only want a representative; or if the EU adopts the suspension or a platform takes over registration.

## Next action
Post the honest question in two seller communities (r/EtsySellers, Etsy Community) before building more: ask which part they're stuck on and whether they'd pay for a plan.
