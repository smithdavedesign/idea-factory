# Verdict: PASS — score 3/10

Hawaii-only chatbot compliance is a tiny, unproven market, and the product's real value (a safety classifier with legal weight) is neither a weekend build nor safe for a solo dev to promise.

## Forcing questions

**Q1 Demand Reality: 2/10.** Evidence is a statute (regulations.ai, capitol.hawaii.gov) and two vendor case studies (Akia hotel, Romaix tour company) showing Hawaiian businesses use chatbots. None shows anyone wanting a compliance add-on. "$10,000 per violation" is a ceiling, not behavior. The $29/month price is the research's own guess ("plausible"). No one has paid, asked, or panicked. This is interest in a law, not demand. RESEARCH.md doesn't show the law applies to ordinary customer-service bots rather than companion/mental-health-adjacent chatbots. Most obligations (minor protections, suicide protocols, parental tools, DOH reporting) read as aimed at companion-style services. A hotel concierge bot likely carries a thin burden. Stronger evidence: three Hawaiian operators saying they were told to comply, or a vendor (Akia, Romaix) asking for white-label.

**Q2 Status Quo: 3/10.** Alternatives are DIY (20–60 hrs per the research), generic disclosure widgets (Disclosed €19/mo, Normis free), and a system-prompt line plus a 988 link. For a hotel bot the status quo is likely "add a disclaimer and a hotline line", an hour of work, not $29/month. Attestly's $500–2,000 is for broad compliance platforms, not evidence of willingness to pay for this.

**Q3 Desperate Specificity: 2/10.** The buyer is "operators of conversational AI services in Hawaii": a category, not a person. No name, role or consequence. The two named companies are AI vendors, not customers. Nobody here can be emailed.

**Q4 Narrowest Wedge: 3/10.** The PRD lists 8 features across 7 milestones. M1 (a disclaimer banner logging to localStorage) is trivial and nobody pays for it: a disclosure banner is a `<div>`. The paid parts are suicide detection, output filter, moderation and the DOH report, each a liability. The honest wedge is a free "Act 248 checklist + copy-paste disclosure snippet + annual report template" page, which tests whether anyone cares.

**Q5 (watch):** Not answerable pre-product. See the watch list below.

**Q6 Future-Fit: 3/10.** More state chatbot laws are likely, so only a multi-state version has a future. A Hawaii-only product has a market of dozens of firms at most and depends on one statute that could be amended or enjoined. The multi-state version is a different idea and is crowded (Attestly, Disclosed, Normis, model vendors' own safety layers).

## Premises
1. Act 248 creates real obligations for ordinary Hawaiian chatbot operators — not supported; the research only cites the bill summary, and scope looks narrower than the pitch.
2. Operators will pay ~$29/month rather than add a disclaimer themselves — unsupported, a guess.
3. A widget can detect suicide ideation well enough to rely on legally — doubtful. Keyword lists have poor recall, and an operator relying on one gets false security. David would carry reputational and possibly legal exposure.
4. The Hawaii-only market is big enough — unsupported; no operator count in the research.
5. A script tag can see chat content — it can't unless the operator pipes messages in, so the real integration is an SDK or proxy, not "two hours".

## Alternatives
- **A (minimal):** free static page: Act 248 plain-English checklist, copy-paste disclosure snippet, DOH report template. Effort S, risk low, $0. Tests interest only.
- **B (lateral):** extend `permitly` or `vendorfile`, David's existing flat-price compliance-tracker ideas. A multi-state "chatbot law tracker + evidence log" fits that pattern better than a Hawaii widget.
- **C (ideal):** multi-state chatbot-safety SDK with audit logs. Effort XL, risk high, crowded, high liability.
- **Recommendation:** none as a paid product now. If David keeps it alive, A at near-zero effort, framed as multi-state.

## Narrowest wedge
The Act 248 checklist and audit-log/annual-report generator only, for companion-style or mental-health-adjacent chatbot operators, with no detection or classifier claims.

## M1 feasibility
- **Weekend:** yes for the banner as written. That's the problem: it proves nothing about willingness to pay.
- **Zero cost:** M1 yes (static JS on Vercel Hobby, localStorage). M2–M4 want hosted NLP or moderation APIs, which breaks zero cost at real traffic. M5's guardian portal needs auth and parent verification, far beyond a weekend.
- **Single test:** a Playwright test of the ROADMAP M1 exit criteria (banner appears with `minorUser: true`, `logDisclosure` adds an entry, no interference otherwise). It doesn't test demand.

## Risks
- Liability: promising crisis handling or "compliance" from a keyword list invites blame after a bad incident. The PRD's "zero AG notices" metric is a guarantee David can't control.
- Tiny, unquantified market; the research never counts operators.
- Law scope unclear; may be amended or challenged.
- Selling legal compliance without a lawyer.
- Operators can comply with a prompt change and a disclaimer.
- Guardian features need age and parent verification a widget can't do.

## Kill criteria
Drop it if, after two weeks of a free checklist page, there are fewer than 50 relevant visitors, fewer than 3 operators ask for the paid tool, or no operator confirms Act 248 applies to them.

## What M1 users should be watched doing
Whether they paste the snippet unprompted; whether they ask "does this make me compliant?" (they want legal cover David can't give); whether minors use their bot at all; whether they ask for other states.

**Assignment:** find three named Hawaii operators (not vendors) and ask whether anyone has told them Act 248 applies. If none say yes, stop.
