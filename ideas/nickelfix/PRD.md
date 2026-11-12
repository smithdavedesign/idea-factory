# nickelfix — PRD

## Problem
A Chrome extension developer gets a Chrome Web Store rejection email naming a policy and a colour-and-metal code (e.g. Red Nickel), with little detail on what in the code or listing triggered it. Each re-review takes days to weeks (https://groups.google.com/a/chromium.org/g/chromium-extensions/c/VJ6DcpEn51Y), and forum threads show repeated rejections and apparent false flags (https://groups.google.com/a/chromium.org/g/chromium-extensions/c/QVrNR320T3o). Their launch or client delivery is blocked until it clears.

## Target user
Solo extension developers, small studios, and freelancers/agencies who ship extensions for clients, at the moment a rejection email lands. Agencies are the primary payer since a blocked client delivery costs more than $9.

## Competitors & gap
Pre-submission scanners (CWS Submission Copilot, ExtGuard) and generic open-source checks exist and are mostly free. Fiverr freelancers fix rejections for about $10/hr to $50 per gig. Gap: nothing starts from the actual rejection email and returns a specific cause, fix list and appeal text in minutes. See RESEARCH.md.

## MVP scope
- Paste the rejection email text; parse the violation code and policy named.
- Upload the extension zip (processed in memory, deleted after the session) or paste manifest.json only.
- Deterministic checks: permissions declared vs. used, remote-code/eval patterns, MV3 service-worker rules, missing privacy policy or single-purpose statement.
- Findings report ranked by likelihood, each citing the Chrome Web Store policy page.
- Draft listing "permission justification" text and a reviewer-notes block with test credentials placeholders.
- Draft appeal message tailored to the rejection code.
- Paywall: first report shows the diagnosis summary free; fix list and drafts unlock for $9 per case.

## Non-goals
- No promise or guarantee of approval.
- No automatic submission to the Chrome Web Store.
- No Firefox/Edge/Safari support in v1.
- No ongoing monitoring or accounts beyond an email receipt link.

## Success metrics
- 30 paste-and-diagnose runs from 300 visitors in the first 4 weeks (10% activation).
- At least 3 paid $9 unlocks in 4 weeks, which would be first evidence of willingness to pay.
- On a set of 10 real public rejection threads, the top-3 findings include the cause the thread later confirmed in at least 6.
- Median report time under 60 seconds.

## Open questions
- Do developers pay $9 when free scanners exist, or only agencies?
- Can the rule set stay current with Google policy changes at low effort?
- Will developers upload source, or is manifest-only enough to be useful?
- How often does a rejection come from something static analysis can see?
