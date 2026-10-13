# patchwell — PRD

## Problem
Web agencies that build Next.js/React sites for clients are expected to keep them patched, but after launch nobody owns it. When a framework CVE like React2Shell (CVSS 10.0, exploited in the wild, on CISA's KEV list) lands, the agency has to find every affected site, upgrade, check nothing broke, and tell the client. Dependabot and Renovate open PRs but do not tell you which sites are exposed today, do not handle breaking upgrades, and produce no client-facing proof the work was done.

## Target user
The owner or lead developer of a 2–15 person web agency (or a freelancer collective) with 10–40 live Next.js/React/Vite client sites, who sells or wants to sell a monthly care plan and has no dedicated maintenance engineer. Secondary: small SaaS founders with one app and no spare engineer.

## Competitors & gap
Free update bots (Dependabot, Renovate) are inputs. White-label care plans exist at $39–$99/site/mo, but for WordPress. Next.js maintenance is sold as human hours at $200–$1,200/mo. The gap: a fixed-scope, white-label, framework-specific service (Next.js/React only) that turns a lockfile into a verified patch PR and a weekly report an agency can forward to its client. See RESEARCH.md.

## MVP scope
- Free health report: paste a GitHub repo URL (public) or upload a lockfile; get outdated packages, known vulnerabilities (OSV.dev), and Next.js/React versions that fall in known critical CVE ranges, with the recommended patched version.
- Portfolio view: one page per agency listing all their sites sorted by exposure.
- Weekly report email per agency, white-label, one section per site with "patched / needs attention / healthy".
- Patch PR (paid tier): GitHub App on selected repos opens a grouped security/patch PR, only after the repo's CI passes on the branch.
- Breaking-change assist: when CI fails after an upgrade, attempt one model-assisted fix and attach the build log; otherwise label the PR "needs human".
- Client-ready receipt: a shareable page per fix (CVE, versions before/after, CI result) to attach to the agency's client email.
- Emergency alert: when a new critical advisory matches a connected site, email the agency within 1 hour.

## Non-goals
- No WordPress, PHP, Rails or mobile apps.
- No auto-merge on customer repos in v1.
- No hosting, backups, uptime monitoring or content edits.
- No running customer code on free models or any model whose terms permit prompt logging or training.
- No feature work or custom development for clients.

## Success metrics
- Free report: 100 reports generated and 10 agencies leave an email within 3 weeks of posting (a free tool alone would be a pass, so the signal is email capture).
- Demand: 3 agencies agree to a paid pilot at $99+/site/month, or 2 pre-pay, within 6 weeks.
- Quality: at least 80% of security patch PRs pass the customer's CI on the first attempt in the pilot.
- Time: median time from a new critical advisory to an open PR is under 24 hours.
- Margin: model cost per site under 15% of the monthly price.

## Open questions
- Will agencies grant write access to client repos, or only ever use fork-based PRs?
- Which model terms are acceptable for client code, and what does it cost per fix?
- Is a product with ongoing human support compatible with a day job and no sales calls?
- Do Pixeebot, Mobb or Copilot already cover this for agencies at a lower price? (not verified)
- Does the agency buyer exist in the size assumed, and how to reach them without calls?
