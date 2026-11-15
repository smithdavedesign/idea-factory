# Verdict: PASS — score 5/10 (policy minScore 6)

A real, dated rule change with visible rejection pain, but nobody has been found asking for or paying for a standalone checker. The buyer already has a broker who is paid to fix the certificate, and a one-time $19 caps the upside.

## The Six Forcing Questions (pre-product: Q1–Q3 weighted, plus Q4 and Q6)

### Q1 Demand Reality — 4/10
Evidence is of a *problem*, not of *demand*. Amazon's rule took effect 2 Nov 2026 with no sales threshold, and Amazon's own notice had 4,800 views and 52 replies (ppc.land). Two Seller Forum threads show repeated rejections: 555 views/15 replies, and a seller renewing the same certificate and being rejected. Amazon staff listed nine requirements. That proves the pain exists. It does not show anyone looking for a checker, paying for one, or having tried to build a workaround. RESEARCH.md says so itself: "I found no one currently charging for a standalone COI checker, and no one asking for one." The forum rejections are 2–3 years old, so the quiet problem has not produced a market in that time. The new rule widens the affected group. This is interest plus a surge, not demand. Stronger evidence would be a seller pasting a rejected certificate into a DM and asking "what's wrong with this?", or a paid request on a freelancer board.

### Q2 Status Quo — 5/10
The status quo is the broker. Assureful, Next and Marsh/Amazon Insurance Accelerator bundle certificate help into the policy, and the policy is the real cost ($26–$200/month). A seller who is rejected emails the broker, who reissues the certificate. That costs a few days against a deadline (reported 45 days, unconfirmed), not dollars. The free fallbacks are Amazon's criteria page and the forum. The checker saves a rejection loop, but the broker is paid to do the same job and is the person the seller blames. Position: most sellers will email the broker first. What would change it: sellers reporting 2+ rejection loops on certificates from generic brokers.

### Q3 Desperate Specificity — 5/10
The buyer is describable: a solo or 2-person seller with an enhanced-safety listing (supplements, kids' products, batteries, cosmetics) who holds a certificate and faces a deactivation date. The consequence is concrete, since listings go dark. But there is no named person, only forum handles. Secondary buyers (consultants, prep centers) are speculative. The 11-category list is not public in full, so the size of the group is unknown. The moment is sharp (the day the PDF arrives or is rejected), but the window is only weeks and shrinks as sellers comply.

### Q4 Narrowest Wedge — 6/10
Good wedge in principle: upload a PDF, get pass/fail per criterion for free, pay $19 for the broker fix email. It is small and shippable in days. The weakness is the price. $19 one-time with the pass/fail summary free means the paid part is a paragraph of text the seller could write after reading the fail reasons. The "no setup" version, a free static checklist of the nine known criteria with the exact broker wording, is the real narrowest test and tells you whether anyone cares.

### Q5 Observation (not answerable pre-product)
M1 users should be watched on: (a) whether they upload a real certificate or only paste text, which shows how much they trust the tool with a policy number; (b) whether they accept a "can't tell" result or go to the broker; (c) whether they know their exact Seller Central legal name; (d) whether they stop at the free summary and write the broker email themselves.

### Q6 Future-Fit — 3/10
This gets less essential. The rule is new and brokers will quickly standardise on Amazon-compliant certificate templates, as the specialist brokers already do. Once sellers hold a good certificate, they need a check once a year. Amazon can soften or reword the 13 criteria, which are behind Seller Central sign-in and must be maintained by hand. The renewal reminder is the only recurring hook and is weak at $39/year. A one-time surge tool is fine for a no-cost test, but it is not a business.

## Premises
1. Sellers are being rejected for wording errors a checker could catch — supported by forum threads (old, but real and consistent).
2. Sellers will pay a third party instead of asking the broker — **not supported.** No evidence.
3. The rule list can be kept current without Seller Central access — weakly supported; nine criteria are public via Amazon staff replies, the other four are not.
4. Enough small sellers are affected to reach 50 visitors and 5 signups — plausible given 4,800 views on Amazon's notice, but reaching them is hard (Seller Forums and many Facebook groups restrict self-promotion).
5. An LLM on a free model can extract ACORD 25 fields at 90%+ — plausible for text PDFs, unverified. The data (business name, policy number) is low-sensitivity.

## Alternatives
- **A. Minimal: free static checklist page** (S effort, low risk). Nine criteria with exact wording and a copy-paste broker email, email capture for updates. Tests reach and interest for a day of work. Reuses nothing but a Next.js template.
- **B. Extend `covercheck`** (M, medium). David's covercheck (HOA vendor certificates, score 57.69) already needs the same extraction engine. Adding an "Amazon ruleset" there avoids a second repo and gives the engine two buyers. This is the better long-term home; ideally covercheck would be validated first.
- **C. Ideal: standalone checker with consultant packs and reminders** (L, high). Best long-term shape, but it builds the platform before any demand signal.
- **D. Lateral: lead-gen for brokers.** Free checker, then refer failing sellers to a specialist broker for a commission. Likely the larger revenue, but the PRD excludes affiliate commission in v1 and it moves into insurance sales (regulatory exposure).

Recommendation: B, or A as a throwaway test. Do not build C.

## Narrowest wedge worth testing
A single-page free checker (nine public criteria, rule-based on pasted text, no LLM) with a copy-paste fix email, plus an email box for "tell me when the other four criteria are added". Measure how many visitors paste a real certificate.

## M1 feasibility (eng review)
- One person, one weekend: **yes.** Deterministic rules and fixtures are simple. PDF text extraction plus an LLM extraction is the only fuzzy part. Fewer than 8 files.
- Near-zero cost: **yes.** Vercel/Cloudflare free, Neon free, free-model extraction via LiteLLM, Vitest with one worker. Stripe and Resend are deferred to M2/M3 (Stripe has no fixed fee).
- One test proving M1: the fixture suite, specifically a certificate listing Amazon as certificate holder only returning `fail` on additional insured, and the all-compliant fixture returning zero fails.
- Concern: extraction with a free local model on real-world PDFs may fall short of 90%, and a wrong "pass" is worse than no tool.

## Risks
- Willingness to pay for the check alone is unproven; the broker is the default fix.
- The window is short: the 45-day deadline lands mid-December, so a two-week test plus a build may arrive after most sellers have already sorted it.
- Rule drift: the 13 criteria are behind sign-in; four are unconfirmed.
- Reach: seller communities restrict self-promotion; the Seller Forums are Amazon-moderated.
- A false pass is a prediction, not Amazon acceptance. Insurance and legal-advice liability.
- Low revenue ceiling: $19 once, and ~50 paid checks is about $950.
- Overlap with covercheck and several other Etsy/ecommerce-compliance ideas already in the portfolio; yet another one-time compliance checker spreads thin.

## Kill criteria
Drop it if, in a 14-day test: fewer than 50 visitors, or fewer than 5 real uploads or signups; or no seller in the channels reports being rejected after a broker-issued certificate; or Amazon softens the rule or brokers' default certificates already pass.

## Assignment
Before building anything, search r/FulfillmentByAmazon and the Seller Forums for posts since 2 Nov asking "why was my COI rejected", and see how many sellers say the broker could not fix it. If you find 10 such posts, reconsider as an add-on to covercheck.
