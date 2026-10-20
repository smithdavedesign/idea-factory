# tripline — PRD

## Problem
Scanners now probe ordinary websites for exposed MCP servers, Ollama endpoints and AI-assistant credential files (about 200 such requests from 49 IPs in two weeks on one small host, per the SANS ISC via cybersecuritynews). A small MSP or site owner sees none of it unless they read raw logs, and the deception tools that would alert them start around $5,000 a year.

## Target user
- Primary: an owner or technician at a small MSP or IT consultancy managing 10–50 small-business websites and servers, who wants a billable "threat monitoring" line.
- Secondary: a solo owner of a self-hosted AI box (Ollama, MCP server, agent gateway) exposed to the internet.

## Competitors & gap
Thinkst Canary ($5k–$11k a year) and Trapster (€3,000 for 3 licenses) are priced for larger firms. Canarytokens, OpenCanary and Beelzebub are free but need assembly and do not decoy the AI-endpoint and credential-file probes. Bot-detection suites (cside from $99/month, Cloudflare) block traffic rather than record who is hunting AI assets. The gap: a flat, cheap, zero-install tripwire specific to AI-endpoint reconnaissance, with a tracked scanner list and a blocklist export.

## MVP scope
- Decoy routes: `/mcp`, `/sse`, `/api/tags`, `/v1/models` that answer plausibly and statically.
- Decoy files at the known AI config and credential paths, holding clearly fake values.
- Hit capture: path, IP, user agent, headers, body, time; stored with 30-day retention.
- Instant alert by email (Slack webhook as an option) on the first hit from a new IP.
- Scanner tracking: group hits by IP and body fingerprint, with a per-site "who is probing you" page and repeat counts.
- Blocklist export: nginx deny list, Cloudflare IP list and plain text.
- Weekly digest email per site, for the MSP to forward to the client.
- Setup in under 10 minutes: a reverse-proxy snippet or Worker template for the customer's domain.

## Non-goals
- No malware, no baiting with real credentials, no hack-back, no outbound requests to scanners.
- No blocking or WAF; only detection and exports.
- No detection of insider or network-internal traffic in the MVP.
- No claims of attribution beyond IP, user agent and payload.
- No general-purpose honeypot (SSH, SMB and so on).

## Success metrics
- Demand test: at least 5 of 20 MSP owners or consultants contacted agree to a free pilot, and at least 2 of them say they would pay $29/month after seeing a real alert.
- Detection: within 14 days, at least 60% of pilot sites record one or more hits (the ISC found about 200 probes in two weeks on one small host, so this is plausible but unproven).
- Alert quality: fewer than 1 false-positive alert per site per week (hits must be to decoy paths only).
- Setup: median time to first live decoy under 10 minutes.
- Revenue: 10 paying accounts at $29–$79 a month within 60 days of launch.

## Open questions
- How often is a typical small site actually hit, and is the volume low enough to be useful rather than noisy?
- Will MSPs pay for AI-specific detection, or do they treat it as a free Cloudflare setting?
- Does the buyer care about the scanner list, or only the blocklist and a monthly report?
- Which retention period and notice satisfy privacy law for logged IPs?
- Can David reach MSPs through any community he already uses?
