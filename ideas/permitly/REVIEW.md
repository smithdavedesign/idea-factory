**Verdict: validate. Score 6/10.** A real, expensive pain with a visible price gap, but demand rests on one forum thread and David has no STR-operator network, so it earns a cheap $0 landing-page test and nothing more.

## Six Forcing Questions

### Q1 Demand Reality: 3/10
Evidence is one BiggerPockets thread (RESEARCH.md, source 1): an operator with several STRs in multiple cities tracks permits in a spreadsheet and fears a fine or delisting. The single reply says "no single tool does all of it". That is a person describing a problem, not behavior: nobody has paid, asked when it ships, or been burned on record. The indirect evidence is stronger than the thread. Paying markets exist (MyLodgeTax $27/property/mo, HostReady $199+/mo, Trippz €4/property/mo), and enforcement is real (Las Vegas $72,900 fine; Kansas City about 93% of units unpermitted). These show the category sells. They don't show that a 3–15 unit operator will pay $19/mo for a tracker. What would change my mind: 5+ signups stating 3+ properties, and 3 of 10 interviewed operators agreeing to pay $19.

### Q2 Status Quo: 6/10
Spreadsheet plus calendar reminders, which is free and works until a renewal is missed. Nobody watches ordinance pages, and that gap is the real pain. The cost of the status quo is a fine ($500–$10,000+ per violation per Hostaway) or a delisting that loses a co-host client. The weakness: a spreadsheet with calendar alerts is a good-enough competitor for pure date tracking. Reminders alone are a convenience. The paid reason is the ordinance-change diff, which is M2.

### Q3 Desperate Specificity: 5/10
The named buyer is an independent co-host or small manager with 3–15 units in 2–5 jurisdictions, paid per unit managed. That is a role, not a person. Nobody is named and nobody has been interviewed. The consequence is concrete: a pulled listing means lost fees. The risk is that this is a thin slice of "hosts", most of whom have 1–2 properties in one city and won't pay. The count of operators with 3+ units across several jurisdictions is not sized in the research.

### Q4 Narrowest Wedge: 6/10
The wedge that sells is ordinance-change alerts with a diff, per city, for a flat price. The roadmap's M1, reminders and ICS, is the least differentiated part and the part a spreadsheet already covers. The narrowest sellable test is the landing page plus a hand-run version: David manually watches 10 ordinance pages and emails diffs to the first signups. That tests the paid value before any code. Price is flat $19/mo, which the research sets as a hypothesis.

### Q5 Observation (M1 users)
Not answerable pre-product. Watch M1 users for these:
- Do they enter permits for all their properties, or one or two?
- Do they supply ordinance URLs unprompted?
- Do they open reminder emails and act on them?
- Do they import a spreadsheet, or retype it?
- Which jurisdictions and permit types come up that the model doesn't fit?
- Do they ask for filing? The PRD treats filing as a non-goal, so watch for "just do it for me".

### Q6 Future-Fit: 6/10
The regulatory trend adds jurisdictions and rule churn: EU 2024/1028 from 20 May 2026, Houston permits from 1 April 2026, Austin license numbers on listings by July 2026. More rules per operator makes tracking more valuable. The threat is platforms and PMSs absorbing it: Hostaway already stores permits and reminders, and HostReady is moving down-market and integrating with OwnerRez (July 2026). A curated jurisdiction library is the only durable moat, and it is manual work that goes stale.

## Premises
1. Operators with 3–15 units across several jurisdictions are a reachable, paying segment. Weakly supported (one thread; unsized).
2. Fear of a missed renewal or rule change is strong enough to pay $19/mo over a free spreadsheet. Unproven; Avalara and HostReady pricing hints at it.
3. Ordinance-change diffs are the wedge, not reminders. Reasonable, but they are M2.
4. A reminder-only, no-filing tool earns trust. Open.
5. Ordinance pages can be fetched and diffed cheaply. Partly: many are PDFs or JS-rendered.
6. Distribution exists: BiggerPockets, co-host Facebook groups, OwnerRez users. Plausible; David has no existing audience there.

## Alternatives
- **A. Minimal: landing page plus concierge.** Waitlist asking for property and jurisdiction count; David hand-runs 10 ordinance watches with a free monitor. Effort S, risk low. Tests the actual paid value.
- **B. M1 as specced (tracker with reminders and ICS).** Effort M, risk medium. Builds the least differentiated part first.
- **C. Ideal: curated jurisdiction library plus ordinance watch, sold per city rather than per property.** Effort XL, risk high. Best moat, but manual data work and legal exposure.
- **D. Lateral: paid newsletter of rule changes for 10 cities.** Effort S. A Whop "STR Compliance Hub" newsletter already exists, so the market is crowded but proves the format sells.
- **E. Extend an existing repo of David's.** Context search found none in the STR space; Open-Travel is a travel planner and doesn't cover host compliance. The only reuse is RepoHQ's idea-signal pipeline for the landing page.

Recommendation: A, then B only if the test passes.

## Scope reduction (CEO review)
Cut to: landing page, waitlist with property count, and one hand-written sample ordinance-diff email as the pitch. Skip CSV, templates, PMS integrations and calendar feeds until paid interest shows.

## M1 feasibility (eng review)
- **Weekend build:** yes. The data model is small and `dueReminders` is a pure function. Next.js with magic-link auth, a cron job and an ICS feed is about 8 files, which is borderline but manageable.
- **$0 runtime:** yes. Vercel Hobby, Turso or Supabase free tier, Resend free tier (100 emails/day), cron on Actions or Vercel Hobby. No LLM is needed. A custom domain would cost money, so use the vercel.app subdomain.
- **The one test that proves M1:** `dueReminders` for a permit expiring 2026-12-31 returns the 90-day reminder on 2026-10-02 and none on 2026-10-03, and running the job twice sends each reminder once.
- Search check was skipped; this review used in-distribution knowledge and the research file.

## Risks
- Thin demand: one thread, no payer interviewed.
- Reminder-only M1 is undifferentiated from a spreadsheet and calendar.
- Ordinance pages as PDFs or JS-rendered pages break naive hashing.
- Legal liability: a missed or wrong alert may be blamed. Needs a disclaimer and a source link on every alert.
- Jurisdiction data goes stale, and curating it is manual labor.
- HostReady or a PMS adds a low tier.
- Low price ($19/mo) means about 50 customers for $1k/mo, with support and churn overhead.
- David has no STR-operator network or domain experience.

## Kill criteria
Drop it if, after 14 days and 50+ qualified visitors, fewer than 5 signups state 3+ properties, or if fewer than 3 of 10 operators interviewed would pay $19/mo, or if most target ordinance pages can't be fetched and diffed reliably.

## Next action
Post in the BiggerPockets thread and 2–3 STR/co-host communities with the landing page and ask operators to describe how they track renewals today.
