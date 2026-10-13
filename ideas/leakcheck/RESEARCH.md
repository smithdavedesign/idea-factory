# leakcheck — research

## Summary
- Agencies and small businesses lose leads and ad attribution when forms and GA4/GTM tags silently break after deploys, plugin updates or consent changes; nobody is alerted because the site is "up".
- Monitoring tools exist (Little Warden, ObservePoint, Trackingplan, Ghost Inspector) but are either cheap generic checkers without evidence or fix write-ups, or enterprise-priced. The gap is an evidence-first, per-client "revenue path" report an agency can forward to a client.
- Honest risk: the buyer pays for a cure, not prevention (feedwarden/listvault were passed on this). The wedge is a one-time audit that shows a breakage happening now.

## Evidence of the problem
- Leadferno "mystery shopped" 225 small-business sites (home services, medical, professional services, each top-10 local with 25+ reviews). 4.8% of contact forms were broken (about 11 sites), only 15.6% sent an auto-reply, and 42% got no response at all. Failure causes: misrouted notification emails, spam filters, plugin conflicts after updates, CAPTCHA errors; often found only after weeks or months. Leadferno sells lead-response software, so treat the number as vendor research; the original report was not located (secondhand coverage). https://www.theagentsofchange.com/?p=24503 and https://business.minstercommunitypost.com/minstercommunitypost/article/newsusa-2026-3-11-broken-contact-forms-are-costing-small-businesses-thousands
- PageCrawl describes the mechanism: a CMS deploy rewrote a checkout template and dropped the GA4 tag for 19 days; editors tidying HTML remove inline conversion snippets; plugin updates reorder the head or drop a container. No frequency statistic is given. https://pagecrawl.io/blog/analytics-tag-tamper-monitoring
- A secondary roundup claims 48% of sites have at least one Google Consent Mode misconfiguration, with no named original study, so unverified. https://www.webtonic.io/blog/best-ga4-implementation-tools
- Merchant forum threads show conversions silently breaking after plugin updates, checkout migrations and GA4 unlinking. https://community.shopify.com/t/is-google-ads-conversion-tracking-broken-from-ga4-google-sales-channel-enablement/204560

I did not find a trustworthy number for "how many small-business sites have a broken form or tag at any moment". The best available is about 5% for forms (vendor study). That is an open question for the pilot.

## Who pays
- Buyer: owner or account lead at a small digital agency running paid media, SEO or sites for 5-50 clients, for whom a client's silent tracking failure means wasted ad spend and a lost account. Secondary: small e-commerce/B2B owners.
- Price points to test (from the seed): $500 one-time audit, $149/mo per site, $399/mo agency plan.
- Evidence they pay for something similar today:
  - GTM/GA4 audit and monitoring is sold as a service: Inflow's GTM audits start at $1,999 (https://www.goinflow.com/google-tag-manager-audits/); a freelance analytics consultant sells weekly tag/trigger checks at EUR 150/mo and GTM+GA4 at EUR 250/mo (https://piotrlitwa.com/pricing.html).
  - Tools: ObservePoint Essentials from about $599/mo and Professional from about $2,400/mo, billed annually (https://www.observepoint.com/pricing/); Trackingplan paid from $249/mo (https://www.webtonic.io/blog/best-ga4-implementation-tools); Ghost Inspector $125/$249/$499 per month (https://www.capterra.com/p/156853/Ghost-Inspector/pricing/).
  - Agencies charge clients $200-$600/mo for maintenance and support, so a monitoring line item fits an existing budget (https://www.templatemonster.com/website-maintenance-services/subscription-checkout/).
- Counter-evidence: Little Warden charges only GBP 59.99/mo for 650 URLs including tracking-tag checks, so $149/mo per site is hard to defend on monitoring alone. Pricing power sits in the audit and the evidence/report, not in raw checks.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Little Warden | GBP 24.99-149.99/mo (20 to 5,000 URLs), 40-day trial | Checks tags, redirects, robots, content; forms are not listed; no screenshot/failing-request evidence or client-ready report. https://www.littlewarden.com/pricing/ |
| ObservePoint | about $599/mo and up | Enterprise tag governance, overkill and costly for small agencies |
| Trackingplan | free tier, paid from $249/mo | Needs installing a snippet/SDK on the client site |
| Ghost Inspector | $125-$499/mo | Codeless browser tests, but someone must record and maintain each test; no analytics-tag awareness |
| Checkly | from about $24-$64/mo | Code-written checks, developer tool |
| PageCrawl | free to $99/mo | Generic page-change watcher with a tag-monitoring recipe, DIY setup |
| Consultants (Inflow, freelancers) | $1,999 audit; EUR 150-250/mo | Human, slow, not continuous |
| Uptime monitors (UptimeRobot) | free | Only tells you the server is up |

## Technical notes
- Passive checks only on sites we do not own: fetch pages and render with headless Chromium (Playwright), detect GTM container IDs, GA4 measurement IDs, Meta/Google Ads pixels, network requests to collect endpoints (g/collect), console errors, form presence/action/fields, CAPTCHA, broken links. No form submissions or purchases.
- For clients who opt in (agency owns the site), a later tier can submit a test lead to a mailbox they control and verify delivery, which is the check that finds the 4.8% broken forms.
- Evidence capture: screenshot, console error, failing request and the tag that did not fire, bundled in a shareable HTML report.
- Stack runs at $0 on GitHub Actions cron plus Playwright, results in JSON/SQLite, static report pages on Vercel Hobby. Resend free tier for alerts.
- Respect robots.txt and rate limit to one visit per page per day.

## Risks & open questions
- Cure vs prevention: feedwarden and listvault were passed because buyers pay for a cure. Mitigation: lead with an audit of a breakage that exists now, then sell monitoring to prevent a repeat.
- Passive checks cannot prove a form is broken, only that it looks suspect (missing action, JS error, no CAPTCHA key). The strongest finding needs an opt-in test submission.
- Little Warden undercuts monitoring price; the bet is on evidence reports and the $500 audit.
- Unsolicited audits sent to agencies can read as cold outreach; David must review and send himself and keep claims factual.
- No hard number on how common broken tags/forms are; the pilot must measure it (audit 100 public agency-client sites and count findings).
- David has no network among agencies and does not want sales calls.

## Sources
- https://www.theagentsofchange.com/?p=24503
- https://business.minstercommunitypost.com/minstercommunitypost/article/newsusa-2026-3-11-broken-contact-forms-are-costing-small-businesses-thousands
- https://pagecrawl.io/blog/analytics-tag-tamper-monitoring
- https://www.webtonic.io/blog/best-ga4-implementation-tools
- https://www.littlewarden.com/pricing/
- https://www.observepoint.com/pricing/
- https://www.capterra.com/p/156853/Ghost-Inspector/pricing/
- https://www.goinflow.com/google-tag-manager-audits/
- https://piotrlitwa.com/pricing.html
- https://community.shopify.com/t/is-google-ads-conversion-tracking-broken-from-ga4-google-sales-channel-enablement/204560
