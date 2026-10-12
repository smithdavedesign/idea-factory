# Launch kit: permitly

Written 2026-10-11 by the launch skill. **You post, by hand, from your own accounts. Nothing here has been posted.**

Page: https://idea-pages-livid.vercel.app/permitly/

Status at writing:
- 1 visitor and 0 signups. 49 more visitors are needed before the test can be judged (minimum 50).
- The decision date is 2026-10-24, 13 days away.
- No launch posts have been logged yet.

Each post takes about ten minutes. Do #1 first: it's the thread where the pain was found.

## 1. BiggerPockets: reply in the source thread (best)

- **Where:** https://www.biggerpockets.com/forums/80/topics/1288562-how-do-you-all-stay-on-top-of-str-permits-rules-across-multiple-properties
- **Checked 2026-10-11:**
  - The thread exists. It has 113 views and one reply.
  - The person who asked tracks renewals in a spreadsheet with calendar reminders, and is worried about fines or a pulled listing.
  - The one reply suggests Avalara for lodging tax, reminders at 60/30/14 days, and Visualping or Distill on each city's ordinance page.
- **Rules:** the thread page shows no self-promotion rule. Read the forum Rules page (footer) before posting. If it bans links, post without the last line.
- **Post (a reply):**

> Same problem here: the renewals are the easy part to forget because they only come up once a year, and each city words its ordinance page differently, so Visualping alerts are mostly noise. Curtis's 60/30/14-day reminders match what I've seen work.
>
> I'm testing whether a flat-price tracker is worth building: you list your properties and cities, it emails renewal and lodging-tax reminders, and when a city's rule page changes it shows what actually changed rather than "the page changed". Rough page here: https://idea-pages-livid.vercel.app/permitly/
>
> Honest question for anyone running 3+ units: what do you use today, and has a missed renewal ever cost you a listing?

## 2. r/airbnb_hosts

- **Where:** https://www.reddit.com/r/airbnb_hosts/
- **Not verified:** Reddit blocks automated fetches from this Mac, so I couldn't check that the sub exists, its size or its rules. Open `/about/rules` first. If self-promotion or links are banned, post the question without the link, or skip it.
- **Title:** How do you keep track of STR permit renewals across more than one city?
- **Body:**

> I run units in a couple of cities and it's a spreadsheet plus calendar reminders right now. Renewals come once a year, lodging-tax deadlines differ by city, and ordinances change without much notice.
>
> I'm testing whether a simple flat-price tracker is worth building (reminders, plus a diff of what changed when a city's rule page is updated): https://idea-pages-livid.vercel.app/permitly/
>
> What do you use today? Has missing one ever cost you a fine or a listing?

## 3. r/shortermrentals (check the name)

- **Where:** https://www.reddit.com/r/shortermrentals/ is the name in LAUNCH.md. It may be a typo for r/shorttermrentals. I couldn't verify either from here, so open both and use the one that's active.
- **Same rule check as #2.**
- **Post:** the same as #2. Post it on a different day from #2, never the same text in two places on one day.

## After you post

Tell Claude `/launch permitly posted`, with where and when. It logs the post to `launch-log.json`, so visitors can be traced to each channel.

**About tracking:** the page records the referring site. Reddit's app often sends none, so those visits show as "direct".
