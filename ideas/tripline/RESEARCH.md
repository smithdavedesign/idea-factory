# tripline — research

## Summary
Internet-wide scanners now send valid MCP handshakes and hunt for AI-assistant config and credential files on ordinary web servers. Small businesses and the MSPs that run their sites have no cheap way to see it: a Thinkst Canary costs about $5,000–$10,000 a year. tripline is a passive tripwire (fake MCP/Ollama endpoints and decoy credential files that hold no real secrets) that alerts on the first touch and keeps a tracked list of the scanners.

Seed (David, via WhatsApp): a swarm detector for a server or network that offers bait to the internet, captures swarms looking for resources and tracks them. This draft keeps that intent in the legitimate, defensive form the seed itself describes: passive decoys and telemetry only. It plants no malware, makes no hack-back and sends nothing to the scanners beyond a static decoy response.

## Evidence of the problem
- The SANS Internet Storm Center reviewed two weeks of Apache/ModSecurity logs from a small web host and found about 200 AI-agent reconnaissance requests, including MCP handshake probes from 49 source IPs. The probes were valid MCP initialization requests, not simple path checks (`POST /mcp`, `GET /sse`). Source: the cybersecuritynews write-up of the ISC diary (URL below). I could not re-fetch the ISC diary itself, so the claim rests on this secondary article.
- The same scans checked for AI-assistant files: `.claude` credentials and local-settings files, `.cursor`/`.vscode`/generic MCP config files. The article says they were existence checks, which suggests the operators sweep many targets and only download files that are present.
- They also probed model endpoints (`GET /api/tags`, the Ollama model list; `GET /v1/models`, the OpenAI-compatible list) and tried cloud-metadata SSRF (`169.254.169.254`, `metadata.google.internal`).
- Exposure counts for self-hosted AI infrastructure vary by method. Cisco Talos found more than 1,100 exposed Ollama servers in September 2025; a Cloud Security Alliance note (May 2026) cites more than 175,000 publicly reachable Ollama servers; LeakIX counts 12,269 with no authentication (it-connect.fr and the CSA note). A guide reports a February 2026 audit in which 41% of 518 MCP registry servers had no authentication; that figure comes from a single vendor-adjacent blog and is unverified.
- The ISC's own advice for a site that does not run MCP: any `POST /mcp` or `/sse` is pure recon and a useful block indicator. Nobody turns that into a monitored, alerting product for small sites.

## Who pays
- **Buyer:** a small MSP or freelance security/IT consultant who runs the websites and servers of 10–50 small-business clients and can bill a "threat monitoring" line item. Second buyer: a solo owner of a self-hosted AI box (Ollama, MCP, OpenClaw-style agent) who wants to know when it is being probed.
- **Price point:** about $29/month flat for 5 sites, or $79/month for an MSP with 25 sites. This is a hypothesis, not a measured price.
- **Evidence people pay for something like it today:**
  - Thinkst Canary lists $7,500 a year (5 Canaries plus unlimited Canarytokens); Vendr's buyer data shows a median of $7,545 from 6 purchases (range $5,100–$10,995).
  - Trapster, a managed competitor, sells 3 licenses for €3,000. SecurityHive lists €75 a month per honeypot.
  - cside lists plans from $99/month for AI-agent traffic detection; Cloudflare Business is $200/month; Agent Monitor sells AI-bot analytics at $15 (individual), $35 (small business) and $250 (start-up) a month.
  - These show that people pay for deception and bot-visibility tools. They do not show that anyone pays for this exact product, and the cheap end is crowded.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Thinkst Canary | about $5,000–$10,995 a year, annual contract | Out of reach for small sites; decoys are generic machines, not AI-endpoint specific |
| Trapster | €3,000 for 3 licenses | Same price tier; managed service |
| SecurityHive honeypots | €75/month per honeypot | Per-honeypot pricing; general-purpose |
| Canarytokens.org | Free | Tokens fire only when opened or used; no MCP/Ollama endpoint decoys or tracked scanner list; attackers can learn to avoid them |
| OpenCanary / Cowrie / Trapster Community | Free, self-hosted | Needs deployment, updates and alert plumbing; Cowrie covers SSH/Telnet only |
| Beelzebub (MCP honeypot) | Open source | Decoy tools that detect prompt injection against your own agent; not an internet-facing tripwire |
| Crawlantix, AI Crawler Honeypot | Free | WordPress hidden link / crawler logger; catches link-following crawlers, not MCP/credential-file hunters |
| cside, DataDome, HUMAN, Cloudflare Bot Management | $99/month up to enterprise | Blocking and fraud focus, priced for larger sites |
| Agent Monitor | $15–$250 a month | Analytics of AI-bot visits; does not decoy |

## Technical notes
- Serve decoys on the customer's own domain or a customer-pointed subdomain: `/mcp` (answers an `initialize` JSON-RPC call with a plausible but empty tool list), `/sse`, `/api/tags` and `/v1/models` (fake model lists), and decoy files at the config/credential paths above, containing clearly fake, never-valid values.
- Two deployment options: (1) a hosted edge route (the customer proxies the decoy paths to tripline); (2) a tiny self-hosted container or Cloudflare Worker template.
- Alert content: path hit, source IP, user agent, headers, JSON-RPC body, timestamp, and a repeat count. Group hits by IP and by body fingerprint to build the "tracked swarm" list.
- Output: email or Slack alert, a weekly digest, and a blocklist export (nginx deny, Cloudflare IP list, fail2ban format).
- Passive only. Never return anything executable, never make outbound requests to the scanner, never include any real credential. IP data is stored for a short retention window (30 days default).
- Hosting fits free tiers (Vercel/Cloudflare Workers plus a free database) at low volume.

## Risks & open questions
- Free alternatives (Canarytokens, OpenCanary, Beelzebub) are good, and security people expect free tools. This is the same weakness the earlier developer-tool passes had, so the buyer must really be the MSP or small business owner.
- Only secondary-source evidence for the MCP scanning figure; no data yet on how often a given small site is hit.
- Attackers who fingerprint decoys will skip them; a tripwire detects reconnaissance, which is noise to many owners (alert fatigue). The value may be only the blocklist and the monthly "proof" report.
- Hosting scanner payloads means storing hostile input; sanitize and never render it.
- Reaching MSPs: David has no demonstrated channel. Community (r/msp, MSP Discords, small security forums) is the likely route.
- Legal: logging IPs is personal data in some regions; keep retention short and say so.

## Sources
- https://cybersecuritynews.com/internet-wide-scans-target-mcp-servers-claude-credentials/amp/
- https://isc.sans.edu/forums/diary/22268/ (cited as the ISC source; the page I fetched did not match, see note above)
- https://www.it-connect.fr/securite-ia-plus-de-1-100-serveurs-ollama-exposes-sur-le-web-sans-authentification/
- https://labs.cloudsecurityalliance.org/research-rb/csa-research-note-self-hosted-ai-infrastructure-exposure-202/
- https://mcpplaygroundonline.com/blog/mcp-server-security-complete-guide-2026
- https://trapster.cloud/en/blog/thinkst-canary-alternatives
- https://www.securityhive.io/blog/best-honeypot-solutions-in-2025
- https://vendr.com/marketplace/thinkst-canary
- https://cside.com/blog/best-tools-for-ai-agent-detection-to-prevent-website-fraud
- https://www.everydev.ai/tools/agent-monitor
- https://itnext.io/securing-ai-agents-with-honeypots-introducing-beelzebub-mcp-b062a935f451
