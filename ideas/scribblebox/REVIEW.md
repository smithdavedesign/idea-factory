**Verdict: PASS. Score 4/10.** Category demand is real, but nothing shows anyone paying $9 for this, and it duplicates alterpaw and giftlet.

## Forcing questions

**Q1 Demand reality: 3/10.** RESEARCH.md proves people pay for drawing keepsakes (Budsies ~$99, Artkive $75, NOTHS £18-£20) but states plainly that "no source shows people paying $9 for it specifically" and found no sales data for the mock-up niche. The Reddit and blog sources show parents have too many drawings, which is interest, not demand. Nobody would be upset if this vanished. Stronger evidence would be a stranger paying $9 for a hand-made version, or a repeat request from the same person.

**Q2 Status quo: 4/10.** Photograph-and-toss, or free Canva and Etsy mockup templates at $1.49-$4.24. The research notes "parents rarely do it" for DIY, which suggests low pain more than unmet pain. The workaround costs minutes, not money.

**Q3 Desperate specificity: 4/10.** "Parents and grandparents the week before a holiday" is a moment, not a person. No name, no quote, no conversation. The consequence of not solving it is a missed gag. Consumer gift products can pass on social moment, but this one has not yet named whose.

**Q4 Narrowest wedge: 6/10.** One upload, one toy-box template, watermark preview, $9 to unwatermark is cheap and sharp. The best wedge is smaller still: a fake-door page and hand-made first orders.

**Q5 Observation:** can't be answered before a product exists. See "What to watch" below.

**Q6 Future-fit: 3/10.** General image tools make "put this drawing on a toy box" a free one-prompt task within three years. A template product gets less essential. The moat (taste, templates) is easy to copy.

## Premises

1. A $9 instant digital option fills a gap between free DIY and $18-$100 physical gifts. The price gap is confirmed; appetite in it is not.
2. Relatives will pay for a finished mock-up. Unsupported.
3. Parents will upload their kids' art to a new site. Plausible with deletion, but there's a trust bar and COPPA framing.
4. It is distinct from David's other gift ideas. Weak: alterpaw (pet photo to funny bundle, $9-$20) and giftlet (photos to a keepsake page, $9-$19) share the buyer motive, price band and channels.

## Alternatives

- **A. Minimal (recommended if David wants to test it):** no app. A static page or Canva sheet with three sample boxes, a $9 Stripe link and "send me the drawing, get it back in 24h". Effort S, risk low. Hand-make five orders.
- **B. Extend an existing repo:** add a drawing-to-toy-box template to alterpaw. Effort S-M, risk low. Reuses upload, compositing, copy generation and payment, and the same audience.
- **C. Ideal architecture:** the full Scribblebox product (M1-M4 in ROADMAP.md) with three templates, papercraft PDFs and analytics. Effort L, risk medium. Only worth it after A shows payments.
- **D. Lateral:** sell a template pack to Etsy sellers and designers. The $1.49-$4.24 price points show a low ceiling.

## Narrowest wedge

A fake-door page with sample outputs and a $9 button, plus hand-delivered first orders. This answers the only question that matters (will a stranger pay $9?) without building M1.

## M1 feasibility

- **Weekend build:** yes. One toy-box template, in-browser background removal (@imgly/background-removal), canvas compositing, a free-model blurb, R2 with a 7-day lifecycle. The roadmap's exit criteria are testable (413, 415, 422, cleanup with an injected clock).
- **Zero cost:** yes on Cloudflare Workers free plan (Vercel is soft-blocked until 2026-11-30). Keep background-removal model assets out of the Worker bundle (3 MiB gzip cap). Stripe arrives in M2 and needs David.
- **The one test that proves M1:** `POST /api/preview` with a 1200x1600 JPG named "Mia", age 6, returns a watermarked PNG in under 30 seconds, and a blank page returns 422.
- **Caveat:** M1 proves rendering only. It proves nothing about demand, which is the actual risk.

## Risks

- $9 willingness to pay versus free Canva is unproven.
- One-time and seasonal. Today is 2026-11-18, so a fresh build misses most of the gift-season window.
- Children's photos: privacy, consent, COPPA.
- Three near-identical "photo to funny keepsake" ideas split David's attention; none has shown paid demand.
- Trademark drift toward real toy or cereal brands.
- Easy to copy, no distribution advantage identified.

## Why pass

A fun, cheap-to-build gag with a seasonal one-time purchase, thin demand evidence at the proposed price, a free substitute, and heavy overlap with two other ideas. David would agree: it's a feature of alterpaw, not its own product.

## Kill criteria (if David overrides and tests it)

Drop it if a fake-door page gets under 50 targeted visitors in 14 days with fewer than 5 signups, or if fewer than 3 of the first 20 people shown a real preview click a $9 buy button.

## What M1's users should be watched doing

Five parents or grandparents uploading a drawing with no help. Note: photo quality and whether background removal copes; whether they edit the blurb or accept it; whether they share the watermarked preview; where they hesitate at the $9 step; whether they mention Canva.

## Next action

If anything: try Alternative B (a toy-box template inside alterpaw) or A (hand-made fake-door test). Otherwise drop it.
