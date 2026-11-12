**Verdict: pass. Score 4/10.** A real pain moment, but a thin niche, a one-off $9 sale, and a free substitute (paste the email into any chatbot) that the research never rules out.

## Six forcing questions

### Q1 Demand reality: 4/10
Evidence is forum anecdote plus Fiverr listings (RESEARCH.md "Evidence of the problem", "Who pays"). Five 2026 chromium-extensions threads show confusing rejections, and Google DevRel acknowledged review delays. That proves pain, not payment. The Fiverr gigs are seller-advertised, with no sales counts, and RESEARCH.md admits willingness to pay is "inferred, not proven". Nobody has said "I'd pay $9". Interest is not demand. Stronger evidence would be: a Fiverr gig with dozens of reviews, or a developer in one of those threads replying "yes, send it" to a manual diagnosis offer.

### Q2 Status quo: 5/10
Developers guess, ask the Google Group, or hire Fiverr at about $10/hour to $50 a gig. That is a real, priced workaround. But the unmentioned free workaround is the strongest competitor: paste the rejection email and manifest into Claude or ChatGPT and ask for the likely cause and an appeal draft. Most extension developers already have this habit. The paid $9 tool has to beat "free, and I already have it open". Free scanners (CWS Submission Copilot, ExtGuard, an open-source review skill) cover the static-check half.

### Q3 Desperate specificity: 3/10
"Solo extension developers, small studios and agencies" is a category. There is no named person. The PRD says agencies are the primary payer, yet the research found no agency evidence at all. It only found forum posters, who are the people most used to free tools (RESEARCH.md "Weak spot"). The consequence ("launch blocked") is plausible but unquantified.

### Q4 Narrowest wedge: 5/10
The M1 wedge (rejection email plus manifest in, ranked findings out) can be built in a weekend. But the free diagnosis is manifest-only static analysis, and the PRD itself asks "how often does a rejection come from something static analysis can see?". Many cited cases are wrong flags, an impossible moderation request, or policy ambiguity, none of which a manifest linter fixes. The part with real value (appeal draft, justification text) is the part that an LLM chat already does, and it is gated behind M2 and M3.

### Q5 Observation (not answerable pre-product)
See "What M1 users should be watched doing" below.

### Q6 Future-fit: 4/10
Policy churn means a maintained rule list, which is ongoing overhead for a one-off $9 product. Improving general-purpose LLMs make "paste the email and get the cause" cheaper to do for free. The one thing that gets better with time is the corpus of real rejection cases, but nothing in the plan captures it.

## Premises
1. Rejected developers will pay for a diagnosis even though free chatbots and scanners exist. Not supported: no sales data.
2. Static analysis of the manifest or zip finds the cause often enough to be worth $9. Unsupported, and the PRD lists it as open.
3. Agencies are the payers. Unsupported: the research found no agency evidence.
4. Rejection emails are vague enough that developers can't self-diagnose. Partly supported by the threads, but the sample is selected (people who posted).
5. Distribution via search ("reach:search") works. Plausible: queries like "Red Nickel rejection" have clear intent, but volume is unmeasured.

## Alternatives
- **Minimal: one static SEO page set.** A page per violation code (Red Nickel, Yellow Nickel, Grey Lithium and so on) with causes, fixes and appeal templates, with no app. It tests search demand at $0 and builds the content asset the tool would need anyway. Effort S, risk low.
- **Concierge test.** Offer manual diagnosis in the chromium-extensions threads for $9 and see who replies. Proves payment before any code. Effort S, risk low, but it is David's time.
- **Ideal: full diagnose, drafts and paywall (M1–M3).** Matches the PRD. Effort M-L, with the rule-maintenance burden.
- **Extend an existing repo.** Context search shows nothing relevant. The nearest ideas (dawnlog, pr-receipt) are for a different audience, and nothing reusable exists.

## Narrowest wedge worth testing
The per-code SEO pages plus a paste box, with the free diagnosis as the hook and a "send me your case, $9" button. Skip the zip scan, the LLM and Stripe until someone pays.

## M1 feasibility
- One person in a weekend: yes. A TypeScript rule engine over a pasted manifest is small.
- Near-zero cost: yes. Next.js on Vercel or Cloudflare, no paid APIs, deterministic rules only.
- The one test that proves M1: given a manifest with `tabs`, `history` and `cookies` plus a "Use of Permissions" email, the report flags all three and links the policy.
- Caveat: passing that test proves the code works, not that anyone wants it.

## Risks
- Free chatbots substitute for the whole product.
- A small niche with a one-off purchase and no repeat.
- Static checks may miss most real causes, which makes the report feel generic.
- Over-promising approval would burn trust, and policy staleness costs maintenance.
- Developers are reluctant to upload source and expect free tools.
- Confidence is Low in idea.json, and the score reflects that.

## Kill criteria
Drop it if any of these holds:
- 50+ targeted visitors produce fewer than 5 signups or runs;
- no one pays $9 for a manually delivered diagnosis within 4 weeks;
- on 10 real public rejection threads, a manifest scan finds the confirmed cause in fewer than 4;
- a free chatbot prompt gets the same diagnosis on those 10 threads.

## What M1 users should be watched doing
- Do they paste the real email or just try the tool with a sample?
- Do they read the findings, or go straight to look for the appeal text?
- Do they upload the manifest at all, or abandon at that step?
- Do they open another tab (a chatbot) before or after the report?
- Do they hit the $9 gate and leave?

## Assignment
Before building anything, reply to two or three open chromium-extensions rejection threads offering a free manual diagnosis, then see whether anyone would pay $9 for the same thing.
