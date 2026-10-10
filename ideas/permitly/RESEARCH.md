# Research: permitly — permit, tax and rule-change tracker for small short-term-rental operators

## Summary
- Hosts and small co-host/property-management businesses with 3–15 units in several cities each face different permit renewal dates, lodging-tax deadlines and rules that change yearly. Today they use a spreadsheet plus calendar reminders.
- The paid tools split into two ends: Avalara MyLodgeTax at $27/property/month, and HostReady's portfolio plans starting at $199/month for up to 25 properties. Nothing sits at roughly $15–25/month for a 3–10 unit operator.
- Regulation is tightening in 2026 (EU Regulation 2024/1028 from 20 May 2026, Houston permits from 1 April 2026, Austin license numbers on listings by July 2026), so lapses cost delisting and fines.

## Evidence of the problem
- A BiggerPockets thread by an operator of several STRs in multiple cities: each jurisdiction has different permit renewal dates, lodging tax schedules and listing disclosure rules, rules change yearly, they track it in a spreadsheet and fear a fine or delisting. The one reply says "the spreadsheet is where most of them end up because no single tool does all of it", that Avalara MyLodgeTax is "not cheap, but it's the closest to a real solution", and that fines usually come from lapsed renewals while losing a listing hurts more. Source: https://www.biggerpockets.com/forums/80/topics/1288562-how-do-you-all-stay-on-top-of-str-permits-rules-across-multiple-properties
- This is a single thread, so it is thin evidence. Demand is what the landing-page test must establish.
- More than 200 US cities added or tightened STR permit rules in 2023–2025 (blog, unverified): https://www.rakidzich.com/articles/airbnb-str-regulation-tide-2026
- Hostaway: fines for operating without a permit are "often ranging from $500 to $10,000 or more per violation", with daily fines, platform removal and sometimes misdemeanor charges for repeat offenders. https://www.hostaway.com/glossary/str-permit/
- Enforcement examples: Las Vegas fined one homeowner $72,900 for 138 days of unlicensed rental (https://hanyc.org/las-vegas-homeowner-fined-72900-for-using-airbnb-without-license/); a Kansas City auditor found about 93% of STR units had operated without a permit (https://www.aol.com/93-short-term-rentals-kansas-113000212.html).
- EU Regulation 2024/1028 applies from 20 May 2026: units need a registration number, and platforms must show it and block listings without a valid one. https://conventuslaw.com/report/regulation-eu-2024-1028-on-short-term-rentals-impact-on-platforms-and-operators/

## Who pays
- **Buyer:** the independent operator or small co-host/management business running about 3–15 units across 2+ jurisdictions. Co-hosting and small management is itself a paid job, so a compliance lapse risks a client's listing and the fee. Owners of a few units are a secondary buyer.
- **Price point:** $19/month for up to 10 properties, $39/month for up to 25. This is a hypothesis for the landing-page test, not a measured number.
- **Evidence they pay for something like it today:**
  - Avalara MyLodgeTax: $27/month per property for 1–5 properties (third-party listing; Avalara's own page shows "starting at"). https://strhub.com/product/avalara-mylodgetax-2/
  - HostReady: portfolio plans $199/mo (up to 25 properties), $349 (50), $599 (100), $1,249 (250), plus a filing add-on from $89/door/year; OwnerRez integration launched 9 July 2026. https://www.ownerrez.com/blog/integration-with-hostready
  - Trippz for Hosts: €4 per property per month per paid service (guest registration and tourist tax). https://www.capterra.in/software/1108231/Trippz-for-Hosts
  - Page-change monitors used as a workaround (Visualping), roughly $10–14/month on the entry paid plan. https://pagecrawl.io/blog/visualping-vs-pagecrawl
  - A paid "STR Compliance Hub" newsletter exists on Whop (price not checked). https://whop.com/str-compliance-hub/

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Avalara MyLodgeTax | $27/property/mo (1–5), sales quote for 6+ | Lodging tax and license filing, US only; per-property pricing makes 10 units about $270/mo; no PMS integration, manual revenue import |
| HostReady | $199/mo up to 25 properties; filing add-on $89/door/yr | Built for larger portfolios; entry price is about 10x what a 3-unit operator would pay; filing service in early access |
| Hostaway (PMS) | Part of PMS subscription | Permit storage and reminders as a feature, no rule-change monitoring; requires the PMS |
| Trippz for Hosts | €4/property/mo per service | Tourist tax and guest registration, not permit renewals or US ordinances |
| Granicus Host Compliance | Government contracts | Sold to cities to catch hosts, not to hosts |
| Spreadsheet + calendar | Free | Manual; nobody watches the ordinance pages |
| Visualping / Distill | about $10–14/mo, free tier | Alerts on any page change with no context or per-property mapping |

## Technical notes
- Core data: properties, jurisdictions, permits (number, expiry, renewal URL), tax filing cadence, ordinance page URLs. All user-entered; no scraping of permit portals in M1.
- Reminders: email at 90/60/30/7 days via a free-tier email API; a scheduled job (GitHub Actions cron or Vercel cron on Hobby) checks daily.
- Ordinance watching: fetch the city ordinance URL the user supplies, normalize text, hash it, store the previous text and show a line diff in the alert. No LLM needed for M1, which keeps runtime cost at $0.
- A shared, curated jurisdiction library (renewal cadence, fee, portal link) is the long-term moat but is manual work; start with the user's own entries plus about 10 template cities.
- ICS calendar feed per account so reminders land in Google/Apple Calendar without extra integration.
- Stack on free tiers: Vercel Hobby, SQLite/Turso or Supabase free, Resend free tier.

## Risks & open questions
- Demand is unproven: one forum thread. The landing-page test must show operators with 3+ properties sign up.
- HostReady could move down-market, and Hostaway/OwnerRez could build rule-change monitoring natively.
- Legal accuracy: telling people a rule changed is not legal advice; the product must show the source and diff, disclaim, and not claim to file anything.
- Curating jurisdiction data is manual and goes stale.
- Whether $19/month is high enough to sustain the business and low enough to beat the spreadsheet is untested.
- Ordinance pages are often PDFs or JS-rendered, which breaks naive hashing.

## Sources
- https://www.biggerpockets.com/forums/80/topics/1288562-how-do-you-all-stay-on-top-of-str-permits-rules-across-multiple-properties
- https://www.ownerrez.com/blog/integration-with-hostready
- https://strhub.com/product/avalara-mylodgetax-2/
- https://www.hostaway.com/glossary/str-permit/
- https://www.rakidzich.com/articles/airbnb-str-regulation-tide-2026
- https://conventuslaw.com/report/regulation-eu-2024-1028-on-short-term-rentals-impact-on-platforms-and-operators/
- https://pagecrawl.io/blog/visualping-vs-pagecrawl
- https://www.capterra.in/software/1108231/Trippz-for-Hosts
- https://hanyc.org/las-vegas-homeowner-fined-72900-for-using-airbnb-without-license/
- https://www.aol.com/93-short-term-rentals-kansas-113000212.html
- https://whop.com/str-compliance-hub/
