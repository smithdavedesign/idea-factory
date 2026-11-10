# PASS — score 4/10

**Verdict: pass.** The pain is real (AirCover denials for photos that can't be tied to a stay), but demand evidence is entirely secondary, the buyer adopts only after a loss, and Turno plus the portfolio's other unvalidated evidence-packet ideas make this a poor use of a test slot.

## Six forcing questions

### Q1 Demand reality — 3/10
No one has paid or asked for a claim packet; RESEARCH.md admits "No source I found shows hosts paying specifically for a claim packet. Unproven." Sources (Scripps News, KTVU, Airbnb community thread, strspecialist, redawning, Hostfully) show the pain exists: interest in a problem, not demand. Stronger evidence would be: 3+ hosts who lost a claim saying they'd have paid $9 for a packet; hosts paying for Turno checklists specifically to win claims; a host asking for this in a forum.

### Q2 Status quo — 5/10
Cleaner texts, phone photos, Turno checklists (~$8–$10/property/mo, Capterra and strspecialist review) and free guides. That shows some willingness to pay for photo discipline, but Turno already covers the photo half and phone cameras timestamp for free. The marginal value is the packet and the server-side timestamp, and whether Airbnb weighs the latter is an open question.

### Q3 Desperate specificity — 4/10
"Co-host or small manager with 3–15 listings" is a category. The moment (cleaner texts a burn on the couch, nothing dated from before) is vivid but unattributed. Damage claims are infrequent, so the pain is occasional and large, not weekly. No named person or quote.

### Q4 Narrowest wedge — 5/10
A cleaner link plus PDF packet is weekend-buildable. But a waitlist tests interest, not willingness to pay for something valuable only after an event. The narrowest paid wedge is a $9 packet from photos the host already has, sold at the point of a denial.

### Q5 Observation (what to watch in M1)
Not answerable pre-product. Watch: whether a cleaner opens the link and finishes the shot list unprompted, where they drop off, whether the host remembers to send the link every turnover or forgets after week two, and what a host still edits by hand when assembling a packet.

### Q6 Future-fit — 4/10
Hosts' evidence burden may rise (Hostfully says rules got stricter in April 2026), but Airbnb, Turno or a PMS can ship a native cleaner-photo and claim export. Platform-dependent, no moat. This would change if Airbnb explicitly accepted third-party timestamped evidence and no competitor offered it.

## Premises
1. Missing stay-tied photos are the main cause of lost claims: partly supported; other causes exist (policy limits, wear and tear, late filing).
2. Independent timestamps make Airbnb more likely to pay: unsupported (PRD open question).
3. Hosts adopt before a loss: unsupported. It is an insurance-style sale.
4. Cleaners will comply every turnover: unproven.
5. $6/listing/mo or $9/packet works: self-proposed, not researched.

## Alternatives
- **A, minimal (S, low risk):** a free claim-packet checklist and template posted in host communities; see who asks for the tool.
- **B, ideal (M, medium-high risk):** the full roadmap (cleaner link, hashing, packet, later RFC 3161). Depends on compliance and on Airbnb's evidence rules.
- **C, lateral:** reuse a shared evidence-packet engine from proofpack, ownshot or listvault if one validates. Nothing in David's repos solves this directly; permitly (same buyer) was passed for weak demand.

## Scope challenge (reduction mode)
The narrowest version worth testing is a $9 one-off packet from photos the host already has: upload before/after photos plus booking dates, get a timestamped PDF and deadline countdown. No iCal, cleaner flow or subscriptions in M1.

## M1 feasibility
- One person in a weekend: yes. Zero cost: yes (Next.js on Vercel/Cloudflare, Supabase/Neon free, R2 or Supabase storage, pdf-lib, node-ical; the host pastes the link into their own text, no SMS spend).
- Test that proves M1: POST a photo to a valid cleaner token returns 201 and the stored SHA-256 equals the uploaded bytes' hash; an invalid token returns 404; the packet for a 3-room stay has 3 before/after pairs.
- Technical risk is low; demand risk is high, and building doesn't reduce it.

## Risks
- Demand evidence is only blogs and forums.
- Adoption precedes loss; the funnel is small and episodic.
- Cleaner compliance is outside the host's control.
- Turno or a PMS can add a claim export cheaply.
- Deadlines and rules come from conflicting secondary sources; wrong numbers would hurt trust.
- Same buyer as passed permitly; the portfolio already has several evidence-packet ideas awaiting validation.
- Privacy of guest-stay photos.

## Kill criteria
Drop if, after 10 interviews with hosts who lost or disputed a claim, fewer than 3 say they'd have paid, or if Airbnb's documentation or a host who won shows plain cleaner photos suffice and third-party timestamps carry no weight.

## Assignment
Before any build, find 10 hosts in STR communities (r/airbnb_hosts, Facebook host groups) who describe a denied claim, and ask whether they'd have paid for the packet.
