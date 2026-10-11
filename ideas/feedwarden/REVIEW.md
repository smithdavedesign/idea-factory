# Verdict: PASS — score 4/10

One sentence: it is a cheap-to-build checker for a problem whose triggers nobody can name, sold as prevention to buyers who the research says buy cure, in a space with three cheap incumbents.

## Six forcing questions

### Q1 Demand Reality — 3/10
Evidence is one Shopify Community thread (posted Jan 2026, replies through Aug) where a merchant is suspended and replies disagree on the cause. That is evidence of pain after a suspension. It is not evidence anyone wants a daily watch. RESEARCH.md says so itself: "no forum post where a merchant says they pay monthly for prevention." The vendor stats (11.7M suspensions, $500–$5,000/day) are unsourced vendor claims, and the Search Engine Land source was never read. Nobody has paid, asked for it or been upset by its absence. Evidence that would change my mind: 5+ merchants in r/shopify or the Community forum saying they would pay for monitoring before a suspension, or a competitor's reviews praising its alerts.

### Q2 Status Quo — 4/10
Real workarounds exist: Fiverr fixers at $50–$400 a case, agencies at a claimed $300–$950, GMC.APPS at $9–$99/mo, AdNabu alerts bundled with feed tools. That shows people pay after a suspension. It also means the status quo is a one-off cure that is cheap to buy when needed, and it weakens the case for a $15/mo subscription. Merchants have no monthly workaround for prevention, because the problem is rare for any single store. Most stores will go years without a suspension, so a subscriber pays $180/yr for an event that probably never happens (insurance-style demand, which is hard to sell).

### Q3 Desperate Specificity — 3/10
The named person is "an owner-operator of a Shopify store with $5k+/month revenue, or a freelancer managing 3–10 stores". That is a filter, not a person. The painful moment, finding every product "Not Approved", is vivid, but the buyer at that moment wants a fix, not a monitor. The agency angle (one buyer, many stores) is the best specific hypothesis, but no agency has been identified. David has no Shopify network (RESEARCH.md risk section).

### Q4 Narrowest Wedge — 5/10
The wedge is small and buildable: a pure `checkStore` function plus diff, with a CLI. A free "scan my store" page is the narrower variant and doubles as lead capture. But the wedge's value depends on the checks being right. Google's triggers are not public, and the commenter in the thread says the problem is "an account-level trust issue, not a product-data issue". Checks that pages exist and Googlebot is not blocked will catch the obvious cases (bot blocker, deleted returns page) and will miss the rest. A tool that says "all green" and then the account is suspended is a liability. Cheap but weak.

### Q5 Observation (pre-product)
Watch M1 users paste their store URL into the scan: which checks they act on, whether they ask "will this stop a suspension?", whether they come back the next day, and whether they hand over a second store (agency signal). Watch for the moment they ask for Merchant Center account status, which means the public-page checks are not enough.

### Q6 Future-Fit — 4/10
Google's enforcement is likely to remain opaque and automated, so the pain persists. But the account-level data (Content API) is where the real signal lives, and Google or Shopify's own Google & YouTube app can add "store issues" alerts at any time. GMC.APPS already advertises monitoring. Public-page checks are a feature that platform owners and incumbents absorb. No moat.

## Premises
1. Merchants will pay for prevention, not only cure. Not supported: the research flags this as unproven, and the evidence of spending is all post-suspension.
2. Public storefront signals predict Misrepresentation suspensions. Weakly supported: forum and vendor lists only; one reply says it is account-level trust. The Search Engine Land bot-blocker case does support one narrow check.
3. $15/mo flat per store is the right price. Unsupported; the cheapest comparable is GMC.APPS at $9, and the cure-after tools are cheaper per event.
4. David can reach Shopify merchants without a network. Plausible through Reddit and the Shopify Community, but cold, and those forums are hostile to self-promotion.

## Alternatives
- **Minimal viable: free "GMC trust check" web page.** Paste a URL, get the checks. No accounts, no email. Effort S. Tests whether anyone cares and collects URLs plus emails. Reuses nothing from David's repos.
- **Ideal architecture: Content API watch (M4 first).** Read account status and issues directly, alert on new account-level issues. Real signal and a real moat, but needs Google OAuth verification (weeks) and is not weekend-sized or provably $0 in time.
- **Lateral: agency-only report.** Sell a one-off "pre-flight audit" at $29 to freelancers and agencies, who each run several stores, before moving to a subscription. Tests willingness to pay with no recurring build.
- **Extend an existing repo:** none in David's portfolio overlaps (context search returned only permitly, an STR tracker with a different audience, whose "page change diff" idea is the same technique and could share a diff library).

Recommendation: if David ever tests this, use the free scan page; do not build accounts and billing first.

## Narrowest wedge (scope reduction)
A single free scan page that runs the 5 public checks against a Shopify URL and shows pass/fail with plain-English reasons, with an optional "email me if this changes" box. Everything else (accounts, Stripe, agency plan) is deferred.

## M1 feasibility
- Weekend build: yes. Pure function, cheerio, fixtures, CLI. ROADMAP M1 is well scoped with testable exit criteria.
- $0: yes. Vercel Hobby, Turso/SQLite free, Resend free, cron on GitHub Actions. No LLM.
- One test that proves M1: `diffSnapshots(compliant, broken)` returns exactly `returns-policy` and `contact-details`. That proves the code works, not that the checks predict suspensions. No M1 test can prove the second.
- Complexity is low (under 8 files for M1). The real gap is not engineering, it is validity of the checks and distribution.

## Risks
- Prevention demand is unproven; buyers may only pay after a suspension, when a $9–$29 one-off tool wins.
- Checks are guesses; false comfort after an "all green" is a trust and possibly legal problem.
- At least three cheap incumbents, and GMC.APPS already claims ongoing monitoring.
- Shopify or Google can ship the same alerts natively.
- Distribution: no network, communities punish promotion, and the buyer is only reachable at the moment of crisis (search intent for "merchant center suspended"), which is a cure query.
- Low confidence is recorded in idea.json; several key sources are vendor marketing or unfetched.

## Kill criteria (if this were ever tested)
- Fewer than 50 qualified Shopify visitors, or under 5% signups with a store URL in 14 days.
- Fewer than 3 of 10 merchants/agencies say they would pay $15/mo for prevention when asked directly.
- A competitor ships continuous monitoring, or Shopify's Google app adds suspension alerts.
- No evidence from real suspensions that the public checks would have flagged them (test against 10 reported cases).

## Assignment
Before building anything: read 20 threads of suspended merchants and tally how many causes a public-page check would have caught. If it is under half, drop it.
