# boardping — roadmap

## M1 — Fixture-driven signal extractor (one weekend)
Deliverables: CLI that takes saved agenda text files, runs the classifier, outputs JSON alerts with quote, source URL and meeting date; dedupe; markdown digest renderer.
Exit criteria (tests):
- Given a fixture agenda containing "approve purchase of 400 Chromebooks and a managed firewall renewal", output has 1 alert of type `it_purchase` whose `quote` is a substring of the fixture.
- Given an agenda with no IT item, output has 0 alerts.
- Running twice on the same fixture yields the same single alert (dedupe).
- Any alert whose quote is not found verbatim in the source is dropped.
- Digest renders alerts sorted agenda < budget < rfp_posted with a link each.

## M2 — Live fetch for one state
Deliverables: district config file, fetchers for Legistar API and plain HTML/PDF pages, weekly GitHub Actions cron.
Exit criteria: a run against 10 configured districts completes in under 10 minutes and writes alerts; a failed fetch is logged, not fatal.

## M3 — Email digest and landing page
Deliverables: static landing page with email capture, weekly digest send, unsubscribe link.
Exit criteria: sending to a test list delivers one email containing every alert from the run; an unsubscribed address is skipped.

## M4 — Form 470 feed and pricing test
Deliverables: USAC Form 470 filter merged into digest; Stripe payment link.
Exit criteria: a Form 470 fixture for the configured state appears in the digest with bid-days-remaining; a duplicate of an agenda item is merged.

## Suggested stack
- TypeScript + Node: shared with the rest of David's tooling.
- Vitest: pure-function tests on fixtures.
- Free model via LiteLLM for classification: $0.
- GitHub Actions cron + static landing on Vercel Hobby: $0.
