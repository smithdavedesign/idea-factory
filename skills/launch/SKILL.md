---
name: launch
description: |
  Get a validating idea's landing page, or a built product that's live, in front of the people who have the problem: check each
  channel in LAUNCH.md exists and allows the post, find better ones from the research, write a post
  per channel in that community's own style, and log what David actually posted so visitors can be
  traced to a channel. David posts; this skill never does. Use for "launch <idea>", "/launch <slug>",
  "where should I post permitly", "help me get visitors", "how's the launch going", or when a demand
  test is short of the visitors it needs, or a built product is live and needs its first users (the
  road-to-revenue checklist's "Launch posted" step). Works on ideas in /Users/davidsmith/idea-factory/ideas/<slug>/.
---

# Launch (distribution for a demand test or a live product, at no cost)

A demand test needs `policy.validation.minVisitorsToJudge` unique visitors (50) inside the window
(14 days), or the idea is extended once and then parked untested. Getting those visitors is the
weakest link in the system and the one step that's David's. Your job is to make it a ten-minute
task: verified channels, posts ready to paste, a log of what went out.

**Hard rules:**
- **David posts, by hand, from his own accounts.** Never post, comment, vote, DM or sign up anywhere
  yourself, even if a tool would let you.
- **Honest only:** say it's something being tested, as the builder. No fake accounts, no pretending to
  be a customer, no vote requests, no reposting the same text to many places on one day.
- **Respect each community's rules.** If a place bans self-promotion, the post asks the question
  and adds no link, or the place is dropped. Never suggest working around a rule.
- **No spending:** no ads, boosts or paid listings.
- **The record only grows:** don't edit or shorten `LAUNCH.md`, `REVIEW.md` or anything the pipeline
  wrote. You write `LAUNCH-KIT.md` and `launch-log.json` only.

## Modes

- `/launch <slug>` (default): prepare the kit (steps 1–4).
- `/launch <slug> posted`: log what David posted (step 5).
- `/launch <slug> status`: how it's going and what to do next (step 6).
- No slug: call `get_idea_pipeline` (or read every `ideas/*/state.json`) and pick the validating
  idea furthest behind on visitors. Say which one and why.

## 1. Read the idea

From `/Users/davidsmith/idea-factory/ideas/<slug>/`:
- `state.json`:
  - **validating** (stage `validate`): launch the demand-test page. Note `page.url` and `validation.decideAfter`.
  - **built** (stage `building` or `live`): launch the product itself. Its URL is the checklist's live URL (`state.launch` → the `deployed` step's evidence). If it isn't live yet, say so and stop: getting it live comes first ("Get it launch-ready" on the Ideas page, or the go-live build).
  - Any other stage: say so and stop.
- `REVENUE.md` / `revenue.json` (a built idea): who pays, the price, `launchChannels` and `firstTenUsers`. Start from those channels instead of `LAUNCH.md`'s.
- `LAUNCH.md` and `review.json` → `launch` (channels and post) and `landing` (headline, audience).
- `RESEARCH.md`: the evidence threads, plus who pays and where they talk. **The thread the pain was found in is
  usually the best first channel**, and replying there is better than a new post.
- `idea.json` and `PRD.md`, for the one-line pitch.

Then get the live picture: the MCP tool `get_idea_pipeline` with the slug (repohq server) gives
visitors, signups, days left, visitors by source, posts already logged and, for a built idea, its road
to revenue (`state.launch`). The go-live build adds a visit beacon, so a live product's visitors count too. If the tool isn't
available, use `state.json` → `signals` (a demand test) or `funnel` (a built product: visitors, activations and Buy clicks
for the last 7 days, the 7 before and all time, and the week's top sources), and `launch-log.json`.

## 2. Check and widen the channels

For each channel in `LAUNCH.md`, plus up to three more you find from the research (forums, subreddits,
Facebook groups, Slack or Discord communities, newsletters that take reader questions, Indie Hackers,
Show HN only if the users are developers):
- **It exists and is active:** fetch it. For a subreddit, `https://www.reddit.com/r/<name>/about.json`
  gives subscribers, and `/about/rules.json` gives the rules. A wrong name is common; find the real one.
- **What it allows:** self-promotion rules, required flair, a weekly promo thread, karma or age
  limits, link rules. Quote the rule that decides it.
- **Fit:** are the people there the buyer in `RESEARCH.md` → "Who pays", and do they talk about this pain?

Rank them, and keep **three to five**. Two good places beat ten weak ones.

## 3. Write one post per channel

Start from the `LAUNCH.md` post, then fit each place:
- **Lead with the problem in the reader's words**, and ask a real question you want answered ("what do
  you use today, and what did missing it cost you?"). The answers are evidence too.
- Say plainly that you're building it and testing interest.
- Use the place's format: a title plus body for Reddit and forums, one or two lines for X, a reply
  that answers the original question first for the source thread.
- **The link:** `page.url` (or the product's live URL) exactly as written, or no link where the rules forbid one. Don't
  invent tracking parameters: the page records `document.referrer`, so the source shows up by site
  where the browser sends it. Reddit's app and many mobile clients send none, so their visits count
  as "direct".
- No hype words, no emoji walls, no fake urgency. It should read like David asking peers.

## 4. Write `LAUNCH-KIT.md`

In the idea's folder, overwriting any earlier kit:

```markdown
# Launch kit: <slug> (<date>)

Page: <url> · Decision: <decideAfter date> · Now: <visitors>/<minVisitorsToJudge> visitors, <signups> signups

## Order
1. <channel>: <why first> (post on <weekday, time window in the community's time zone>)
2. …
Space them a day or two apart, so the source of each spike stays readable.

## <channel> (<url>)
Rules: <the rule that matters, quoted> · Fits because: <one line>
**Title:** …
**Post:**
…
**Afterwards:** reply to every comment within a few hours; that's where the demand evidence is.

## Dropped
- <channel>: <why: doesn't exist, bans promotion, wrong audience>
```

Then show David the order and the first post in the chat, and tell him to run
`/launch <slug> posted` after posting.

## 5. Log a post (`/launch <slug> posted`)

Ask which channel, and for the post's URL if he has it. Then append to
`/Users/davidsmith/idea-factory/ideas/<slug>/launch-log.json`, creating it if it's missing:

```json
{ "posts": [ { "channel": "r/airbnb_hosts", "url": "https://www.reddit.com/r/airbnb_hosts/",
               "postUrl": "https://www.reddit.com/r/airbnb_hosts/comments/…", "postedAt": "<ISO time>",
               "note": "optional: removed by mods, reworded, etc." } ] }
```

Keep every earlier entry. `get_idea_pipeline` reads this file, and so does the road-to-revenue
checklist: its "Launch posted" step turns green with the first logged post.
Log the post to the system log as well:
`/Users/davidsmith/ai-stack/bin/emit-event idea-factory launch post info "<slug>: posted to <channel>"`.

## 6. Status (`/launch <slug> status`)

Using `get_idea_pipeline` with the slug:
- visitors and signups against the bar, and the days left;
- visitors by source next to the posts logged: which channels brought people, and which brought none;
- **next step**, one of:
  - the next channel from the kit;
  - a follow-up in a thread that's getting replies;
  - "enough visitors, wait for the decision";
  - "it's converting below the bar with enough visitors: this is the answer, let it pass".

  Don't suggest more posting to rescue an idea that has had real traffic and no signups.
