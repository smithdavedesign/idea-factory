# PASS — score 4/10

**Verdict: pass.** The Etsy rule is real, but listlint is a metadata-only checker whose evidence is forgeable, whose urgency depends on early-2027 enforcement, and which duplicates David's ownshot idea for the same sellers.

## Forcing questions
- **Q1 Demand reality — 3/10.** No seller was found asking for this (RESEARCH.md, Risks). The rule (valueaddedresource.net, 22 Oct 2026) and wrongful takedowns (Etsy community threads) are documented, but worry is not demand. Enforcement is only "planned for early 2027". The $9/$19 price is anchored on SEO tools, which sell a different job. Stronger evidence: a seller who pays, who sends their folder unprompted, or a thread of sellers asking "how do I check my catalogue?"
- **Q2 Status quo — 4/10.** Sellers check by hand and retake photos. For most shops, adding one fresh phone photo per listing is free and takes minutes, which beats a $19 scan. The pain is real only for sellers whose originals are gone, and the tool cannot recreate those.
- **Q3 Desperate specificity — 4/10.** "Etsy seller with 50–2,000 listings" is a filter. The real person is the seller of a wrongly removed best-seller who needs proof, and ownshot already targets that person.
- **Q4 Narrowest wedge — 5/10.** M1 is a genuine weekend build, but a label table is not something anyone pays for this week. Paid value starts at the M3 evidence pack, which is ownshot's product with weaker proof.
- **Q6 Future-fit — 3/10.** Etsy's VP of Customer Operations says authorship tools are being developed, and the policy was revised within 15 days. Either would shrink or erase this. Metadata can be stripped or forged, so the evidence may carry no weight with Etsy.
- **Q5 (watch, don't demo).** If built, watch M1 users: do they drop a whole shop folder or one photo at a time? Do they have originals at all? What do they do when told "Unknown"? Do they try to export evidence or just retake the photo?

## Premises
1. Sellers need to know which listings fail before enforcement: partly supported, but anticipatory.
2. Photo metadata is useful authorship evidence: weak, by the research's own admission.
3. Sellers keep listing-organised folders of originals: unverified, and sources say originals are often gone.
4. A third party can beat Etsy's own tooling: doubtful.
5. Sellers pay for compliance, not just SEO: no evidence.

## Alternatives
- **A. Fold into ownshot (recommended).** Use the folder scan as ownshot's free pre-scan lead magnet. Effort S, Low risk. Reuses ownshot's audience and packet.
- **B. Minimal.** A free single-photo checker page plus a community post, no payments. Effort S, tests reach only.
- **C. Ideal standalone.** Full-shop auditor with CSV, hash matching and evidence packs. Effort M–L, High risk, rebuilds ownshot.

## Scope-reduction view
The narrowest version worth testing is the free folder labeller (M1). It does not need its own product, repo or waitlist, and its demand signal would be better measured on ownshot's page.

## M1 feasibility
- One person, one weekend: yes (Vite + TS, exifr, c2pa, canvas dHash).
- Near-zero cost: yes (static, Vercel, no Etsy API).
- The single proving test: the four fixture cases (camera-tagged JPEG → likely-unedited, Photoshop JPEG → edited, C2PA AI PNG → edited, stripped → unknown) with zero network requests after load.
- Feasible does not mean validated: building M1 teaches nothing about demand.

## Risks
Overlap with ownshot; Etsy native authorship tools or rule changes; forgeable metadata; the free workaround of adding one phone photo; enforcement slipping; unchecked forum promotion rules; the policy page itself was not read (403).

## Kill criteria
Drop it if ownshot's demand test is running or planned for the same audience, or if after two weeks and 50+ visitors fewer than 5% join the waitlist or no seller says they have listings with no unedited photo.

## Assignment
Don't test listlint separately. If ownshot is validated, add the folder scan to it as a free hook and measure whether it lifts signups.
