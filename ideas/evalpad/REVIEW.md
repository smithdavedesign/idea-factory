# evalpad — verdict: PASS, score 4/10

Real, legally required job, but no evidence that evaluators want software, a small outbound-only buyer pool, and children's data to carry. Below policy minScore 6.

## Forcing questions
- **Q1 Demand (2/10).** RESEARCH.md admits no first-hand evaluator complaints and no hours-per-family data. Parent pain (ourjourneywestward.com, homeschoolgiveaways.com) is real but parents aren't the buyer. Interest is not demand, and here there isn't even interest. Would change my mind: 3 evaluators saying they spend 30+ minutes a family and asking for a tool.
- **Q2 Status quo (4/10).** Google Docs, email, templates at $0. Fees are $30-$150 per child (homeschoolfox.com, vendor figures). HomeschoolFox already generates evaluator letters for parents.
- **Q3 Desperate specificity (4/10).** The role is precise (PA/FL evaluator with 20+ families, found via CHAP/FPEA), but no named person and no consequence. It's side income; a $19/mo spend on thin margins is a hard sell.
- **Q4 Narrowest wedge (5/10).** PA/FL letter + portfolio index. Weekend-buildable, but a letter filler is copyable from a Google Doc, and the real value sits in M2-M3.
- **Q5 (observation).** Not answerable pre-product. Watch M1 users: do they paste real family data, how long from sample list to signed letter, do they edit the template wording, do they return for a second family, do they ask for the upload link or the narrative draft.
- **Q6 Future-fit (4/10).** A generic LLM lets evaluators draft narratives themselves; HomeschoolFox can add an evaluator view. Pool is hundreds to low thousands per state, with law-change risk.

## Premises
1. Evaluators lose meaningful time per family. Unsupported.
2. Evaluator is the buyer. Plausible but margins are thin.
3. AI-drafted narratives are accepted. Unverified; the evaluator attests and signs.
4. HomeschoolFox won't close the gap. Weak.
5. Evaluators are reachable via CHAP/FPEA directories. Plausible, but one-by-one outbound.

## Alternatives
- **Minimal (S):** free PA/FL letter + index generator posted in evaluator communities; measure use.
- **Lateral (S):** go parent-side or partner with HomeschoolFox/support groups.
- **Ideal (M-L):** full workspace with upload links, inbox, AI drafts and retention. Child-data liability; premature.
- No David repo to extend.

## Narrowest wedge (scope reduction)
One evaluator pastes family details and gets a PA/FL certification letter and sorted portfolio index. Test: 5 evaluators run it on a real family.

## M1 feasibility
- Weekend: yes. Next.js/Vercel Hobby, pure functions, Vitest.
- Zero cost: yes.
- Proving test: `renderCertification("PA", ...)` contains child, district, year and the appropriate-education sentence; FL omits PA wording; missing evaluator name returns an error.
- Caveat: passing proves the code works, not that anyone wants it.

## Risks
No demand evidence; small seasonal pool; HomeschoolFox or ChatGPT as substitute; children's data and deletion duty; AI narrative liability; outbound acquisition against the near-zero-overhead goal.

## Kill criteria
Contact 15 evaluators. Drop if fewer than 3 report 30+ minutes per family of writing and assembly, fewer than 5 agree to try it on a real family, or nobody takes a $19/mo trial.

## Assignment if revisited
Find five PA/FL evaluators in support-group forums and ask how long a family review takes and what they hate about it. No code until then.
