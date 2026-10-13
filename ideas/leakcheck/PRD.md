# leakcheck — PRD

## Problem
Agencies run forms, booking flows, checkouts and GA4/GTM tracking for many clients. These break silently after deploys, plugin updates and consent changes, and an uptime monitor says everything is fine. A vendor study found about 5% of small-business contact forms broken, and a tag drop after a deploy went unnoticed for 19 days in one documented case. The agency finds out when the client complains about leads or ad spend.

## Target user
Owner or account lead at a 3-30 person digital agency managing paid media, SEO or websites for 5-50 small-business clients. Moment of pain: a client asks why leads dropped and the answer is a form or conversion tag that broke weeks ago. Later: small e-commerce and B2B owners directly.

## Competitors & gap
Little Warden (GBP 25-150/mo) checks tags and content but not forms and gives no evidence packet. ObservePoint ($599+/mo) and Trackingplan ($249+/mo) are heavy. Ghost Inspector ($125+/mo) needs recorded tests. Consultants charge $1,999 audits. Gap: a per-client revenue-path report with captured evidence (screenshot, console error, failing request, missing tag) that an agency can forward unchanged, starting from a $500 one-time audit.

## MVP scope
- Input a URL list; render each with headless Chromium and detect GTM/GA4/Meta/Ads tags and whether their collect requests fired
- Detect forms: action, fields, CAPTCHA presence, JS/console errors on load, no submission
- Crawl internal links to a depth limit and report broken links (4xx/5xx) on key pages
- Evidence capture per finding: screenshot, console log, failing request, expected-but-missing tag
- Static HTML audit report per site with severity-ranked findings and suggested fixes
- Re-run on a schedule and diff against the last run; email an alert on new or resolved findings
- Passive-only guard: never submits forms, honors robots.txt, one visit per page per day

## Non-goals
- Uptime monitoring
- Submitting forms or purchases on sites we do not own
- Fixing the client's site
- Full tag governance, consent management or privacy compliance
- Multi-user accounts, billing and white-label in the MVP

## Success metrics
- Audit 100 public agency-client sites; at least 10% show at least one actionable finding (vendor study suggests about 5% for forms alone; tags raise it)
- Of 30 agencies sent a sample report, at least 3 reply and at least 1 pays the $500 audit within 30 days
- At least 1 audited agency converts to $149/mo or $399/mo monitoring within 60 days
- False-positive rate under 20% on a hand-checked sample of 50 findings
- Report generation for one site under 5 minutes

## Open questions
- How common are broken tags/forms on real agency-client sites? Needs the 100-site count.
- Will a passive finding be convincing without a test submission?
- Can $149/mo per site hold against Little Warden at GBP 60/mo for 650 URLs?
- Is unsolicited audit outreach acceptable to agencies, and who sends it?
- Does a "happening now" audit change the cure-vs-prevention outcome that sank feedwarden/listvault?
