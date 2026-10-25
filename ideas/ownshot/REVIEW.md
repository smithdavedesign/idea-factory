# Verdict: pass — score 4/10

Real pain, but nothing shows an independent timestamp changes Etsy's outcome, and the product has to be bought before the pain arrives.

## Forcing questions

### Q1 Demand reality — 3/10
Evidence is one trade-blog article (valueaddedresource.net) and Etsy forum thread titles with bodies behind a login (RESEARCH.md). Sellers do get wrongly flagged, but there is no evidence anyone looked for, paid for or asked for a dated-proof tool. RESEARCH admits "No source found shows sellers paying for appeal help". The same article says supply orders and production videos did not get a listing reinstated, and no source says a timestamp would. Interest is not demand; a waitlist would only be a cheap filter. Stronger evidence: a flagged seller paying $9 for a packet, or an Etsy-seller advocate saying Trust & Safety reads such attachments.

### Q2 Status quo — 4/10
Sellers email Support and Trust & Safety, ask forum advocates, or relist with new photos. That costs them reviews and ranking, so it is a real cost. But the cause is Etsy's automated process, so a seller-side artifact may not get past it. Pixsy ($19+) and the Etsy SEO tools show people pay for adjacent tools, not for this one.

### Q3 Desperate specificity — 4/10
The buyer is concrete: a one-person handmade shop with 20–300 listings and a Star Seller badge, who has just received a deactivation email. David has not spoken to anyone, and the only named person is an anonymous seller quoted in the article. The moment of pain (post-flag) and the moment of value (pre-shoot timestamp) don't coincide. Flagged sellers have nothing dated. Careful sellers feel no pain yet, and prevention is hard to sell.

### Q4 Narrowest wedge — 5/10
The narrowest wedge is the $9 one-off packet for a seller who has just been flagged. A post-flag packet is only useful if the seller already holds dated originals, which is the opposite of the buyer in that moment. The $12/month "upload your top 10 now" version is prevention, and the pain isn't felt until a flag arrives. The tech wedge is real and cheap to build. The commercial wedge is contradictory.

### Q6 Future-fit — 3/10
Etsy may add a real appeal route (the CEO said sellers could appeal, per the article). Etsy's own 2026 rules on AI disclosure and original design make provenance matter more, but the answer more likely lives inside Etsy (listing-side attestation) than in a third-party vault. Platform dependence is high.

### Q5 (substitute) — what to watch
In an M1 test, watch whether a flagged seller can find the right moment to upload, whether they attach the packet to a real appeal, and what Etsy replies.

## Premises
1. Wrongly flagged handmade sellers exist in volume. Supported by one article; the scale is unquantified.
2. They'd pay $9 once or $12 a month. Not supported; it is inferred from Pixsy and SEO tools.
3. Independent RFC 3161 timestamps influence Etsy's review. Unsupported. This is the central premise.
4. Sellers will upload before they're flagged. Weak: prevention products sell poorly.
5. A timestamp proves existence at a time, not authorship. True, and it limits the packet's value.

## Alternatives
- **Minimal: free timestamp checklist and static guide.** Explain how to hash and timestamp photos with FreeTSA/`openssl ts`, with a page of Etsy appeal tips. Effort S, no payment. It tests whether Etsy-seller communities care.
- **Ideal: vault plus Etsy API plus copy sweep.** Auto-protect every listing and warn on copies. Effort L, and the sweep costs money (TinEye about $0.04 a search), which breaks near-zero cost.
- **Lateral: ask seller communities and advocates first.** Interview 5 flagged sellers and the advocate named in the article about what has actually worked. Costs nothing, and settles premise 3 before building.
- **Extend existing repo:** none relevant. The closest idea, proofpack (Stripe dispute evidence packets), was already passed, and it shares the same "evidence packet nobody may read" weakness. packpass and leakwatch target the same Etsy sellers and are better evidenced.

## Scope reduction (CEO 0A/0C-bis)
The narrowest version worth testing is only the pre-flag timestamp plus a one-page packet. Even that is a pass for now because premise 3 can't be tested with a landing page. A waitlist measures sympathy for the problem, not whether Etsy honors the proof.

## M1 feasibility (eng review)
- One weekend: yes. Next.js, Supabase free tier, FreeTSA, `pdf-lib`, `exifr`. Four of six exit criteria are mechanical.
- Near-zero cost: yes for M1 (Vercel, Supabase free, FreeTSA). Not for M3, where the copy sweep exceeds the plan price.
- One test that proves M1: upload a JPEG, then `openssl ts -verify` of the stored `.tsr` against the FreeTSA CA exits 0, and a one-byte change reports MISMATCH.
- Risks: Supabase free storage fills fast with originals, and FreeTSA is a single free service with no SLA.

## Risks
- Central premise (Etsy gives timestamps weight) is unproven and may be false.
- Timing paradox: value arrives only if used before the pain.
- Etsy may fix the bot or add an appeal route.
- Reverse-image sweep is unprofitable at the price.
- Single-platform dependence.

## Kill criteria
Drop it if no seller or advocate says an independent timestamp would be attached or considered, or if fewer than 5 of 30 sellers say they'd pay $9 in a two-week test.

## What M1 users should be watched doing
Whether they upload before or after a flag, whether they understand the verification page, whether they attach the packet to Etsy, and what Etsy replies.

## Assignment
Before building anything, ask the advocate in the VAR article and 5 flagged sellers whether any dated, third-party proof ever got a listing restored.
