# playclear — PRD

## Problem
A solo Android developer with a personal Google Play account created after 2023-11-13 cannot launch until 12 testers stay opted in for 14 consecutive days and a human reviewer accepts the production-access form. Recruited friends install once and disappear, the developer can't see who is active, and Google rejects for "insufficient tester engagement" with no appeal, restarting weeks of waiting (Google Play Help; Testers Community; dev.to account in RESEARCH.md).

## Target user
A solo or indie Android developer, or a freelancer shipping an app for a client, who is on day 1–14 of a closed test or just got rejected. Personal accounts only (organisation accounts are exempt).

## Competitors & gap
Testers Community sells testers ($25 Pro), Fiverr sells testers and fixes, TestPulse is a free in-app SDK, and swap groups are free but flaky. Nobody in my research keeps the developer's own testers engaged and turns that into the application answers. Gap: a no-SDK, no-purchased-testers kit that nudges real people daily and builds an honest evidence log.

## MVP scope
- Create a test run for an app: package name, start date, up to 25 tester emails the developer recruited.
- Per-tester magic link page showing today's 30-second task (open the app, try feature X, leave one line of feedback) with a one-tap "done" check-in.
- Daily email reminder to testers who haven't checked in; developer dashboard with a 14-day grid per tester and a red warning when fewer than 12 are on track.
- "Ship an update" log: record each closed-test release and the feedback it addressed.
- Day-14 answer drafter: fills the production-access questions from the log (how testing ran, feedback received, changes made), 250–300 words per answer, editable.
- Rejection mode: paste Google's rejection reason, get a ranked fix list and a re-apply checklist.
- One-time $19 Stripe payment per app after the free 3-tester trial.

## Non-goals
- Supplying, buying or exchanging testers.
- Faking, scripting or bot-generating any check-in or app usage.
- Guaranteeing approval.
- iOS/TestFlight, organisation accounts, an in-app SDK.

## Success metrics
- 14-day landing test: ≥ 5% of 200 qualified visitors join the waitlist (10 people), and ≥ 3 say they'd pay $19.
- After build: ≥ 40% of started runs reach day 14 with ≥ 12 on-track testers; ≥ 25% of free runs convert to $19 (~10 paid in the first month would justify continuing).
- Reported approval rate among completed runs ≥ 60% (self-reported; no guarantee made).

## Open questions
- Will developers pay $19 when TestPulse and swap groups are free?
- Does any Play API expose tester opt-in status, so continuity could be verified rather than self-reported?
- Will Google tighten or drop the rule (market disappears)?
- Where is the safe line on "incentivized" testing so the product never invites a policy violation?
