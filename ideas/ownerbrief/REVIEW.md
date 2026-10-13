# Verdict: PASS — score 5/10

Weekend-buildable and zero-cost, but demand is entirely vendor-blog inference, the gap (narrative on top of a statement) is one PMS feature away from disappearing, and distribution to property managers without sales calls is unproven.

## Forcing questions

### Q1 Demand Reality — 3/10
Evidence is Rentvine's retention blog (vendor, unsourced 8–15% churn), Enterprise DNA (a consultancy selling the fix, 15–20 min/property unverified) and comparison blogs. RESEARCH.md itself says no first-person manager complaint was found. Nobody has paid, asked for it, or been angry it's missing. This is interest by proxy, not demand. Would change my mind: one manager (50–300 doors) who shows the letters they write by hand today, or pays for a free batch.

### Q2 Status Quo — 5/10
The workaround is real: hand-written owner emails on the 1st–5th, or nothing, or pasting into ChatGPT. But the research doesn't show managers write explanatory letters at all (PRD open question #1). If most send only the statement and handle calls reactively, the pain is mild. Consultancies being hired is a weak signal someone pays for it.

### Q3 Desperate Specificity — 4/10
The role is good (principal/ops manager, 50–300 doors, Buildium/AppFolio/Rentvine), the moment is good (monthly close), but there is no named person and no consequence heard first-hand. "Owner churn" is the career-level consequence, and it rests on a vendor claim. A 50-door manager on one hourly employee's time is a plausible buyer, but unproven.

### Q4 Narrowest Wedge — 7/10
Good: CSV upload, facts computed in code, model only phrases, human approves, first batch free. Narrower still: one PMS's export format, copy-paste into a form, no history, no payments. The wedge is real and shippable in days. Weakness: the free-first-batch means a user can get the value once and leave.

### Q5 Observation (pre-product)
Watch M1 users: do they upload a real export or hesitate over sending owner financials to a third party? Do they edit letters heavily or send as-is? Which flags do they act on? Does column mapping stop them (formats vary)? Do they come back next month?

### Q6 Future-Fit — 4/10
Cuts both ways. LLM letters get cheaper, but so does PMS-native AI: AppFolio and Buildium can ship "explain this statement" as a checkbox, and the research already lists this as a risk. The verified-numbers-in-code approach is a differentiator only against chatbots, not against the PMS vendors.

## Premises
1. Small managers write (or want to write) per-owner explanatory letters. Unsupported; no first-person evidence.
2. Owner confusion drives churn enough to pay $39–49/mo. Vendor claim only.
3. The PMS portal is not enough. Plausible per comparison blogs (one format for all owners), not tested.
4. Managers will upload owner financials to a third-party tool. Open; trust is a real barrier for money data.
5. Reachable without sales calls (NARPM, PM Facebook groups, SEO). Unproven.

## Alternatives
- **Minimal:** a free "paste your statement, get an owner letter" single-page tool (S, Low risk), with email capture. Tests letter demand with no accounts or storage.
- **Ideal:** multi-PMS presets, saved history, PDF/email send, Stripe (L, High risk; PMS-native AI could erase it).
- **Lateral:** a prompt/template pack for property managers sold as a one-time download, or fold the "owner communication" angle into covercheck's HOA/small-PM audience (same buyer, one landing page, two offers). Existing portfolio: covercheck already targets small property managers and boards, so any audience work is shared.
- **Recommendation:** if pursued at all, the minimal tool, after talking to three managers.

## Narrowest wedge
One generic CSV, one letter per owner, computed variances, copy button. No history, no accounts, no payments.

## M1 feasibility
- Weekend: yes (Next.js, Papa Parse, TS fact functions, free-tier LLM).
- Zero cost: yes (Vercel Hobby, free model, Stripe link deferred).
- The single test: a 3-owner CSV where owner A (income 2,000.00, expenses 450.00, fee 160.00) yields a letter containing exactly "1,390.00", plus the scan that no letter contains a figure absent from computed facts.
- Scope check: M1 is small. PDF parsing and per-PMS mapping are the real hidden cost (M2).

## Risks
- Demand is vendor-sourced; "the portal is enough" is the likely answer.
- PMS vendors add AI summaries natively.
- Owner financial data and privacy/trust; a wrong figure damages the manager's relationship.
- Statement formats vary; PDFs are brittle.
- Distribution without sales calls is unproven; low-ticket B2B to a conservative niche.
- Free first batch invites one-time use.

## Kill criteria
Drop it if any of: three conversations with 50–300-door managers show none writes explanatory letters; after 14 days of a landing page fewer than 50 relevant visitors or fewer than 5 signups; no manager agrees to run a real (redacted) export; or a major PMS announces AI statement explanations.

## Assignment
Before building, find 5 small property managers (NARPM groups, r/PropertyManagement, r/landlord) and ask to see the last owner email they sent about a confusing statement. No such email, no product.
