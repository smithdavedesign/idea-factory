# hourmark — research

## Summary
Pre-licensure therapists (LMFT, LPC, LCSW associates) must log thousands of supervised hours, and the *supervisor* signs for them and can be audited by the board. Most cheap trackers serve the associate. hourmark serves the paying supervisor: associates log hours free, the supervisor co-signs, and the app warns when a month falls below the board minimum and keeps the exam-ready audit file.
Supervisors already charge associates about $300/month, so a $19/month tool that protects that income is a small purchase. Competitor evidence is mixed: cheap associate apps ($5–$10/month) and one supervisor tool (Guidara, $29 per seat) already exist. Confidence is low.

## Evidence of the problem
- Oregon's board says hours accrued outside the approved plan will not be accepted. It also says that in any month an associate does not get the minimum supervision, no client-contact hours are credited for that month. Supervision records must be kept at least three years and produced within 14 days of a Board request (draft rule text). Sources: https://www.oregon.gov/oblpct/pages/supervisor.aspx and https://www.oregon.gov/oblpct/Documents/Hours_Rule_QA.pdf
- California's board reserves the right to audit supervisors, and a 2021 board document plans to require signed supervision agreements and to codify how completed hours are verified. Source: https://bbs.ca.gov/pdf/agen_notice/2021/20210506_07_xxvi.pdf
- Rules differ by state (one Texas example: at least 4 hours of direct supervision per month, no more than 50% group), so a spreadsheet per state is the default workaround. Source: https://tulip-apricot-ek44.squarespace.com/clinical-supervision
- A June 2026 marketing-blog roundup of Reddit complaints lists "pre-licensure supervision hours tracker" as an unsolved pain: trainees track 3,000+ hours across state categories in spreadsheets. The page gives no Reddit quote and no source URLs, so treat it as a lead, not proof. Source: https://www.nicheloom.com/blog/saas-ideas-from-reddit-2026
- I found no first-person complaint threads in search. Demand evidence is indirect (paid products exist, rules are strict).

## Who pays
- **Buyer:** a licensed supervisor (private-practice or group-practice owner) supervising 2–10 associates. They are paid for it: one Texas supervisor lists $300/month for the required 4 hours of individual and group supervision, and another plan is $350/month (https://tulip-apricot-ek44.squarespace.com/clinical-supervision). Five associates is therefore roughly $1,500/month of income that depends on valid, signed hours.
- **Price point:** $19/month per supervisor, unlimited supervisees, associates free.
- **Evidence they pay for something like it:** Guidara sells supervision-management software at $29/month per team seat (https://www.capterra.co.uk/software/1100941/Guidara). Associates pay $9.99/month for Psych Logger (https://apps.apple.com/us/app/psych-logger/id1592004219) and $60/year for Complete Supervision (https://apps.apple.com/us/app/complete-supervision/id6499280049). Training programs buy Time2Track on a quote basis (https://time2track.com/pricing).

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Guidara | $29/month per team seat, free trial (Capterra) | Closest competitor; per-seat, so cost grows with a group practice; covers supervisor e-signatures and board category breakdowns |
| Psych Logger | $9.99/month | Associate-side, limited to listed states |
| Complete Supervision | $60/year | Associate-side app |
| HourJourney | from $4.95 (period unconfirmed) | California only; generates BBS forms 37A-525 and 37A-301 |
| Time2Track | quote for organizations; about $9.99/month individual (third-party listing, 2023) | Aimed at training programs |
| Therapy Trainings supervision tracker | free | Individual log, no supervisor sign-off |
| My LPC Hours, License Tracker | free with in-app purchases | Associate-side only |
| SimplePractice | from $29/month | EHR, not an audit file |
| Spreadsheets / Google Docs | free | No monthly-minimum alerts, no signing history |

Sources: https://www.capterra.in/software/1108333/HourJourney , https://www.therapytrainings.com/courses/supervision-tracker , https://apps.apple.com/app/id6466114162 , https://www.simplepractice.com/compare/best-ehr-for-private-practices

## Technical notes
- Core is a per-state rule table (monthly minimum, individual/group split, hour categories, record retention) plus a monthly sign-off workflow. A supervisor invites associates by email link; associates log hours; the supervisor co-signs each month; unsigned or under-minimum months raise a flag.
- Export a dated PDF audit file (signed agreement, monthly logs, signature timestamps). Start with 3 states (CA, OR, TX), hand-checked against board pages.
- Stack: Next.js on Vercel, Turso or Supabase free tier, Resend for reminders. No LLM is needed.
- Data is clinical-adjacent but contains no client PHI: store only counts and categories, never client names. This must be stated clearly in the UI.

## Risks & open questions
- Crowded: many cheap associate apps plus Guidara. The wedge (flat supervisor price, unlimited supervisees, monthly-minimum alarm) is modest and copyable.
- Rule tables go stale and need manual upkeep; a wrong rule could cost an associate real hours. Needs a disclaimer and a link to the board source on every rule.
- Low price: $19/month needs about 53 supervisors for $1,000/month.
- Demand is not proven by any direct quote; some supervisors may be fine with a spreadsheet.
- Associates are usually the ones who choose a tracker, so supervisor-led adoption is unproven.
- David has no network among therapists.

## Sources
- https://www.oregon.gov/oblpct/pages/supervisor.aspx
- https://www.oregon.gov/oblpct/Documents/Hours_Rule_QA.pdf
- https://bbs.ca.gov/pdf/agen_notice/2021/20210506_07_xxvi.pdf
- https://tulip-apricot-ek44.squarespace.com/clinical-supervision
- https://www.capterra.co.uk/software/1100941/Guidara
- https://apps.apple.com/us/app/psych-logger/id1592004219
- https://apps.apple.com/us/app/complete-supervision/id6499280049
- https://time2track.com/pricing
- https://www.capterra.in/software/1108333/HourJourney
- https://www.therapytrainings.com/courses/supervision-tracker
- https://www.nicheloom.com/blog/saas-ideas-from-reddit-2026
