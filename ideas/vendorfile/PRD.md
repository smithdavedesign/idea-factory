# vendorfile — PRD

## Problem
Since June 3, 2026, small SEC-registered advisers must oversee every service provider that touches customer information and get a 72-hour breach notice commitment from them (SEC small entity guide). Vendors often don't answer, and the adviser has no tidy record proving they asked, chased and reviewed. Today it is a spreadsheet and scattered emails, or $3k–$15k of consultant and counsel time (Techvera).

## Target user
The principal/CCO of a 1–10 person RIA under $1.5B AUM with 6–15 vendors (custodian portal, CRM, planning software, email, cloud storage, e-sign, IT/MSP). The painful moment: a vendor ignored the third email and the CCO has nothing to show an examiner.

## Competitors & gap
COMPLY's free tier covers up to five vendors and its paid tier is demo-only inside a $6k–$20k/yr platform. Spreadsheets lack reminders and proof. vendorfile is a flat $49/month, unlimited vendors, self-serve, and its single output is the dated evidence binder.

## MVP scope
- Vendor register: name, contact, what customer data they access, criticality.
- Request generator: one email per vendor asking for the 72-hour notice commitment and the latest SOC 2 / security attestation, with clause text.
- Status tracking per vendor: requested, reminded, received, refused, with dates and a note.
- Reminders: automatic follow-up at 7 and 14 days, escalation list for non-responders.
- Attestation expiry: reminder 30 days before a stored SOC 2 / attestation date lapses.
- Exam binder: one PDF with vendor list, every request/reply timestamp, and review history.
- Annual review checklist per vendor with sign-off.

## Non-goals
Not legal advice or a policy generator; no incident-response plan or breach-notice sending; no vendor security scoring; no CRM or other regulations (Form ADV, marketing rule); no storing customer data or vendor documents beyond file links.

## Success metrics
- 10 RIAs complete a vendor register within 30 days of launch of a landing page and community posts (demand test).
- 3 of those 10 pay $49 (or pre-pay) within 60 days.
- Median time from sign-up to generated binder under 45 minutes for 8 vendors.
- At least 50% of requested vendors reply with an attestation or clause confirmation after two reminders.
- Free-text feedback from 5 advisers on whether an examiner would accept the binder.

## Open questions
- Will solo advisers pay $49/month versus a one-off $199 binder?
- Do examiners care about a specific format?
- Can emails be sent from the adviser's own address without deliverability trouble?
- Is there a reachable channel (RIA compliance groups, custodian communities)?
