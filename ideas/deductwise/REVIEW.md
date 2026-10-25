# Review: PASS, score 5/10

Real pain and cheap to build, but willingness to pay against free templates and ChatGPT is unproven, purchases are episodic, and reach is weak.

## Forcing questions
- **Q1 Demand reality: 3/10.** RESEARCH.md found no first-person landlord posts; all evidence is law-firm and vendor blogs (verticalrent, landlordstudio, daeryunlaw). The 40% small-claims and 68% statistics are second-hand. Adjacent tools (TurboTenant $119/yr, ProofMi $39–$119/yr) show spending on nearby tools, not this one. Stronger evidence would be a landlord who has paid a lawyer or lost a deposit case and asks for this, or who pays $19 after a preview.
- **Q2 Status quo: 5/10.** Free templates (Landlord Studio, Paperform), lawyers, or ChatGPT with a statute. Cheap and mostly adequate for the letter; the unseen risk (deadline, proration, receipts) is real but landlords don't feel it until they lose.
- **Q3 Desperate specificity: 5/10.** A concrete moment and consequence (2–3x the deposit plus fees), but only a category: the accidental landlord with 1–10 units and 1–4 move-outs a year. No named person, and hard to find at move-out time.
- **Q4 Narrowest wedge: 6/10.** Deadline, receipt rule, proration and a PDF for five states, with a $19 download. Deterministic and shippable in a weekend. Weakness: the free preview may be all anyone needs.
- **Q6 Future-fit: 4/10.** AI drafting erodes the template value. The defensible part is a verified, maintained statute table, which carries upkeep and liability. Low repeat purchase.
- **Q5 (observation):** not answerable before a product exists; see the last section.

## Premises
1. Small landlords lose money from missed deadlines and unprorated deductions: supported by secondary sources only.
2. They'll pay $19 for correctness over free options: unsupported.
3. A five-state rules table can stay accurate: plausible, with ongoing cost and risk.
4. They can be reached at move-out: weak; search is saturated with free templates.

## Alternatives
- **Minimal:** a free state deadline and proration calculator page for SEO and email capture; add the paid PDF only if traffic appears.
- **Ideal:** annual plan with a move-in evidence vault, reminders and 50 states. Heavier, with a legal-data maintenance burden.
- **Lateral:** sell to small property managers, or embed/affiliate with leasing suites.
- **Extend an existing repo:** none close (ownerbrief and covercheck serve different users).

Recommendation if revisited: the free calculator first.

## Narrowest wedge
Free-to-preview, $19-to-download state-checked, prorated statement for CA/TX/FL/NY/WA with a deadline countdown.

## M1 feasibility
- Weekend build: yes. Zero cost: yes (Vercel, pdf-lib, static rules table; Stripe and Resend arrive in M2).
- The one test: the roadmap's cases pass (CA 2026-03-22, TX 2026-03-31, NY 2026-03-15; proration 300.00; refund 1550.00).
- The hard part is statute accuracy, not code.

## Risks
Free substitutes and ChatGPT; wrong statute data causing harm or unauthorized-practice exposure; one-off purchases; crowded search and communities hostile to promotion; secondary-source-only demand.

## Kill criteria
Fewer than 50 relevant visitors in two weeks, under 5% waitlist/start rate, no one responding to a $19 price question, or testers saying ChatGPT with the statute is enough.

## What to watch M1 users doing
Whether they trust the output or re-check the statute elsewhere, whether they stop at the free preview, which line items they struggle to prorate, and whether they arrive with a deadline already missed.
