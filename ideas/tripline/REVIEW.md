**Verdict: pass. Score 4/10.** A cheap build, but no evidence that anyone pays for this, free tools cover most of it, and David has no way to reach MSPs.

## Six forcing questions

### Q1 Demand reality: 3/10
- The problem is real: the SANS ISC saw about 200 AI-recon requests from 49 IPs on one small host in two weeks (RESEARCH.md, cybersecuritynews). That is secondary-sourced, and the ISC page itself could not be fetched.
- Nobody has asked for a tripwire. There is no complaint, no thread and no one who would scramble if it vanished.
- The price evidence (Thinkst Canary at $7.5k a year, cside from $99 a month, Agent Monitor from $15 a month) shows people pay for deception and bot visibility. It does not show they pay for this product.
- "Scanners exist" is not demand. A scanner hitting a site is a fact about the internet, not a pain the owner feels.
- Evidence that would change my mind: three MSPs who already pay for threat monitoring and say they would add this. Or a thread of people asking for exactly this.

### Q2 Status quo: 3/10
- Today, owners do nothing (they never see the probes), or they read raw logs, or they use free Canarytokens, OpenCanary or Beelzebub.
- "Nothing" is the status quo for most small sites. That usually means the pain is too weak to act on.
- The ISC's own advice is to block `POST /mcp` and `/sse` on sites that don't run MCP. That is one line of nginx config. A WAF rule or a free Cloudflare setting does the job without a tripwire.
- A tripwire only detects recon, which many owners treat as noise. The real value may be the blocklist and a monthly "proof" report. That is thin for $29 a month.

### Q3 Desperate specificity: 3/10
- The buyer is described as "a small MSP or freelance security consultant with 10–50 client sites". That is a category, not a person.
- No named person, no consequence. Nobody gets fired for missing recon probes, and an MSP's client does not ask for this.
- The concrete career consequence is missing. "A billable threat-monitoring line item" is a hope that the MSP can sell it on, not something heard from an MSP.
- The second buyer, a solo self-hosted-AI owner, is a hobbyist who will use the free tools.

### Q4 Narrowest wedge: 5/10
- The wedge is sharp on the build side: four decoy routes, a hit log and a nginx deny export, built in a weekend.
- It is not sharp on the pay side. The smallest thing someone would pay for this week is unclear, because the free decoy is easy to copy.
- The narrowest testable version is a free hosted decoy endpoint plus a weekly "who probed you" email for one domain. Then ask whether anyone cares about the email.

### Q5 Observation (pre-product)
- Not answerable before there is a product. In M1, watch an MSP technician set it up from the snippet alone, with no help. Does it take under 10 minutes?
- Then watch what they do with the first real alert. Do they open the report, paste the IPs into a blocklist, forward the digest to a client, or ignore it?
- Watch whether they ask "so what do I do with this?" If they do, the product is a data feed, not a product.

### Q6 Future fit: 4/10
- AI endpoints and agent tooling on the open internet will grow, and so will scanning of them. That is a rising tide every competitor can cite.
- It also cuts the other way. Cloudflare, Wiz and the WAF vendors will add "AI-agent recon" rules, and the AI-endpoint decoy becomes a free toggle. Attackers who fingerprint decoys will skip them.
- A narrow tripwire feature gets absorbed into bigger platforms.

## Premises
1. Small sites are hit often enough that a tripwire fires within days. Unproven: one host, secondary source. The PRD itself says 60% of pilots hit in 14 days is "plausible but unproven".
2. An alert about recon is worth money to the owner. Weak: recon is noise to most, and the real action is blocking, which a WAF or one config line does.
3. MSPs will pay about $29–$79 a month. Unproven: it is a guess, and the cheap end of the market is crowded with free tools.
4. David can reach MSPs. Not supported: the research says he has no demonstrated channel.
5. Free tools (Canarytokens, OpenCanary, Beelzebub) are not good enough. They need assembly, but a technician buying a security product can assemble them. This is the weakest premise.

## Alternatives
- **Minimal: a free decoy plus a public "who is probing AI endpoints" feed.** A content and SEO play for the security audience, with no payment. It builds a channel and data, but earns nothing directly.
- **Extend existing work: fold it into boardping's MSP audience.** boardping already targets small MSPs and security firms (K-12). A tripwire could be an add-on for that audience, which shares the channel problem rather than adding a second one. It only helps if boardping finds MSP traction first.
- **Ideal: a managed service with a verified scanner-intel list sold to MSPs.** Long-term, the tracked-scanner dataset is the asset. It is too heavy for a solo build with no early users.
- **Recommended: none of the above now.** Pass. If David wants the idea, run the narrowest wedge as one free script, not a SaaS.

## Narrowest wedge worth testing
One domain, four decoy routes, one weekly email listing who probed. Free. The test is whether anyone with real sites asks for it on a second domain.

## M1 feasibility
- **One person in a weekend: yes.** Hono on Cloudflare Workers or Vercel, D1 or Neon, Vitest. The exit criteria are concrete and testable (`deny 203.0.113.5;`, count 4, no real key patterns).
- **Zero cost: yes.** Free tiers cover low volume. Email via Resend free tier.
- **The one test that proves M1:** `POST /mcp` with a valid `initialize` body returns a JSON-RPC result, and three hits to `/mcp` plus one to `/sse` from one IP produce a report row with count 4 and a correct nginx deny export.
- **That test proves the build, not the demand.** Passing it says nothing about whether anyone pays.
- The M3 setup (decoy routes on the customer's own domain via a reverse-proxy snippet) is where the real friction sits, not in M1.

## Risks
- No demand signal and no channel. This is the same weakness the research file names for earlier developer-tool passes.
- Free competitors are good, and security buyers expect free tools.
- Alert fatigue: recon is constant and unactionable for most owners.
- Decoys get fingerprinted and skipped.
- Storing hostile input and IP addresses (privacy law in some regions; sanitize and never render).
- Selling security to MSPs needs trust and references that a new solo product does not have.
- The MCP-scanning claim rests on one secondary article.

## Kill criteria
- Fewer than 5 of 20 MSPs or consultants contacted agree to a free pilot.
- Fewer than 2 say they would pay $29 a month after seeing a real alert.
- Under 60% of pilot sites record any hit in 14 days, or hits are so frequent that alerts get ignored.
- Setup takes more than 10 minutes unaided.
- Anyone says "I'd just use Canarytokens / a Cloudflare rule".

## What M1 users should be watched doing
- Installing the snippet with no help, and how long it takes.
- Reading the first alert: do they act, ignore it, or ask what to do?
- Whether they use the blocklist export or just delete the email.
- Whether they forward the digest to a client (that would be the billable signal).

## Assignment
Before building anything, post the observation (probe counts on David's own sites, if he has any) to r/msp or a security forum and see whether MSPs ask for the tool. If nobody does, drop it.
