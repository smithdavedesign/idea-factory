# playclear — roadmap

## M1 — Test-run tracker (one weekend)
Deliverables:
- Create a run (package name, start date, tester emails, max 25).
- Per-tester magic link with today's task and a one-tap check-in.
- Dashboard with a 14-day tester grid and an "on-track count" with a warning below 12.
- Daily reminder selection logic (pure function: who still owes today's check-in).

Exit criteria (testable):
- `onTrack(run, day)` with 15 testers, 3 of them missing a check-in on day 5 returns 12 and warning=false; with 4 missing returns 11 and warning=true.
- `dueReminders(run, today)` returns exactly the testers with no check-in for `today`, and none after they check in.
- POST to a tester's check-in link twice on the same day stores one check-in.
- A run of 14 days with 12 testers checking in every day shows `eligible=true` on day 14 and `false` on day 13.
- A run created with 26 tester emails is rejected with 422.

## M2 — Evidence log and answer drafter
Deliverables: release/feedback log; day-14 draft answers from templates and the logged facts; free-trial limit (3 testers) and $19 Stripe checkout.
Exit criteria:
- With 3 logged releases and 5 feedback notes, the draft for "how did you test" contains all 3 release names and ≥ 250 characters.
- With 0 logged releases, the drafter returns a warning "ship at least one closed-test update" instead of an answer.
- Run with > 3 testers returns 402 until paid; after a recorded payment webhook it returns 200.

## M3 — Rejection mode and reach
Deliverables: paste-the-rejection fix list; reapply checklist; SEO pages for "Google Play production access rejected" and the 12-tester rule; WhatsApp-link reminders.
Exit criteria:
- Rejection text containing "engagement" maps to the engagement fix list; unknown text maps to the generic list.
- Sitemap contains the guide pages and each returns 200 with a canonical tag.

## Suggested stack
- Next.js on Vercel Hobby: single codebase, free hosting.
- Turso or Supabase free tier: small relational data (runs, testers, check-ins).
- Resend free tier: daily reminder emails.
- Stripe Checkout: one-time $19 payment (David approves; agents hold no card).
- Vitest: pure functions (`onTrack`, `dueReminders`) are test-first friendly.
