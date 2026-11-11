# landfall — PRD

## Problem
Since 9 July 2026 non-US Etsy sellers must ship to US buyers DDP and build duties and import fees into the price, or lose Purchase Protection and have buyer-charged duties deducted (https://www.valueaddedresource.net/etsy-requires-ddp-shipping-us-tariffs/). Etsy's estimator gives one suggestion at a time, must be typed in by hand and does not work for variation listings (https://www.valueaddedresource.net/etsy-tests-us-tariff-calculator/). A seller with 100 listings and variations has to re-price hundreds of rows by hand, guessing HS codes, and a wrong guess is paid for per order.

## Target user
A non-US handmade or small-batch Etsy seller (UK, Canada, EU, Australia, India) with 20–300 listings and a real share of US sales, who is deciding whether to keep selling to the US. They open Etsy Shop Manager on the day they must re-price and find the estimator works listing by listing.

## Competitors & gap
Etsy's Zonos-based estimator (free, one listing at a time, suggestion only, no variations), Zonos Dashboard Lite (free, general), carrier DDP options (prices the label, not the listing), spreadsheets. Gap: bulk, variation-aware, margin-aware US price output that includes DDP fee and Etsy fees, exportable to CSV. See RESEARCH.md. The gap closes if Etsy ships bulk apply.

## MVP scope
- Upload an Etsy listings CSV export; parse listings and variations.
- Per-listing inputs: unit cost, weight, country of origin, target margin (defaults per shop).
- HS code suggestion from the product title and description with a seller-confirmed override, and duty rate lookup from US HTS data with a country-of-origin rate table and a last-verified date.
- DDP carrier fee assumption per shipping method (seller-editable, default from sourced $15–17 range) and Etsy fee model (6.5% transaction fee plus seller-entered payment fee).
- Per-variation recommended US price and resulting margin, with a flag where the price rises more than 25% or margin goes negative ("not worth shipping to the US").
- CSV export of new US prices, plus a one-page summary of listings to drop or move to a separate US price.
- Free preview of 5 listings; paid unlock for the whole catalogue.

## Non-goals
- No Etsy API integration or automatic price writes (M1 is CSV only).
- No label purchase, no customs filing, no remitting of duties.
- No legal or customs-broker advice; output is an estimate.
- No Shopify, eBay or other marketplaces yet.

## Success metrics
- Demand test: at least 5 percent of 200 qualified visitors from seller communities start an upload, and at least 10 reach the pay screen or pre-pay $19 within two weeks.
- Correctness: on a fixture of 30 variations, computed prices match a hand-checked spreadsheet to within 0.01.
- Time: a 100-listing shop produces its re-price CSV in under 2 minutes of seller effort.
- Kill if Etsy ships bulk apply for its estimator.

## Open questions
- Will sellers pay a third party at all, or just use Etsy's free estimator? No paid tool or price was found (RESEARCH.md).
- Which source for rates stays current enough to be trusted: the USITC HTS plus a hand-kept per-country overlay?
- Do sellers prefer a one-off $29 re-price or $12–19 per month with rate-change alerts?
- Does Etsy's bulk listing editor accept price-only CSV updates for variations?
