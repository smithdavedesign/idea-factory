# PRD — shelfhop

## Problem
TPT's October 2026 seller-plan change forces every established seller to decide between Exclusive (higher payout, sell digital resources only on TPT) and Basic (55% minus $0.30 per resource, free to sell elsewhere). Premium sellers must choose by 31 Dec 2026 or default to Basic on 1 Jan 2027. The right answer depends on each seller's prices and sales, which no blog calculates, and moving to a second storefront means re-creating every listing by hand. (RESEARCH.md: Evidence of the problem.)

## Target user
A teacher-author with an existing TPT store of about 30–300 resources earning a few hundred dollars or more a month, who is on Premium or Basic today, is unhappy with the new terms (petition signers, seller Facebook groups), and has no developer or VA. Specific painful moment: the account-settings screen asking them to opt into Exclusive before 31 Dec, with no way to know what each choice costs them.

## Competitors & gap
Platform blogs (Sellfy, Payhip, CartMango, EduBracket, Getly) compare fees generically and promote their own platform. Seller courses teach marketing. Hand migration is free but slow. No tool was found that takes a seller's own numbers and returns a payout comparison plus ready-to-use listings for other storefronts. Gap: personal numbers + the listing chore. See RESEARCH.md table.

## MVP scope
- Seller enters (or pastes a CSV of) resources with price and sales per month; everything runs in the browser, nothing uploaded.
- Payout comparison per resource and for the whole store under Basic, Exclusive (80% and 77.5%), and own store on Payhip Free, Sellfy and Gumroad, with the break-even number of sales for Exclusive.
- "Stay on TPT Basic and also sell elsewhere" scenario: assumes a seller-entered share of sales moving to an own store and shows total monthly income vs Exclusive.
- Listing pack: paste title, description, grade, subject, price; get a per-platform copy sheet (title/tags/description variants, price after fees) as CSV and text.
- Dated fee table with "last checked" date and source link for every number, so the seller can verify.
- Shareable one-page PDF/print summary of the decision for the seller's own records.

## Non-goals
- No scraping of TPT, no logins to TPT or any storefront, no automatic upload.
- No hosting of the seller's files or a storefront.
- Not an AI listing writer in M1 and no AI-detection or evasion of TPT's AI policy.
- Not legal or tax advice.

## Success metrics
- Demand test: at least 100 unique visits from seller communities and at least 8 email signups or $19 pre-orders within 14 days (about 8% of visitors, high but plausible for a deadline-driven niche; below 3 pre-orders = pass).
- 10 paying buyers in the first 30 days = $190, enough to justify M2.
- Calculator output matches a hand-computed spreadsheet to the cent on 20 test cases.
- Median time from landing to a decision summary under 5 minutes in 5 observed sellers.

## Open questions
- Does anyone pay for this, or is the calculator alone treated as free?
- Can sellers export their own sales/product data from TPT in a form to paste?
- Do Payhip, Gumroad and Sellfy support CSV product import, which would make the listing pack one click?
- Will TPT soften the terms after the petitions?
- Which seller communities allow a tool post?
