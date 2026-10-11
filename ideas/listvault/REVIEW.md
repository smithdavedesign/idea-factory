# Verdict: PASS — score 5/10

**One line:** A real, painful problem, but the product is a prevention tool built on manual data entry, sold to agencies who today solve it with a free Drive folder and a BrightLocal checklist. Nothing in the research shows anyone wants this form of it.

## Six Forcing Questions

### Q1 Demand Reality — 3/10
Evidence is practitioner commentary and vendor pricing, nothing more. SEJ (Blumenthal, 2025-03) says appeals take about 5 weeks. The LocalSearchForum thread (2026-02 to 2026-07) shows people nervous about edits. Nobody was interviewed and nobody asked for a vault.
Suspension pain is real, but that is not demand for *this* product. The $599 and $800 reinstatement fees (Whitespark, Sterling Sky) are payments for done-for-you rescue after a suspension. They don't show that anyone will pay $29/mo to prepare in advance. The product's biggest open question is "will agencies pay for prevention, or only after a suspension?" (PRD). Prevention is the harder sale, because the pain is hypothetical until it hits.
Stronger evidence would be: an agency showing you its own Drive folder structure, a forum poster saying "I'd pay for X", or 3 of 10 interviewed agencies committing to $29/mo. Waitlist signups are only a cheap filter.

### Q2 Status Quo — 6/10
The workaround is specific and cheap: BrightLocal's "have your documents ready" checklist, a per-client Drive folder and a spreadsheet. The research is honest that this is "manual, per-client chaos", and the 60-minute upload window is a concrete cost. But the workaround is free and mostly works for an agency that has been burned once. The cost of chaos is only paid during a suspension, which is rare per client. Real, but low-frequency pain.

### Q3 Desperate Specificity — 4/10
The buyer is a "local-SEO freelancer or small agency managing 10–100 listings", which is a category, not a person. No name, no named community member. The people who would care most (agencies that just lost a listing) are findable on LocalSearchForum and r/LocalSEO, which is a point in the idea's favour. The consequence is also clear: a client's calls stop and the agency looks negligent. But there is no one to email today.

### Q4 Narrowest Wedge — 5/10
The PRD's MVP is too wide for a test: vault, matcher, risk checklist, packet export, readiness score, dashboard. The narrowest sellable piece is the pre-edit risk checklist and "what to have ready" per edit type. That could be a free web page, and it is where interest can be measured. The matcher needs the user to retype name and address from each document, so it is more work than eyeballing three PDFs. That kills the "no setup" bonus push. Value is thin until M2 (accounts, storage, encryption), and M2 is where the real work and the sensitive-document liability sit.

### Q5 Observation (what to watch M1 users doing)
Watch whether an agency will actually type in 8 documents' fields for a client, or abandons at the first one. Watch whether they open the pre-edit checklist before an edit, or only after a problem. Watch whether the packet is something they would hand to a client, or just a checklist they print. Record the words they use for "suspension".

### Q6 Future-Fit — 4/10
It depends on a Google-created problem. One source says a bug behind the wave was fixed, and a quieter suspension rate shrinks the pain. Google could also tighten or ease verification. Omitted ($19/mo) and similar monitors could add a document store in a sprint. API-connected tools will win as listing management gets automated, and M3 admits this isn't in the MVP. It doesn't get more essential unless suspensions keep rising.

## Premises
1. Agencies will pay recurring fees for *prevention*, not only rescue. Not supported; the evidence is all post-suspension spend.
2. Evidence "matching exactly" is the main cause of failed appeals. Partly supported (BrightLocal, forum advice), but Whitespark says Google "rarely tells you exactly which rule you broke", so a vault can't promise reinstatement.
3. The suspension wave continues into 2027. Unverified; one source suggests a fix.
4. Agencies will trust a solo developer with business license scans. Unverified, and a heavy trust burden.
5. Doing nothing hurts. Real but infrequent: it hurts a given client only a few times a year at most.

## Alternatives
- **A. Minimal: free "pre-edit GBP risk checklist" page with email capture.** Effort S, low risk. Tests whether anyone cares before any vault is built. This is the version to run if David wants to revisit the idea.
- **B. Ideal: full vault with GBP API read access and expiry alerts.** Effort L, high risk. Needs OAuth verification and document security work. Not a weekend.
- **C. Lateral: sell the done-for-you appeal packet as a $49–$99 one-off per case**, or a template pack sold to agencies. Closer to what people already pay for. It has no recurring revenue.
- **No existing repo to extend.** Context search found nothing in local SEO or document handling. The only related idea is permitly (a diff watcher for ordinance pages), a different buyer.

## Narrowest wedge
A single page: choose the planned edit (address, name, category, hours, service area) and get the risk note plus a "have these ready" list, with a "check my documents" form for the name/address matcher. No accounts, no storage.

## M1 feasibility (ROADMAP)
- Weekend build: yes. Pure TypeScript normalizers, rules table, packet index and one page are small, and the exit criteria are testable.
- $0: yes at M1 (Vercel Hobby, no storage needed). Storage and auth, with encrypted business documents, come in M2 on the Supabase free tier; that is where the risk sits.
- The one test that proves M1: `findMismatches` returns exactly 1 address mismatch for the Ste 4 vs Ste 5 fixture and 0 for "Acme Plumbing, LLC" vs "Acme Plumbing LLC".
- The M1 test proves the code works, not that anyone wants it. Passing it says nothing about demand.

## Risks
- Prevention is a hard sell, and demand evidence is thin.
- Incumbent monitors add a vault feature.
- Liability for storing license scans and utility bills.
- Marketing can't promise reinstatement, which weakens the sales argument.
- Niche is small; $1k/mo needs about 35 agency customers found without a network.
- Manual data entry may kill adoption.

## Kill criteria
- Fewer than 5 qualified signups (10+ locations) in 14 days with 50+ qualified visitors.
- Fewer than 3 of 10 interviewed agencies would pay $29/mo.
- Forum owners say they already have a checklist and wouldn't pay.
- An incumbent adds document storage.

## Why pass
The score is below the policy threshold of 6. Real pain, but the evidence for *this* product is weak, the buyer is a category, the status quo is free, and the matcher's manual entry undercuts the value. If revisited, start with wedge A and 5 conversations on LocalSearchForum before building anything.
