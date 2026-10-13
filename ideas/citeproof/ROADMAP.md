# citeproof — roadmap

## M1 — Measure one client (one weekend)
Deliverables:
- Pure functions: prompt generator, mention/competitor/URL parser, Wilson interval.
- Browser app: enter client details and an OpenAI key, run N repeats, see mention rate with range per prompt.
- CSV export of raw answers.

Exit criteria (testable):
- `wilson(7, 20)` returns an interval containing 0.35, with lower ≈ 0.18 and upper ≈ 0.57 (±0.01).
- Given 20 stubbed answers where 7 contain "Acme Plumbing", mention rate is 0.35.
- Parser finds "Acme Plumbing" case-insensitively and ignores "Acme Plumbing Supply" as a different business when listed as a competitor.
- Cited URLs in a stubbed answer are extracted and deduplicated by domain.
- CSV export has one row per run with prompt, engine, timestamp, answer text; 10 prompts × 20 runs gives 200 rows.
- The API key never appears in any network request except to the provider (test with a request spy).

## M2 — Competitors and sources
- Competitor table with rates and intervals; top cited domains.
- Gemini engine added.
- Exit: with stubbed answers naming two competitors at known rates, the table shows those rates; cited-domain counts match fixtures.

## M3 — Branded report
- PDF with agency logo/name, per-engine rows, caveat text, evidence appendix.
- Exit: generated PDF contains the agency name, one section per engine and the caveat sentence; file under 5 MB for 10 prompts.

## M4 — Saved clients and monthly comparison
- Local storage of clients and past runs; month-over-month change shown only when intervals do not overlap.
- Exit: two stored runs with non-overlapping intervals show "changed"; overlapping intervals show "no reliable change".

## M5 — Paid plan
- Stripe checkout for a $49/month unlock of PDF branding and more than 3 clients.
- Exit: unpaid users cannot export branded PDF; a paid test-mode session can.

## Suggested stack
- TypeScript + Vite static app: no server, keys stay in the browser, $0 hosting.
- Vitest: the M1 criteria are pure functions.
- Vercel Hobby with one serverless function only for Stripe in M5.
- Playwright to render the PDF and screenshots.
