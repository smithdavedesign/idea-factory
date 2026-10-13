# patchwell — research

## Summary
- Small web agencies that built 10–40 Next.js/React client sites are on the hook when a framework CVE lands (React2Shell, Dec 2025), but most of those sites have no maintenance engineer behind them.
- Agencies already resell maintenance as monthly "care plans" ($39–$99/site white-label for WordPress; $250–$500/mo for custom Next.js apps), so the budget and the habit exist. The framework-site (Next.js/React) version of the white-label care plan is thinly served by tooling; it is mostly hours-based labour.
- Wedge: a white-label, evidence-backed "patch PR + weekly report" service for agency-built Next.js/React/Vite sites only. Entry point is a free health report generated from a repo's lockfile, which doubles as the $0 demand test. Dependabot/Renovate are free and stay the inputs, not the competitor.

## Evidence of the problem
- **A framework CVE forces every agency to patch every client site fast.** React2Shell (CVE-2025-55182) is an unauthenticated remote-code-execution flaw in React Server Components, CVSS 10.0, exploited in the wild within days, and added to CISA's Known Exploited Vulnerabilities catalog. Fixes shipped as React 19.0.1/19.1.2/19.2.1 and Next.js 15.0.5 … 15.5.7 and 16.0.7. One source warns you cannot rely on your hosting provider and must patch at your end. Sources: https://www.coalitioninc.com/blog/security-labs/security-alert-critical-react2shell-vulnerability , https://invicti.com/blog/web-security/react2shell-critical-rce-in-react-rsc-next-js-cve-2025-55182-cve-2025-66478
- **Update bots do not close the loop.** Dependabot and Renovate open PRs, but neither is a vulnerability scanner for your current versions, updates that cannot auto-merge can silently rot in the backlog, and one write-up says Dependabot can fail silently. Auto-merging major updates is called an anti-pattern because breaking changes ship unreviewed. Sources: https://reintech.io/blog/dependabot-vs-renovate-vs-snyk-dependency-management-tools-compared , https://tessl.io/registry/testland/renovate-config
- **A practitioner checklist for what a real maintenance contract includes:** weekly audit, critical patches within 24 hours, non-critical updates rolled up monthly, dependency PRs gated by regression tests. That is exactly the work a gated agent loop could do. Source: https://www.perfectiongeeks.com/technologies/next-js/maintenance-cost
- Caveat: I found no forum thread of an agency owner saying "I can't keep up patching client Next.js sites". The evidence is the CVE event plus the existence of a priced service category. The demand test must supply the missing proof.

## Who pays
- **Buyer:** the owner or lead developer of a 2–15 person web agency or freelancer collective that ships Next.js/React sites for local-business or SaaS clients and has, say, 10–40 live sites. They pay out of the client retainer: they bill the client for a care plan and buy the work wholesale.
- **Price point to test:** $79–$149 per site per month for brochure/marketing sites, $249–$399 per site per month for custom apps with a database/auth. The seed's $200–$500/app range fits the custom-app tier.
- **Evidence people pay for this today:**
  - White-label WordPress care plans: The White Label Agency lists $99/mo for one site down to $39/site at its 50-site tier; WP Buffs white-label starts at $79/mo. Sources: https://thewhitelabelagency.com/wordpress-monthly-maintenance-plan , https://wpbuffs.com/plans/
  - Next.js maintenance priced by agencies: basic $200–$500/mo, standard $500–$1,500, advanced $2,500+; another agency lists hour-based plans of $250, $500 and $1,200/mo. Source: https://www.perfectiongeeks.com/technologies/next-js/maintenance-cost
  - A freelancer sells an ongoing app-support plan with dependency and security updates at $300/mo. Source: https://contra.com/s/q76RW7sr-ongoing-app-support-monthly-retainer
  - A 2026 cost guide puts a growing SME's monthly SaaS maintenance retainer at EUR 500–2,500. Source: https://kolonell.com/en/blog/annual-maintenance-cost-custom-saas-2026
- Note these are vendor price lists, not proof of volume. The WordPress white-label market is mature; the same white-label offer for Next.js/React is the gap this idea targets.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Dependabot (GitHub) | Free | Opens PRs only; one PR per update unless grouped; no verification report, no judgement on breaking changes; can fail silently |
| Renovate (Mend hosted app / self-host) | Free for the core tool; paid Mend plan adds AppSec | Powerful config but you must configure and review it; still no customer-facing report or fix for breakage |
| White-label WordPress care plans (The White Label Agency, WP Buffs, GoWP) | $39–$99/site/mo | WordPress only; not Next.js/React apps |
| Agency/freelancer Next.js maintenance retainers | $200–$500/mo basic; $250–$1,200 hour-based | Human hours, slow, expensive, usually bought directly by the end client not wholesale |
| GitHub Copilot coding agent | Usage-based AI credits since June 2026 (Pro $10, Business $19/user) | A tool the agency must drive per repo; no scheduled gate, no weekly client report |
| Pixeebot / Mobb (automated fix vendors) | Not verified: my search returned nothing on their pricing | Unknown; check before building |

Sources: https://makerstack.co/reviews/renovate-review/ , https://github.com/renovatebot/renovate/discussions/29598 , https://dailyaifixs.com/blog/github-copilot-pricing-2026-the-ai-credits-shift

## Technical notes
- Inputs: lockfile (package-lock.json / pnpm-lock.yaml) read through the GitHub API with a read-only token for the free report; the paid tier uses a GitHub App scoped to selected repos with contents:write and pull_requests:write.
- Vulnerability data: OSV.dev `POST /v1/querybatch` (docs state there are currently no limits on the API). Source: https://google.github.io/osv.dev/api/
- Verification gate: the customer's own CI (build + tests + typecheck) must pass before a PR is opened as ready; PRs are never auto-merged on the customer's repo unless they opt in for patch-level security fixes.
- Data handling (the seed's key question): the customer's code is confidential. Design so the model sees only diffs of manifest/lockfile and the build/test failure log by default, runs on a model under terms that exclude training and prompt logging (a paid API or Claude via the owner's plan only if its terms allow client work), and never runs free models on customer code. This blocks the "free models may log prompts" path from the seed.
- Permission risk: an App with write access across all repos is rated a high-severity finding by security scanners; selected-repository scoping with short-lived tokens is the lower-risk pattern. Source: https://astrix.security/?p=1216

## Risks & open questions
- Will an agency let an outside agent open PRs in client repos? Mitigation: PR-only, selected repos, fork-based mode where PRs come from a fork, free read-only report first.
- Liability if a patch breaks a client site. Mitigation: gated by customer CI, revert note in every PR, no merge by default, contract language limiting scope to dependency changes.
- Cost: AI inference on paid models for lockfile fixes. Most updates need no model; use the model only for breaking-change fixes. Margin unknown until measured.
- David has a day job and wants no sales calls: this is a service with support. The only sustainable shape is productised (fixed scope, async, self-serve onboarding). If that cannot be kept, Pass.
- Dependabot/Renovate plus a good prompt may be "good enough" for agencies with a technical owner. The buyer who does not have one is the target; they are harder to reach.
- No verified paid-competitor pricing for Pixeebot/Mobb; no direct forum evidence of the agency pain.

## Sources
- https://www.coalitioninc.com/blog/security-labs/security-alert-critical-react2shell-vulnerability
- https://invicti.com/blog/web-security/react2shell-critical-rce-in-react-rsc-next-js-cve-2025-55182-cve-2025-66478
- https://reintech.io/blog/dependabot-vs-renovate-vs-snyk-dependency-management-tools-compared
- https://tessl.io/registry/testland/renovate-config
- https://www.perfectiongeeks.com/technologies/next-js/maintenance-cost
- https://thewhitelabelagency.com/wordpress-monthly-maintenance-plan
- https://wpbuffs.com/plans/
- https://contra.com/s/q76RW7sr-ongoing-app-support-monthly-retainer
- https://kolonell.com/en/blog/annual-maintenance-cost-custom-saas-2026
- https://makerstack.co/reviews/renovate-review/
- https://github.com/renovatebot/renovate/discussions/29598
- https://dailyaifixs.com/blog/github-copilot-pricing-2026-the-ai-credits-shift
- https://google.github.io/osv.dev/api/
- https://astrix.security/?p=1216
