# citeproof — PRD

## Problem
Local-service clients ask their agency whether ChatGPT and Gemini recommend them. A single manual check is not repeatable: SparkToro's study found the same brand list appeared in under 1 in 100 repeated runs. Agencies cannot put a number in a client report they can defend, and nothing keeps the raw answers as evidence when a client disputes it.

## Target user
Owner or search lead at a 5–30 client local-marketing agency (home services, dental, legal) who already sends monthly client reports and wants an AI-visibility section. Has or can create an OpenAI/Gemini API key.

## Competitors & gap
ThriveStack citedby, Rankability, LocalSeen, Locals Rank, Otterly, Peec and Profound all sell AI-visibility tracking, from $29 to $499/month (see RESEARCH.md). The gap to test is rigor: repeated runs, a confidence range instead of a single score, and kept raw answers. This is unverified as a buying reason.

## MVP scope
- Client setup: business name, city, service, 3–5 competitors, 10 auto-generated buyer-style prompts the agency can edit.
- Run each prompt N times (default 20) on OpenAI and Gemini using the agency's own API keys, stored only in the browser.
- Parse each answer for the client, competitors and cited URLs.
- Mention rate per engine with a Wilson 95% interval; never a single "rank".
- Competitor table: who is named instead, with their rates.
- Top cited sources, so the agency knows where to get listed.
- Evidence export: every raw answer and timestamp as CSV/JSON.
- Branded PDF report (agency logo and name) with a plain-language caveat that API answers may differ from the consumer apps.

## Non-goals
- Scraping ChatGPT/Perplexity consumer apps.
- Google AI Overviews tracking (no official API).
- Recommendations engine, content writing, multi-user accounts, hosted key custody.
- Prompt-volume or "share of voice" claims beyond measured runs.

## Success metrics
- M1: a run of 10 prompts × 20 runs completes in under 10 minutes and costs under $3 at API rates.
- Repeat runs of the same config give intervals that overlap in at least 90% of prompts.
- Demand test: 5 agency conversations booked from 100 outreach/community posts; 2 agencies run a real client report; 1 pays $49+ within 30 days. Kill if fewer than 2 agencies run a real client.

## Open questions
- Do agencies care about confidence ranges, or only about a pretty chart?
- How different are API answers from what consumers see?
- Will agencies accept BYO API keys?
- Does ThriveStack or Rankability already show variance?
