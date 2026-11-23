# hourmark — PRD

## Problem
A licensed supervisor who oversees pre-licensure therapists signs for the associates' hours and can be audited by the board. Rules differ by state: monthly minimums, individual/group splits, hour categories, 3-year record retention, and 14-day record production in Oregon. Supervisors track this in spreadsheets, and one missed month can void an associate's hours for that month (Oregon) and put the supervisor's supervision income at risk. See RESEARCH.md "Evidence of the problem".

## Target user
A licensed therapist (LMFT, LPC or LCSW supervisor) in private or small-group practice who supervises 2–10 associates and charges for it, about $300/month per associate in the examples found. Secondary user: the associate, who logs hours free.

## Competitors & gap
Guidara ($29/month per seat) is the closest supervisor tool. Associate apps (Psych Logger $9.99/month, Complete Supervision $60/year, HourJourney from $4.95) serve the trainee. Gap: a flat supervisor price with unlimited supervisees, a monthly-minimum alarm before a month closes, and a board-ready audit file, with the associate side free so adoption is invited rather than sold.

## MVP scope
- Supervisor account with invite links for associates (no associate payment).
- Per-state rule table for CA, OR and TX: monthly minimum supervision, individual/group split, hour categories.
- Associate hour log (direct client contact, supervision individual/group, non-clinical) with monthly roll-up; counts only, never client names.
- Monthly co-sign by the supervisor with a timestamped signature history.
- Alerts to supervisor and associate when a month is on track to miss the minimum (mid-month and 3 days before month end).
- One-click dated PDF audit file per associate: agreement date, monthly logs, signatures.
- Flat billing: free for 1 associate, $19/month for unlimited.

## Non-goals
- Client notes, scheduling, EHR features or any client PHI.
- Legal advice or guaranteeing board acceptance.
- Every state at launch; more states come only on demand.
- Native mobile apps.
- A marketplace matching supervisors and associates.

## Success metrics
- After 14 days and 50+ qualified visitors from therapist communities, at least 5 supervisors sign up for the waitlist (justified by the $19/month price needing about 53 payers for $1,000/month).
- At least 3 of 10 supervisors shown the demo say they would pay $19/month.
- At least 2 of the first 5 invited supervisors complete a full month's co-sign.
- Rule-table check: 100% of seeded CA, OR and TX rules link to the board source.

## Open questions
- Do supervisors or associates pick the tool? Interview 10 supervisors.
- Is a flat unlimited price enough against Guidara's $29 per seat, or is this too similar?
- Which three states have the most associates and strictest audits?
- How are rule changes detected and who is liable for a stale rule?
- Are there board rules against storing signatures electronically?
