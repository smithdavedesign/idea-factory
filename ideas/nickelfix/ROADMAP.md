# nickelfix — roadmap

## M1 — Diagnose from the rejection email and manifest (one weekend)
Deliverables:
- Single page: textarea for rejection email, textarea/upload for manifest.json.
- Parser mapping violation codes (Red/Yellow/Grey/etc. plus named policy) to a policy-rule set.
- Manifest rules: unused/excess permissions, `<all_urls>` host permissions, missing `action`/description, MV2 usage, remote-code fields.
- Report page listing ranked findings, each with a policy link.
Exit criteria (checks a test could run):
- Given a manifest with `"permissions":["tabs","history","cookies"]` and a rejection email mentioning "Use of Permissions", the report flags all three as needing justification and links the permissions policy.
- Given `"manifest_version": 2`, the report includes a finding titled as an MV3 migration issue.
- Given an email containing "Red Nickel", the parsed code equals `red-nickel`; given an unrecognised code, the report still renders with a "code not recognised" notice and HTTP 200.
- Manifest of 50 KB returns a report in under 2 seconds.

## M2 — Zip scan and drafts
Deliverables:
- Zip upload processed in memory; scan JS for `eval(`, `new Function(`, remotely loaded `<script src="http`, and fetched-then-executed code.
- Drafts: permission justifications, reviewer notes, appeal message.
Exit criteria:
- A zip containing `eval("1+1")` in background.js yields a remote-code finding naming the file and line.
- Zip with no findings yields the message "No static issues found" and still produces an appeal draft.
- After the response, no uploaded bytes remain on disk (test lists temp dir and finds it empty).

## M3 — Paywall and receipts
Deliverables:
- Stripe Checkout $9 unlock per case; email receipt link valid 30 days.
- Free view shows diagnosis summary only.
Exit criteria:
- Unpaid GET of the fix list returns 402/redirect; after a test-mode webhook with paid status, the same URL returns 200 with the fix list.
- Case data is deleted 30 days after creation (job test with a faked clock).

## Suggested stack
- Next.js on Vercel: one deploy, free tier.
- TypeScript rule engine: deterministic and unit-testable.
- JSZip for in-memory zip handling: no disk writes.
- Free-tier or local LLM only for drafting prose, never for findings.
- Stripe Checkout (test mode first): no card handled by us.
