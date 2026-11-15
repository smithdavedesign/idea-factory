# coiready — PRD

## Problem
Since 2 Nov 2026 any Amazon seller with a listing in an enhanced-safety category (11 categories, e.g. supplements, cosmetics, children's products, lithium batteries, mattresses, tires) must have a $1M liability policy on file regardless of sales, and must upload a certificate of insurance that meets about 13 criteria. Amazon's rejections are terse ("does not name Amazon.com Services LLC and its affiliates and assignees as an additional insured") and sellers on the forum are rejected repeatedly, sometimes just by renewing with the old certificate and a new date. Each loop costs days against a deactivation deadline (reported as 45 days from Amazon's email). See RESEARCH.md, Evidence.

## Target user
A small Amazon seller (solo or 2-person, roughly $1k–$100k a month) with at least one enhanced-safety listing who just got Amazon's email or saw the notice and holds a certificate from a broker. Moment: the day the broker sends the PDF, or the day Amazon rejects it. Secondary: consultants and prep centers who do this for several sellers.

## Competitors & gap
Brokers (Assureful, Next, Marsh/Accelerator) bundle certificate help with a policy but do not check one you already hold; generic brokers give certificates that lack Amazon wording; the forum and Amazon support are slow and generic. No standalone checker found. Gap: a $19 line-by-line check of the actual PDF, before upload, with the exact fix wording for the broker.

## MVP scope
- Upload a COI PDF (ACORD 25) or image; no account needed to see the result
- Extract named insured, insurer, coverage form (occurrence/claims-made), per-occurrence and aggregate limits, deductible, additional insured wording, policy dates, signature
- Check against Amazon's published criteria; show pass / fail / can't-tell for each with the certificate text it relied on
- Seller enters the exact legal name from Seller Central; tool checks it matches the named insured character for character
- Generate a short, paste-ready fix request email to the broker listing only the failing items
- Pay $19 to unlock the fix email and a saved report (the pass/fail summary is free)
- Renewal reminder 45 and 14 days before the policy expiry (email)

## Non-goals
- Selling or brokering insurance, or any affiliate commission in v1
- Logging into Seller Central or uploading to Amazon for the seller
- Legal or insurance advice; guaranteeing Amazon acceptance
- Non-US Amazon marketplaces; other marketplaces (Walmart, eBay)
- Certificate requesting/tracking for vendors (contractors, landlords)

## Success metrics
- Extraction accuracy: at least 90% of fields correct on 20 real or sample ACORD 25 certificates, measured by hand
- Rule check: 100% of the test certificates built to fail one criterion get exactly that criterion flagged
- Demand test: at least 50 visitors from seller communities and at least 5 uploads or waitlist signups within 14 days
- Conversion: at least 1 in 10 uploads pays $19 (that would be about $19 per 10 checks; ~50 paid checks is about $950, and this is a small-revenue tool unless renewals and consultants carry it)
- Of those who got a fail and fixed it, at least half report the re-issued certificate was accepted

## Open questions
- How many small sellers are really in the 11 categories and have no compliant policy yet?
- Will sellers pay for the check when the broker is "supposed" to get it right?
- Can the 13 criteria be kept current without Seller Central access?
- Would consultants and prep centers pay per certificate?
- Is there an acceptable way to reach sellers (Seller Forums, r/FulfillmentByAmazon, Facebook seller groups) without breaking their rules?
