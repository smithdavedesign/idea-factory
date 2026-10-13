# Verdict: pass — score 4/10

**Summary:** Real mechanism, but there is no demand evidence at all, the buyer is an agency owner David has no network with, and the cure-vs-prevention problem that sank feedwarden and listvault is the same here. Little Warden already covers tag monitoring at GBP 25–150/mo.

## Q1 Demand Reality — 2/10
Evidence is secondhand and vendor-sourced: Leadferno's "4.8% of 225 contact forms broken" (RESEARCH.md; original report not located, and Leadferno sells lead-response software). PageCrawl's 19-day dropped-tag story is one anecdote. The 48% Consent Mode claim has no named study. Nobody has asked for this, paid for it or been upset about its absence. Interest is not demand, and here there isn't even interest. What would change my mind: 3 agencies who reply to a real audit of their own client with "how do I get this weekly", or one paid $500 audit.

## Q2 Status Quo — 5/10
The status quo is real and priced: Inflow GTM audits from $1,999, a freelancer at EUR 150–250/mo, Little Warden at GBP 59.99/mo, Trackingplan from $249/mo, and agencies' own maintenance retainers ($200–600/mo). So people do pay to cover this. But the cheapest credible competitor undercuts the $149/mo-per-site plan, and the "evidence packet" differentiator is unproven as something buyers want. Passive checks cannot prove a form is broken; the finding that matters (the test submission) is deferred to M5.

## Q3 Desperate Specificity — 3/10
The target is "owner or account lead at a 3–30 person agency". That is a category, not a person. The moment of pain is plausible (client asks why leads dropped), but no named person, and the research itself says David has no agency network and wants no sales calls. The goal "30 agencies get a sample report, 3 reply" is cold outreach, which is the sales work David rules out.

## Q4 Narrowest Wedge — 5/10
The $500 one-time audit is the right wedge, because it sells a cure for a breakage happening now. But the passive-only MVP can only show "suspect", not "broken", and that weakens the thing agencies would pay $500 for. The real wedge needs the opt-in test submission (M5), which comes last.

## Q5 (watch, don't ask)
Watch what an agency owner does with a sample report: do they forward it to the client unchanged, argue a finding is a false positive, or close it? Also whether they ask for a recurring version unprompted.

## Q6 Future-Fit — 4/10
Consent Mode and server-side tagging make tag checks harder and more complex, which helps specialists. But GA4/GTM checks are being absorbed by Google's own diagnostics, Little Warden and AI-driven QA agents, and a headless-Chromium checker has no moat.

## Premises
1. Agencies lose leads and ad spend to silent form and tag breakage. Plausible (anecdotes, one vendor study); frequency unmeasured.
2. A "happening now" audit overcomes the cure-vs-prevention problem. Unsupported; it is the open question in the PRD.
3. Passive checks are convincing enough to sell. Contradicted by the research's own risk list.
4. Agencies will pay above the Little Warden price for evidence reports. Unsupported.
5. David can reach agency buyers without sales calls. Contradicted by the research.

## Alternatives
- **A (minimal):** a free public "check your site" tool, one URL in, tag and form report out, no login. Effort S. It tests whether anyone cares and builds an audience; no revenue path yet.
- **B (ideal):** full monitoring SaaS with scheduled diffs, agency index and opt-in test submissions. Effort L, High risk, runs straight into Little Warden's price.
- **C (lateral):** fold the tag and form checks into an existing repo of David's (RepoHQ's site health or the AEM Page Tracker app) as a feature, instead of a new product.
- No close existing repo; listvault and feedwarden are the closest passed ideas and share the buyer and the cure-vs-prevention problem.

## Narrowest wedge
One URL in, one shareable HTML evidence report out, no signup, with the report's footer offering a human-checked $500 audit.

## M1 feasibility
- One weekend: yes. Node plus Playwright with fixtures is the M1 in ROADMAP.md.
- Zero cost: yes. GitHub Actions, Vercel Hobby and the Resend free tier.
- The test that proves M1: fixture with GA4 snippet but blocked collect request is flagged, and a fixture with a form asserts zero POSTs.
- Proving M1 proves only that the tool works, not that anyone wants it.

## Risks
- No demand evidence; every number is vendor or secondhand.
- Buyer needs outbound sales to reach; David has no network and avoids calls.
- Price pressure from Little Warden (GBP 59.99/mo for 650 URLs).
- Passive checks give false positives and cannot prove a broken form.
- Unsolicited audits of someone's client sites read as cold outreach and may annoy.
- Same cure-vs-prevention failure as two earlier passes.

## Kill criteria
Drop it if: a hand audit of 100 public agency-client sites finds actionable findings on under 10%; or false positives exceed 20% on 50 checked findings; or fewer than 3 of 30 agencies reply to a sample report; or no one pays the $500 audit within 30 days; or the only interested buyers expect Little Warden pricing.

## What would make this a validate
A named agency owner who asked for it, or a free-tool landing page showing real organic traffic and repeat use.
