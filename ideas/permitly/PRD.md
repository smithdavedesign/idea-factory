# permitly — PRD

## Problem
Small short-term-rental operators run units across several cities. Each city has its own permit renewal date, lodging-tax schedule and listing-disclosure rule, and rules change yearly. They track this in a spreadsheet, and a missed renewal means fines ($500–$10,000+ per violation per Hostaway) or a delisted listing. Existing paid tools are either priced per property (MyLodgeTax $27/property/month) or aimed at large portfolios (HostReady from $199/month).

## Target user
An independent co-host or small management business running 3–15 units in 2–5 jurisdictions, who is paid per unit managed and loses income when a client's listing is pulled. Secondary: an owner with 2–3 properties in different towns. The painful moment: a permit expires or a city changes its ordinance and they find out from the platform or the fine.

## Competitors & gap
Avalara MyLodgeTax (tax and license filing, per-property pricing, US), HostReady (portfolio plans from $199/mo, large operators), Hostaway (PMS feature), Trippz (tourist tax), spreadsheets and page monitors like Visualping. Gap: a cheap flat-price tracker for 3–15 units that combines permit expiry reminders with ordinance-change diffs, needs no PMS, and does not try to file anything.

## MVP scope
- Add properties with jurisdiction, permit number, expiry date, renewal link and tax filing cadence.
- Email reminders at 90/60/30/7 days before each permit expiry and tax deadline.
- Dashboard sorted by next deadline, with overdue items highlighted.
- Ordinance watch: the user supplies a URL per jurisdiction; daily fetch, change detection, and an emailed line-diff with the source link.
- ICS calendar feed of all deadlines.
- CSV import/export of properties and permits.
- Template library of about 10 common cities with cadence and portal link prefilled (user-confirmable).

## Non-goals
- Filing permits or taxes on the user's behalf.
- Legal advice or interpretation of ordinances.
- PMS or OTA integrations in the first version.
- Guest registration, tourist tax collection, dynamic pricing.
- Scraping city permit portals.

## Success metrics
- Landing-page test: at least 50 visitors from STR communities and at least 5 email signups with a stated property count of 3+ within 14 days.
- At least 3 of 10 interviewed operators say they would pay $19/month.
- M1: a user can enter 5 properties and receive correct reminder emails on the right dates (verified by test).
- Ordinance diff correctly flags a changed fixture page and ignores whitespace-only changes.
- First revenue goal: 10 paying accounts at $19/month ($190/month) within 90 days of launch.

## Open questions
- Is $19/month the right price, and flat or per-property?
- Do operators trust a tool that only reminds, or do they want filing?
- Which communities reach operators with 3+ units (BiggerPockets, Facebook co-host groups, OwnerRez users)?
- How many ordinance pages are PDFs or JS-rendered?
- Will HostReady or a PMS add a low tier?
