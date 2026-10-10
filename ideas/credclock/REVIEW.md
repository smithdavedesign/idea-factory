# credclock: PASS, score 5/10

A buildable, $0 tracker with a plausible flat-price gap, but demand rests only on vendor marketing, David has no healthcare network, and free CAQH reminders plus a spreadsheet are probably good enough.

## Forcing questions
- **Q1 Demand reality (3/10).** No forum thread, interview or purchase signal. Evidence is vendor blogs (omnimd.com) and one unverified $38k denial anecdote. Competitor per-provider pricing (carepatron, medwave, spendbase) shows a market, not pull from 1–10 clinician practices. Stronger evidence: a practice manager describing a specific held claim, or someone pre-paying $19.
- **Q2 Status quo (6/10).** Spreadsheets, calendars, CAQH's day-120 reminder, or services at $45–$500/provider/mo. A real workaround exists, but it is free and mostly works; lapses are silent and episodic.
- **Q3 Desperate specificity (4/10).** "Owner or practice manager of a 1–10 clinician practice" is a category. No name, practice or quote.
- **Q4 Narrowest wedge (6/10).** The attestation pre-check is narrow and simple, but it is essentially a spreadsheet formula.
- **Q6 Future-fit (5/10).** Credentialing burden persists, but CAQH or practice-management/EHR vendors can add expiry alerts natively; the durable value (integration) is ruled out by CAQH terms.
- **Q5 (observation)** can't be answered pre-product; see "Watch" below.

## Premises
1. Small practices suffer costly lapses often enough to pay monthly: unsupported.
2. CAQH doesn't warn about expired documents before a blocked attestation: plausible, single-source.
3. Manual entry is enough and users will keep data current: doubtful, it's the spreadsheet chore again.
4. Practice managers will trust a new vendor and can be reached: unsupported; no network.

## Alternatives
- **Minimal:** free calculator/spreadsheet template as a lead magnet to find real users first.
- **Ideal:** the full PRD M1–M3 SaaS; more than the evidence justifies.
- **Lateral:** sell to credentialing consultants/billing firms serving many small practices.
- No David repo overlaps (context search found nothing relevant).

## Narrowest wedge
Single-page calculator: enter last CAQH attestation and document expiries, get next due date, blocking documents and an ICS download. No accounts.

## M1 feasibility
- Weekend: yes. $0: yes (Vercel Hobby, SQLite/Turso or no DB, pure date functions).
- Proving test: `nextAttestation("2026-10-01") == "2027-01-29"`; `blockers()` flags malpractice expiring 2026-12-01 but not 2027-03-01.

## Risks
Unproven demand; no channel to healthcare; free incumbents and RosterSafe at $25/provider; missed-alert liability and data trust; manual entry hurts retention.

## Kill criteria
Drop if, after 10 practice-manager conversations, fewer than 3 describe a real lapse or say they'd pay $19/mo, or a 14-day test yields under 5 waitlist signups from practices with 2+ clinicians.

## Watch
If it proceeds: do users enter every document unprompted, keep the spreadsheet open alongside, and act on the "will block attestation" flag?

## Assignment
Talk to 5 practice managers (or credentialing consultants) before building anything.
