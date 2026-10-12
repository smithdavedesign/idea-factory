# packpass — PRD

## Problem
Since 12 Aug 2026 the EU packaging regulation applies with no sales threshold, and each country has its own register, scheme operator, representative rule and labels (France also since 10 Jul 2026 needs a local representative per stream). A one-person Etsy or Shopify shop outside the EU cannot tell which countries it must register in, in what order, at what cost, or whether a country is worth shipping to. Etsy collects the IDs but says sellers must determine the requirements themselves (https://www.valueaddedresource.net/etsy-petition-eu-packaging-rules/).

## Target user
Owner of a small non-EU (US/UK/Canada/Australia) Etsy or Shopify shop, $20k-$300k/year, who ships some or all orders themselves to 2-6 EU countries and just got the Etsy Seller Handbook notice asking for EPR numbers. The moment: Etsy prompts for a German or French EPR number and they do not have one. Buyers pay for something like this today via representatives (from 190 EUR/yr per country) and paid compliance apps.

## Competitors & gap
Free generic guides (Listadum), representative vendors who sell a service (EPR Representative, RegSurance), single-country scheme operators (Lizenzero, Citeo), Shopify-only scanners (EUReady). Gap: a neutral, seller-specific plan — which countries and streams apply, ordered steps, cost range, labels, deadlines — plus a ledger of IDs and filing dates. See RESEARCH.md.

## MVP scope
- Questionnaire: origin country, platform, self-shipped vs print-on-demand share, EU destination countries with rough annual parcel counts, product categories (packaging only in M1).
- Rules table for Germany, France, Spain, Italy, Netherlands, Ireland, Belgium, Sweden: register, scheme operator, representative required, label needed, cost range, penalty, each with source URL and last-verified date.
- Plan output: ordered checklist per country, total annual cost range, and a "consider not shipping to X" flag when cost exceeds a seller-entered margin per parcel.
- Print-on-demand awareness: mark orders covered by Printful/Printify/Gelato EPR numbers as not the seller's duty.
- ID ledger: store LUCID/IDU/representative details and next filing date; export as a copyable list for Etsy Shop Manager.
- Email reminder before each annual filing date.
- Stripe Payment Link paywall: free summary, full plan and ledger after payment.

## Non-goals
- Doing the registration, acting as representative, or filing on behalf of sellers.
- Legal advice or guarantees of compliance.
- Non-packaging streams (WEEE, batteries, textiles) in M1.
- Any marketplace API integration.

## Success metrics
- Demand test: 200 unique visitors from seller communities in 14 days and at least 10 waitlist or pre-pay clicks (5% of visitors), or at least 3 paid $29 plans.
- Plan quality: 100% of rules rows carry a source URL and a last-verified date under 60 days old.
- Correctness: for 5 reference seller profiles, plan output matches a hand-checked expected checklist.
- Retention: at least 30% of paying users keep the ledger reminder on after 60 days.

## Open questions
- Will sellers pay for a plan, or only for the registration itself (partner or affiliate with a representative)?
- Which two countries matter most for US Etsy sellers (assume Germany and France)?
- How fast do rules change, and who verifies them?
- Does an EU simplification make the product obsolete within a year?
