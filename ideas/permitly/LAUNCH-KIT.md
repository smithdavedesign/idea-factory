# Launch kit: permitly (2026-10-12)

Page: https://idea-pages-livid.vercel.app/permitly/ · Decision: 2026-10-24 · Now: 1/50 visitors, 0 signups (both visits so far are "direct")

**You post, by hand, from your own accounts. Nothing here has been posted.** Each post takes about ten minutes.

## Order
1. **BiggerPockets source thread** (today): the exact pain, in the thread where it was found. A question with no link, because BiggerPockets removes self-promotion outside its intro board. This one is for evidence and goodwill; the link comes only if people ask.
2. **r/AirBnBHosts** (tomorrow, weekday evening US time): about 24k hosts and active. This is where the visitors should come from. Check the sidebar rules first.
3. **r/ShortTermRentals** (2–3 days after #2, only if it exists and is active): same post, never on the same day as #2.

Space them a day or two apart, so the source of each spike stays readable. Reddit's app often sends no referrer, so Reddit visits may show as "direct". Logging each post (`/launch permitly posted`) is how they get matched up.

## 1. BiggerPockets: reply in the source thread (no link)
https://www.biggerpockets.com/forums/80/topics/1288562-how-do-you-all-stay-on-top-of-str-permits-rules-across-multiple-properties

**Rules:** "self-promotion is only allowed in" the New Member Introductions forum (BiggerPockets welcome thread). Members report link posts deleted and suspensions, so **no link in this reply.**
**Fits because:** it's the thread the research came from: a multi-city operator tracking renewals in a spreadsheet, worried about fines and delisting.
**Post (a reply):**

> Same here. The renewals are the easy thing to forget because they only come round once a year, and every city words its ordinance page differently, so a generic page-change alert is mostly noise.
>
> For anyone running 3+ units across cities: what do you actually use for this today? Spreadsheet plus calendar, Avalara, something your PMS does? And has a missed renewal or a rule change you didn't catch ever cost you a fine or a listing?
>
> I'm trying to work out whether a simple flat-price tracker (reminders plus "here's exactly what changed on your city's page") would be worth building. Honest answers, including "no, I'd never pay for that", are more useful to me than anything.

**Afterwards:** reply to every answer within a few hours. If someone asks what you're building, the page link is fine in that reply.

## 2. r/AirBnBHosts
https://www.reddit.com/r/AirBnBHosts/ (the real name; "r/airbnb_hosts" in LAUNCH.md is wrong)

**Rules:** not verified from here (Reddit blocks automated reads). Open the sidebar → Rules before posting. If links or self-promotion are banned, post the same question without the last paragraph, and add the link only if someone asks. Ads appear there, but that doesn't mean they're allowed.
**Fits because:** active hosts. Multi-unit operators are the buyer, and renewals and lodging tax come up there.
**Title:** How do you keep track of STR permit renewals and rule changes across more than one city?
**Post:**

> I've got units in a couple of cities, and right now it's a spreadsheet plus calendar reminders. Renewals come once a year, lodging-tax deadlines differ by city, and ordinances change with very little notice.
>
> What do you use? And has missing one ever cost you a fine or a listing?
>
> Full disclosure: I'm testing whether a flat-price tracker is worth building (email reminders before each permit and tax deadline, plus a diff of what actually changed when a city's rule page updates). Rough page here if you want to see it: https://idea-pages-livid.vercel.app/permitly/. Happy to hear it's a bad idea.

**Afterwards:** reply to every comment. Answers like "here's what it cost me" are the strongest demand evidence this test can get.

## 3. r/ShortTermRentals (verify first)
https://www.reddit.com/r/ShortTermRentals/

**Rules:** not verified, and the sub may be small or inactive. If it has fewer than about 2k members or no posts this month, skip it. The name in LAUNCH.md ("r/shortermrentals") looks like a typo.
**Post:** the same as #2, on a different day.

## Dropped
- **r/airbnb_hosts**: wrong name; the active sub is r/AirBnBHosts (#2).
- **r/airbnb**: mostly guests, not operators.
- **BiggerPockets new top-level post with the link**: against its self-promotion rule; the reply in #1 does the job.

## After you post
Run `/launch permitly posted` with where and when, and the post's URL if you have it. That's logged to `launch-log.json`, which feeds the Ideas page and RepoHQ's `get_idea_pipeline`.

Sources checked 2026-10-12: the BiggerPockets thread (HTTP 200); BiggerPockets self-promotion rule (welcome thread, https://www.biggerpockets.com/forums/55/topics/974091-hello-and-welcome-to-biggerpockets?page=3); r/AirBnBHosts size and activity (GummySearch snapshot, https://gummysearch.com/r/AirBnBHosts/, dated).
