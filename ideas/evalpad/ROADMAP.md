# evalpad — roadmap

Suggested stack: Next.js on Vercel Hobby (one codebase, free), SQLite/Turso free tier (small relational data), Vitest (pure-function tests), a free-tier model through LiteLLM for drafts (keeps cost at $0).

## M1 — letter and portfolio engine (one weekend)
Deliverables
- Pure functions: `buildPortfolio(samples)` groups by subject and orders by date; `renderCertification(state, data)` fills the Pennsylvania and Florida templates
- A page where the evaluator pastes family details and sample list and downloads the PDF letter and an index

Exit criteria (tests can run)
- `buildPortfolio` with 9 samples across 3 subjects returns 3 groups, each sorted by date ascending
- `renderCertification("PA", {child, district, schoolYear, evaluator})` contains the child's name, the district, the school year and the sentence stating an appropriate education is occurring
- `renderCertification("FL", ...)` includes the evaluator's name and the evaluation date, and omits the PA-only wording
- Missing evaluator name returns a validation error, not a letter

## M2 — family upload link
- Tokenised upload link per child, uploads stored per family
- Exit: a POST of 3 files to a valid token stores 3 samples; an expired token returns 403; files over 10 MB are rejected

## M3 — evaluator inbox and draft narrative
- Inbox with statuses, notes box, model-drafted narrative that the evaluator edits
- Exit: status moves waiting → ready after the first upload; narrative draft contains no child name other than the one on the record

## M4 — retention and demand test
- Deletion job 90 days after signing, landing page with waitlist
- Exit: a family signed 91 days ago has zero files after the job runs
