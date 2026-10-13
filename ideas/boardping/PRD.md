# boardping — PRD

## Problem
Small MSPs that sell IT and cybersecurity to school districts hear about purchases only when an RFP is posted, often days before the deadline, on one of hundreds of district sites or portals. The earlier signal (a board agenda item, a budget line, a grant award) is public but takes hours a week to collect. See RESEARCH.md, Evidence of the problem.

## Target user
Owner or sales lead at a 5–50 person MSP, network or cybersecurity firm selling to K-12 districts in one US state. Pays about $79–$149/month; comparable spend is BidNet Direct at $599–$1,999/yr.

## Competitors & gap
BidNet Direct, RFPSchoolWatch and BidPrime alert on posted bids across all trades; Civic IQ finds pre-RFP signals broadly. Gap: one state, one trade, agenda-stage signals each backed by a quoted source passage, in a short weekly email instead of a platform to log into.

## MVP scope
- Config for one state and ~50 districts with their agenda/bid page URLs.
- Weekly fetch of agenda packets and bid pages.
- Free-model classifier for IT/security buying signals (device refresh, MDR, firewall, E-rate-funded work, cyber grants).
- Every alert includes a verbatim source quote, link and meeting date; alerts without a quote are dropped.
- Deduplication across weeks and across agenda/bid page for the same item.
- Weekly email digest ranked by signal stage (agenda mention, budget approval, RFP posted).
- Optional second feed from USAC Form 470 open data.

## Non-goals
National coverage, bid-response writing, CRM sync, other trades, paid contact data, user accounts beyond an email list.

## Success metrics
- 8 of 10 sampled alerts correct when checked against the source doc (hand-label 50 alerts).
- At least 3 of the first 10 MSPs contacted agree to a 30-day trial; at least 2 pay $79 after it.
- At least 1 alert per subscriber per month that they did not already know about.
- Under 15 minutes/week of David's time once running.

## Open questions
- Do MSPs actually lack this signal, or do they already use Civic IQ's free tier?
- Are BoardDocs and district sites open to automated reading?
- Which state has the most MSPs reachable through an association?
