# nickelfix — research

## Summary
- Chrome extension developers whose submission is rejected (Chrome Web Store "Red/Yellow/Grey" violation codes) get a short email naming a policy, then wait days to weeks for each re-review; many threads show the cause is unclear or the flag looks wrong.
- Today they either guess, post on the chromium-extensions Google Group, or pay a Fiverr freelancer roughly $10/hour to "up to $50" per gig to fix and resubmit.
- nickelfix is a post-rejection tool: paste the rejection email plus the extension zip, get the likely cause mapped to the policy, a concrete fix list/diff, listing/justification text and an appeal draft, for a one-off price below the freelancer route. Pre-submission scanners exist (CWS Submission Copilot, ExtGuard), so the wedge is the rejected, high-intent moment, not scanning.

## Evidence of the problem
- 2026 threads on the official chromium-extensions group describe confusing rejections: a "heavily used extension keeps being rejected" (https://groups.google.com/a/chromium.org/g/chromium-extensions/c/-CR1xuqUQ_o); repeated "Yellow Nickel" rejection (https://groups.google.com/a/chromium.org/g/chromium-extensions/c/QVrNR320T3o); MV3 polyfill import rejected (https://groups.google.com/a/chromium.org/g/chromium-extensions/c/lGT0HRLg3Z0); wrongful "Grey Lithium" rejection (https://groups.google.com/a/chromium.org/g/chromium-extensions/c/nx3eqhOq150); a case where moderation asks for a new version that is technically impossible (https://groups.google.com/a/chromium.org/g/chromium-extensions/c/SGJNOGKvi7k).
- Review delays: Google's DevRel acknowledged a surge of submissions lengthening waits (https://groups.google.com/a/chromium.org/g/chromium-extensions/c/VJ6DcpEn51Y); a third-party guide on actual review time in 2026 is at https://extensionbooster.net/blog/chrome-web-store-extension-review-time-2026-how-long-guide/. Google's docs say review times fluctuate and can be longer after a rejection (https://developer.chrome.com/docs/webstore/review-process). Each wrong guess therefore costs days.
- Write-ups from developers: "Google rejected my chrome extension 3 times" (https://hackernoon.com/google-rejected-my-chrome-extension-3-times) and an audit of 18 extensions for Red Nickel (https://dev.to/ktg0215/how-to-avoid-chrome-web-store-red-nickel-rejection-what-i-found-after-auditing-18-extensions-gbg).
- Caveat: this is forum anecdote, not prevalence data. I found no official rejection rate.

## Who pays
- Buyer: solo extension developers, small studios and freelancers/agencies shipping extensions for clients, who have a launch or client deadline blocked by the rejection.
- Price point to test: $9 per rejection case (or $19 for three re-tries on one extension). The anchor is the paid workaround below.
- Evidence they pay today: Fiverr has many gigs selling exactly this, e.g. "I will fix your rejected chrome extension" (https://www.fiverr.com/sserpolar/fix-your-rejected-chrome-extension), "fix manifest v3 chrome extension rejection" (https://fiverr.com/iftakhar901/fix-manifest-v3-chrome-extension-rejection), and a fix-and-publish gig (https://www.fiverr.com/dev_shehzad/fix-and-publish-chrome-extension-manifest-v3-api-and-permission-errors). Listed prices run from about $10/hour to "up to $50" per gig (seller-advertised, unverified). I did not find how many sales these gigs make, so willingness to pay is inferred, not proven.
- Weak spot: developers expect free tools. Agencies and client-work freelancers are the better payers.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| CWS Submission Copilot (Chrome extension, local scan) https://chromewebstore.google.com/detail/cws-submission-copilot/bipgdjideeiobpfcnpdilolhnolefacg | not stated in listing | Pre-submission readiness only; says a pass is not a guarantee; does not read the actual rejection email |
| ExtGuard https://peerlist.io/gk_9753/project/extguard | free tier plus paid plans (prices not found) | Static analysis for likely violations; not tied to the specific rejection |
| Extension Auditor https://extensionauditor.com/ | not verified | Audit focus |
| Apify Chrome Extension Security Analyzer https://apify.com/nexgendata/chrome-extension-security-analyzer | listed $0.20/extension (page also says $250 per 1,000; inconsistent) | Permission/security audit, only for already-published CRX |
| Open-source extension-review skill https://skills.sh/quangpl/browser-extension-skills/extension-review | free | Generic scan, no appeal or listing text |
| Fiverr freelancers (links above) | ~$10/hr to up to $50 | Slow, needs source access and trust, no guarantee |
| Chromium-extensions Google Group | free | Slow, public, no guaranteed answer |

## Technical notes
- Input: rejection email text (violation code such as "Red Nickel", "Yellow Nickel", "Grey Lithium" plus the policy named) and the unzipped extension. Run locally in the browser or on the server; delete uploads after the session.
- Deterministic checks first (manifest permissions vs. code usage, remote code/eval patterns, MV3 service-worker rules, missing privacy policy URL or single-purpose description, test-credential note). An LLM then explains findings and drafts the appeal text; every finding must cite the policy page (https://developer.chrome.com/docs/webstore/program-policies/best-practices).
- Google's guidance: non-egregious violations are rejected and the live listing stays up; the email states the policy and how to appeal (https://developer.chrome.com/docs/webstore/review-process). Reviewer notes lacking test credentials can cause a "non-functional" rejection (https://www.stefanvd.net/blog/?p=2224).
- Free-tier LLMs or a local model can handle drafting at near-zero cost.

## Risks & open questions
- Pre-submission scanners are free and plentiful; if developers just run those first, post-rejection demand shrinks.
- No tool can promise approval; Google reviews are partly opaque and sometimes wrong. Over-promising would hurt trust.
- Willingness to pay is inferred from Fiverr gigs, with no sales numbers.
- Policy changes can make the rule set stale; needs a maintained rule list.
- Developers may be reluctant to upload source. A local-only scan option is needed.
- Small market: extension developers are a niche, and the sale is one-off per rejection.

## Sources
- https://developer.chrome.com/docs/webstore/review-process
- https://groups.google.com/a/chromium.org/g/chromium-extensions/c/-CR1xuqUQ_o
- https://groups.google.com/a/chromium.org/g/chromium-extensions/c/QVrNR320T3o
- https://groups.google.com/a/chromium.org/g/chromium-extensions/c/VJ6DcpEn51Y
- https://hackernoon.com/google-rejected-my-chrome-extension-3-times
- https://dev.to/ktg0215/how-to-avoid-chrome-web-store-red-nickel-rejection-what-i-found-after-auditing-18-extensions-gbg
- https://www.fiverr.com/sserpolar/fix-your-rejected-chrome-extension
- https://fiverr.com/iftakhar901/fix-manifest-v3-chrome-extension-rejection
- https://chromewebstore.google.com/detail/cws-submission-copilot/bipgdjideeiobpfcnpdilolhnolefacg
- https://peerlist.io/gk_9753/project/extguard
- https://extensionbooster.net/blog/chrome-web-store-extension-review-time-2026-how-long-guide/
