# playclear — research

## Summary
Solo Android developers with a personal Google Play account (created after 2023-11-13) must keep 12 testers opted in for 14 straight days, then pass a human-reviewed production-access form. Friends and swap-group testers install once and vanish, the clock stalls or restarts, and Google rejects for "insufficient engagement" with no appeal. playclear is a $19 one-time kit that keeps the developer's OWN testers active (daily micro-tasks, reminders), logs the evidence, and drafts the production-access answers from that log. It deliberately does not sell testers.

## Evidence of the problem
- Google's own rule: personal accounts created after November 13, 2023 need a closed test with at least 12 testers opted in continuously for 14 days; testers who opt out and back in must have 14 consecutive days; Google may require more testing for "fewer than 12 opted-in testers or insufficient tester engagement"; review is "usually seven days or less" and is "not a troubleshooting step". Source: https://support.google.com/googleplay/android-developer/answer/14151465?hl=en
- Rejection reasons reported by a tester-service vendor: incomplete production-access form, no app updates after tester feedback, testers who did not really use the app; advice to ship at least 3 closed-test releases in the 14 days and write long form answers. Source: https://testerscommunity.com/blog/google-play-production-access-rejected
- A developer's account of losing 6 weeks: two rejections caused by friends and Reddit/Discord testers who "installed once and left", no visibility into who was active, tester-exchange communities "hit or miss". Source: https://dev.to/chakshusoft/i-wasted-6-weeks-on-google-plays-closed-testing-heres-what-finally-worked-41h8 (the author also promotes their own free SDK, and states a "20 testers" number that conflicts with Google's page, so treat details with care).
- Search results show a steady stream of write-ups on the pain: "The 12 tester tax: Google Play's closed testing rule is quietly killing solo devs" (https://levelup.gitconnected.com/the-12-tester-tax-google-plays-closed-testing-rule-is-quietly-killing-solo-devs-2cea83c2e338 — only the search snippet was readable, page returned 403), "Google Play production access rejected: why and fixes" (https://www.indiehackers.com/post/google-play-production-access-rejected-why-fixes-1efcef20e8), and a Gemini-API app developer saying production access is blocked because backend work is invisible to review (https://discuss.ai.google.dev/t/my-app-uses-gemini-api-and-google-play-is-blocking-production-access-backend-work-invisible-to-their-review-system/166915). Titles/snippets only; I did not read the Reddit threads themselves.

## Who pays
- **Buyer:** a solo or indie Android developer (or a no-code app builder shipping for clients) with a personal developer account who is mid-test or just rejected. Organization accounts are exempt, so the segment is personal accounts only.
- **Price point:** $19 one-time per app (proposed by me, not observed). Anchor: Testers Community's Pro plan is "$25 and gives you 25 testers within 6 hours, plus form answers and a feedback report" (https://testerscommunity.com/blog/google-play-production-access-rejected).
- **Evidence they pay for a workaround today:** Fiverr gigs sell "12 closed testers" with a "guaranteed Play Store release" and a gig "fix Google Play closed testing rejection and production access" (https://fiverr.com/zero_log/provide-12-closed-testers-and-guarantee-play-store-release, https://fiverr.com/webinsiders/fix-google-play-closed-testing-rejection-and-production-access — both returned 403 to my fetch, so their prices are unknown; I only saw the titles in search results). GoodBarber sells a service that publishes the app under its own account to sidestep the rule (https://www.goodbarber.com/help/goodbarber-takes-care-gbtc-publication-service-r80/publish-your-android-app-with-a-google-play-personal-account-gbtc-service-a429/, snippet only).
- **Honest caveat:** this is developers, the segment the reviewer has flagged as expecting free tools. The counter-evidence is that paid services exist and the pain is a hard, dated blocker (no launch without it), but willingness to pay for a self-serve kit is unproven.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Testers Community (paid + free app) | Pro $25 (25 testers, form answers, feedback report); free app promises 12 testers in 36h | Supplies testers (policy-grey; Google's page is silent on paid testers); not a tool for your own testers |
| Fiverr tester gigs | unknown (page blocked) | Human service, quality varies, same policy ambiguity |
| TestPulse (free SDK, dev.to author) | free | Needs SDK in the app; tracks sessions but doesn't run the tester-nudging or draft the form |
| Tester-exchange communities | free | "Hit or miss"; install-and-leave |
| GoodBarber publication service | unknown | Publishes under their account; only for their builder |
| Doing it manually | free | Spreadsheet of testers, WhatsApp nudges, form written from memory |

## Technical notes
- No Play Console API exposes the closed-test tester list or opt-in status that I could verify, so the tool can't read it; it tracks self-reported daily check-ins on a link the developer sends to their own testers, plus the developer pasting tester emails. Open question whether Play Developer API gives any test-track data; verify before M2.
- Stack is a small web app: tester check-in page (no login, magic link), reminder email/WhatsApp-link, evidence log, template-driven answer drafter. An LLM is optional; templates plus the logged facts (releases shipped, feedback received, changes made) may be enough.
- Zero cost: Vercel Hobby, free-tier DB, Resend free tier.

## Risks & open questions
- Google may change the rule (counts, length, organisation exemption) or add first-party tooling; the whole market exists because of one policy.
- Policy ambiguity around "incentivized" testing: the tool must never pay or fake testers, only prompt real people the developer recruited.
- Fake or bot check-ins would be misconduct; the product must record only genuine self-reported actions and warn that Google judges real in-app engagement (Android vitals), not the tool's log.
- Cannot guarantee approval; selling "guaranteed release" like Fiverr is off the table. Refund policy needed.
- One-time $19 with a seasonal-ish, per-developer one-use need: low repeat revenue; needs search/community reach (r/androiddev, dev.to, IndieHackers).
- Free alternatives (TestPulse, swap groups) cap the price.

## Sources
- https://support.google.com/googleplay/android-developer/answer/14151465?hl=en
- https://testerscommunity.com/blog/google-play-production-access-rejected
- https://dev.to/chakshusoft/i-wasted-6-weeks-on-google-plays-closed-testing-heres-what-finally-worked-41h8
- https://levelup.gitconnected.com/the-12-tester-tax-google-plays-closed-testing-rule-is-quietly-killing-solo-devs-2cea83c2e338
- https://www.indiehackers.com/post/google-play-production-access-rejected-why-fixes-1efcef20e8
- https://discuss.ai.google.dev/t/my-app-uses-gemini-api-and-google-play-is-blocking-production-access-backend-work-invisible-to-their-review-system/166915
- https://fiverr.com/zero_log/provide-12-closed-testers-and-guarantee-play-store-release
- https://fiverr.com/webinsiders/fix-google-play-closed-testing-rejection-and-production-access
- https://www.goodbarber.com/help/goodbarber-takes-care-gbtc-publication-service-r80/publish-your-android-app-with-a-google-play-personal-account-gbtc-service-a429/
