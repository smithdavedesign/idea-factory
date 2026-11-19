# ROADMAP — shelfhop

Suggested stack: static site with TypeScript + Vite (no backend, so $0 to host on Cloudflare Pages/Vercel and nothing sensitive stored); Vitest for fee-math tests; Stripe Payment Link for the $19 unlock; a plain JSON fee table.

## M1 — Tier calculator (one weekend)
Deliverables:
- Single page: resource rows (name, price, monthly sales) with add/paste-CSV.
- `fees.json` with Basic, Exclusive (80%, 77.5%), Payhip Free/Plus, Sellfy, Gumroad, each with source URL and last-checked date.
- Payout engine and break-even calculation; comparison table and "Basic + own store" scenario.
- Landing copy that states the 31 Dec deadline and a $19 pre-order / email capture for the listing pack.

Exit criteria (tests):
- Price 5.00, 100 sales/month on Basic returns net 245.00 per month ((5.00×0.55−0.30)×100 = 245.00).
- Same input on Exclusive at 77.5% returns 387.50, and at 80% returns 400.00 (fee on orders under $3 only, so none here).
- Break-even sales per year for Exclusive (77.5%) vs Basic at price 5.00 is 43: ceil(59.95 / (3.875 − 2.45)) = 43.
- Pasting a 3-row CSV produces 3 rows and a store total equal to the sum of the rows.
- Any fee with a missing source URL or last-checked date fails a schema test.
- No network request is made when computing (test with fetch mocked to throw).

## M2 — Listing pack
Deliverables:
- Input sheet (title, description, grade, subject, price, tags) via paste or CSV.
- Per-platform output (Payhip, Gumroad, Etsy, Sellfy) with title/tag limits and price-after-fees; CSV and text download; Stripe unlock.

Exit criteria:
- A 10-row input yields 10 rows per platform, each title within that platform's stored limit.
- Price helper returns a price whose net payout is at least the seller's target net on that platform (test across 20 prices).
- Download is blocked until a valid unlock token is present, and allowed with one.

## M3 — Seller-ready summary and refresh
Deliverables:
- Printable one-page decision summary; email reminder of the 1 Jan 2027 rate change and fee-table refresh notices.

Exit criteria:
- Summary renders all inputs and the chosen scenario in a print stylesheet test.
- Changing a fee in `fees.json` updates results and the "last checked" date shown.
