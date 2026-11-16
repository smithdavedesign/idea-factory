# boxcheck: verdict PASS, score 4/10

Real 2026 rule (W-2 Box 12 code TT), but M1 computes only the plain-week premium that payroll providers already handle. The hard regular-rate cases are only flagged, and no evidence shows anyone would pay.

## Forcing questions
- **Q1 Demand (2/10).** RESEARCH.md rates its own confidence Low and found no first-hand quote or payment evidence. The sources (Tax Adviser, TaxBandits, BBK law note) prove the rule exists, not demand. Evidence that would change this: a bookkeeper who paid or asked to pay for a TT check.
- **Q2 Status quo (4/10).** Gusto, OnPay and ADP calculate TT in-system; a CPA or bookkeeper covers the rest; free calculators and overtimeproof.pages.dev exist. Leftover pain is the non-standard pay, which is exactly what M1 skips.
- **Q3 Specificity (3/10).** "Owner or bookkeeper of a 5-50 employee hourly business" is a category. No name, no heard consequence. The penalty figure ($680) is unconfirmed.
- **Q4 Wedge (4/10).** CSV in, weekly premium out is a weekend build, but a plain week needs no tool and a complex week gets a flag. The paid value sits outside M1.
- **Q6 Future-fit (4/10).** Providers will build native TT support, IRS guidance is still shifting, and demand peaks in January. The gap closes each year.
- **Q5 (not answerable pre-product).** See "Watch M1 users" below.

## Premises
1. Small employers will miscompute TT: partly supported, but in general, not of providers' TT output.
2. A sizable group sits outside provider calculation: unsupported.
3. They would pay $29 for an independent check: unsupported, the price is a guess.
4. A plain-week recompute is useful: weak.

## Alternatives
- **Minimal:** free calculator and explainer for January search traffic. Cheap, earns nothing.
- **Ideal:** a full regular-rate engine with state rules. The valuable part, but not a weekend build and carries advice liability.
- **Existing repo:** none shares code. packpass, coiready, deductwise and lienclock are the same shape (narrow compliance checkers); compare their demand results first.
- **Lateral:** bookkeepers serving many clients, bulk comparison of providers' TT figures. Better buyer, needs conversations first.

## Narrowest wedge
Browser-only CSV check that reports weekly premium and flags rows it cannot calculate. Only worth testing once a bookkeeper confirms mixed-pay rows are the pain.

## M1 feasibility
- Weekend build: yes. Zero cost: yes (Vite static app, Papa Parse, Vitest, Vercel Hobby).
- Proving test: 52 hours at $20 gives 12 overtime hours and 120.00.
- Caveat: passing it proves the arithmetic, not the value.

## Risks
Providers get it right for most; advice liability; IRS guidance moving; seasonal window (about two months); free competitors; unverified reach.

## Kill criteria
Drop it if no bookkeeper or owner out of about 10 asked says mixed-pay cases are a real problem they would pay to solve, or the first 50 visitors produce no upload or purchase attempt.

## Watch M1 users
If it were built: whether they upload a real register or a toy one, what they do on a flagged row, whether they compare to their provider's figure, and whether they leave when they hit a bonus line.

## Why pass
The part that is easy to build is the part that is already solved, and the part that is hard is not in M1.
