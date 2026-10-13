# Verdict: PASS — score 4/10

The M1 is a weekend, $0 build, but it copies free tools and the paid product is a supported, liability-carrying service sold to a buyer David can't reach without calls.

## Forcing questions
**Q1 Demand (3/10).** RESEARCH.md admits it found no agency owner voicing the pain. Evidence is the React2Shell CVE (coalitioninc, invicti) and vendor price lists (WP Buffs, White Label Agency, perfectiongeeks). Price lists show a category, not pull. Nobody has asked, paid or complained. Stronger evidence: an agency replying "I'd pay $99/site for this", or pre-paying a pilot.

**Q2 Status quo (5/10).** Agencies use Dependabot/Renovate (free), npm audit, GitHub alerts, or human retainers at $200–$1,200/mo. The workaround exists and costs money, but free tools already cover exposure and PRs. The unserved slice is breaking-upgrade judgement and a client-facing report.

**Q3 Desperate specificity (3/10).** "Owner of a 2–15 person agency with 10–40 Next.js sites" is a filter, not a person. No named agency or consequence. Agencies with that many sites and no technical owner are rare and hard to find.

**Q4 Narrowest wedge (5/10).** A free lockfile report is shippable in a weekend, but `npm audit` / osv-scanner give the same list, so it won't draw a distinct audience. The paid wedge (CI-gated patch PR) needs write access to client repos.

**Q6 Future-fit (4/10).** GitHub (Dependabot, Copilot agent) is moving into this slot and can bundle it free. More agent-built sites means more unmaintained repos, but the platform owner captures that.

**Q5 (observation).** Watch M1 users: do they run it once and leave, paste a client lockfile or their own, forward the report to a client, or click the "weekly watch" waitlist? Forwarding the report is the signal that matters.

## Premises
1. Agencies feel enough pain to pay $79–$399/site/mo — unsupported.
2. Dependabot/Renovate aren't good enough for the buyer — partly; fine for any agency with one technical person.
3. Agencies will grant write access to client repos — unsupported; the research rates broad scope high-severity.
4. A fixed-scope service fits a day job with no sales calls — unsupported; CVE emergencies, breakage and liability produce support work.
5. A free report is a demand signal — weak; emails measure curiosity.

## Alternatives
- **Minimal viable:** static exposure checker. Effort S, risk low; no moat.
- **Extend RepoHQ:** package its fix-and-verify loop as a GitHub Action for outside repos. Effort M; reuses working code, but the audience is developers, not agencies.
- **Lateral:** manual fixed-price "Next.js CVE audit + patch PR" offered to 10 agencies. Fastest signal, needs outreach.
- **Ideal architecture:** GitHub App, portfolio, white-label reports, gated model fixes. Effort XL, high liability.

Recommendation: none worth the demand test; if anything, the lateral manual offer, which breaks the no-calls rule.

## Narrowest wedge
Free no-login lockfile exposure report with a forwardable white-label HTML page, plus a waitlist for weekly monitoring.

## M1 feasibility
- One person, a weekend: yes. TypeScript, lockfile parser, OSV.dev querybatch (free, no key), Next.js on Vercel Hobby, Vitest fixtures.
- Zero cost: yes for M1. M4 model-assisted fixes on client code can't use free models, so the $0 rule breaks later.
- Single proof test: `next@15.5.6` fixture returns a critical finding recommending `15.5.7` with a mocked OSV call.
- Caveat: passing that test proves the parser works, not that anyone wants it.

## Risks
- Free tools already answer the M1 question.
- Liability for patches that break client sites; write access to client repos.
- Support burden and 24h emergency SLA vs day job.
- Buyer reachable only through outreach.
- Platform risk from GitHub/Copilot.
- Model cost margin unknown.

## Kill criteria
Drop it if within 14 days fewer than 10 agency emails are captured or fewer than 3 people ask for monitoring/patching beyond the one-off report, or if no agency says they'd pay $99+/site/month, or if the interest is only from individual developers.

## Overlap with David's work
RepoHQ's factory runs a similar fix-and-verify loop on his own repos, which lowers build cost, but pr-receipt, dawnlog and pr-split are developer tools, not agency services; no founder-fit signal for agency sales in his interests (Webflow and design bookmarks are the nearest).
