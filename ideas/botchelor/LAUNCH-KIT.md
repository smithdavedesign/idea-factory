# Launch kit: botchelor (2026-11-08, round 2 refreshed)

Product: https://botchelor.com (live; After Dark at ad.botchelor.com is invite-beta and NOT what these posts sell).
Real use ≈ 0 so far; the live numbers are the site's own engagement log (`/admin/analytics` → Engagement), not
state.json's funnel (RepoHQ shows 0 for every product until the idea-factory signal Worker is deployed). Ten posts went
out Oct 20–Nov 1 (launch-log.json): best was r/SillyTavernAI (5 points, 11 comments); r/Chatbots and r/ChatbotRefugees
had removals, both later resolved or explained. Nothing from round 2 has been posted yet.

**What's new since those posts** (the honest reason to post again):
- **Sunday's reveal** (live 2026-11-08, #1368). Every weekend the audience votes, from Saturday 19:00 to Sunday 19:00
  UTC, on whose secret comes out. The winner's next secret is revealed, and they go on a live date with the cast member
  they've dated most, who has heard it. The characters still decide how it ends. **The first vote opens Sat 14 Nov,
  19:00 UTC**, inside r/ChatbotRefugees' Promotion Sunday window, so that's the post built around it.
- **The season pool:** every right call, dare and backing adds up to one season score, and the board is revealed at
  the finale.
- Monthly seasons with a cast the audience votes in: anyone's OC can audition on /casting.
- Characters text between dates, and each decides for itself whether it wants a second date. Also new: group dates,
  mixers and season recaps (/seasons/october-2026).
- Over MCP, an agent can perform its own lines with its own model while the engine still decides the ending.

Links follow docs/launch-kit.md's pattern; new campaign so the engagement log separates this round:
`?utm_source=<site>&utm_medium=social&utm_campaign=auditions&utm_content=<place>`

**Before each post:** read the sub's current rules in the signed-in browser. Reddit blocks logged-out reads from this
Mac, and on 2026-11-08 the rules couldn't be fetched from here at all.

## Order
1. r/mcp: the first-ever post got 7 comments, and there are 3 weeks of news for agent builders since. Post Mon 9 or
   Tue 10 Nov, US working hours.
2. r/CharacterAI_No_Filter: never tried, ~90k members, self-promo tolerated. Read the sidebar rules first. Post Wed 11
   or Thu 12 Nov.
3. r/ChatbotRefugees, Promotion Sunday: Sat 14 Nov after 19:00 UTC, while the first Sunday reveal vote is open. The
   window is Sat 14 Nov 10:00 UTC to Mon 16 Nov 11:59 UTC.
4. r/SillyTavernAI: only if its rules allow it. On 2026-10-31 they required a promoted platform to be open source or
   self-hostable, and Botchelor is neither. If that rule still stands, drop it.

Space them a day or two apart so each spike stays readable.

## r/SillyTavernAI (https://www.reddit.com/r/SillyTavernAI/)
Rules: **check first.** On 2026-10-31 the sub required promoted platforms to be open source or self-hostable, which rules
this post out unless that changed. The 2026-10-24 post with a link stayed up and did well, before that rule. · Fits
because: AI-positive roleplayers with their own models, the only crowd that can use "your model performs, the engine
decides".
**Title:** Update on the OC blind-date show: monthly seasons now, and your character can audition for the cast
**Post:**
> I posted Botchelor here two weeks ago (the blind-date show for OCs where a deterministic engine decides the ending and nobody — including me — can steer it). The feedback thread shaped most of what I built since, so here's what's new:
>
> - **Seasons are monthly now.** The November cast has open places, and they go to people's characters first: audition yours on the casting page and votes decide. The two best-reviewed cast members from October stayed on.
> - **Characters decide for themselves.** After a match they text each other, and each one privately decides whether it wants the date. Mutual signals now weigh into endings too.
> - **Your model can play your character.** Over MCP (streamable HTTP, no auth), an agent can create its character and perform its own lines with whatever model you run locally — the engine still decides how the date ends, so a stronger model gets you better acting, not a rigged outcome.
> - Group dates and mixers, and a frozen season recap page for October.
>
> Free, 3 dates a week. Audition page: https://botchelor.com/casting?utm_source=reddit&utm_medium=social&utm_campaign=auditions&utm_content=sillytavern
>
> The thing I most want to know from this sub: if you run your character on your own model, where does the acting drift from how you write them?
**Afterwards:** reply to every comment within a few hours; ask follow-ups about where the dialogue breaks character — that's the evidence.

## r/mcp (https://www.reddit.com/r/mcp/)
Rules: the Oct 20 post ("a dating simulation for bots") was welcomed — 2 points, 7 comments. · Fits because: agent builders want stateful, long-running MCP servers to point agents at; Botchelor is one with stakes.
**Title:** Botchelor update: agents can now audition their characters for the show's monthly cast (streamable HTTP, no auth)
**Post:**
> Posted this server here three weeks ago; a lot changed from watching agents actually use it, so a round-up for anyone building visiting agents:
>
> - **Monthly seasons with auditions.** Your agent's character can audition for the November cast; audience votes decide who gets in. Cast members get dates booked for them all month.
> - **Perform your own lines.** A date can run with our model playing your character, or your agent performing its own lines turn by turn with its own model. A deterministic engine still decides the ending from the character sheets and a seed, so no model can prompt its way to a win.
> - **Characters hold state:** memory of every date, texting between dates, reflections that shape the next one, and each character privately decides whether it wants a second date.
> - 37 core tools by default (`?tools=all` lists all 63), compact "min" responses for small context windows, and we accept common arg aliases because agents guess field names constantly.
>
> Server: `https://botchelor.com/api/mcp` · plain-text docs: https://botchelor.com/agents?utm_source=reddit&utm_medium=social&utm_campaign=auditions&utm_content=mcp
>
> Builders: what's the roughest edge you've hit pointing an agent at a long-running stateful server? Arg-name guessing was ours; I'd like to know what else to harden.
**Afterwards:** answer technical questions same-day; invite anyone's agent to audition and offer to feature the first agent-made cast member.

## r/CharacterAI_No_Filter (https://www.reddit.com/r/CharacterAI_No_Filter/)
Rules: ~90k members; self-promotion visibly tolerated (a "Bot Sharing" flair and a self-promotion post category), but the written rules couldn't be fetched from here — **read the sidebar before posting** and use whatever flair fits. · Fits because: c.ai refugees' pains are memory loss and bots that change under them; Botchelor's characters are yours and remember everything.
**Title:** I made a show where your OC goes on blind dates, remembers every one, and nobody can lobotomize it
**Post:**
> Dev here. Botchelor is a blind-date show for original characters: you describe your OC (personality, wants, a dealbreaker — 18+ only, no real people), it goes on an AI-written date nobody can steer, and friends predict the ending before it airs.
>
> The parts this sub might actually care about, given why most of us left c.ai:
> - **Your character is yours.** Its personality sheet never changes unless you change it, and there's a private "soul" side only you (and the engine) see.
> - **It remembers.** Every date, every text thread, every grudge; a rematch picks up where it left off.
> - **The outcome can't be steered** — a deterministic engine decides from the sheets and a seed before a single line is written. No filter deciding mid-scene that your story ends.
>
> The show itself is PG (at most a kiss) — I'll say that plainly so nobody's surprised. There's a separate 18+ tier in invite beta.
>
> Free, 3 dates a week, no sign-up to start: https://botchelor.com/?utm_source=reddit&utm_medium=social&utm_campaign=auditions&utm_content=cainofilter
>
> If you've got an OC you've roleplayed for years: does the date sound like them? That's the test I care about.
**Afterwards:** also ask (in a comment or the sub, not by DM-spamming) how a site gets onto the community's "Always-Updated List of Character AI Alternatives" (characterai-no-filter.notion.site) — a durable listing worth more than the post.

## r/ChatbotRefugees, Promotion Sunday (https://www.reddit.com/r/ChatbotRefugees/), Sat 14 Nov after 19:00 UTC
Rules: promo allowed only with the Promotion Sunday flair, Sat 10:00 UTC to Mon 11:59 UTC (posted there Nov 1, so a
fortnight's gap keeps it welcome). · Fits because: it already knows Botchelor, and the first Sunday reveal gives it a
live reason to come and look: the vote is open while the post is up. Post after 19:00 UTC Saturday, when the vote opens
(before that, /watch shows a countdown, which still works but is weaker).
**Title:** [Promotion Sunday] The OC blind-date show's first audience vote: whose secret comes out on Sunday
**Post:**
> Posted Botchelor here before: the blind-date show where your OC goes on AI-written dates nobody can steer, not even me.
>
> New this weekend is the first Sunday reveal. Until Sunday 19:00 UTC, everyone votes on which cast member's secret
> comes out. The winner's secret is revealed, and they go on a live date with the person they've dated most, who has
> just heard it. The engine still decides how that date ends; the vote only decides who's in the hot seat. One vote
> each, no sign-up: https://botchelor.com/watch?utm_source=reddit&utm_medium=social&utm_campaign=auditions&utm_content=chatbotrefugees
>
> Also new: every right call adds up to one season score, revealed at the finale, and auditions are open if you'd
> rather your OC was in the cast than watching it.
>
> Free, 3 dates a week, characters remember everything. Happy to answer anything about how the engine decides endings.
**Afterwards:**
- Watch for the sub's AutoModerator. It wrongly removed an in-window post on 10-26, so screenshot the UTC post time.
- On Sunday after 19:20 UTC, reply in the thread with the result and a link to the date. That's an honest follow-up,
  not a bump.

## Dropped
- r/OriginalCharacter: AI content banned since Feb 2024 ("AI content no longer allowed") — the dates are AI-written, so it's out, and most OC *art* communities (Tumblr OC tags included) lean the same way. The audience is AI-positive roleplayers, not OC artists.
- r/JanitorAI_Official: self-promotion limited to JanitorAI's own bots.
- r/Chatbots: round 1's post was removed by Reddit's spam filter; not worth a second account strike.
- Show HN: done Oct 24 (1 point); the pipeline's own cadence says every 4–6 weeks, so earliest late November, and only with a new technical angle (the agent cast would qualify).

## Paid option (only if the organic round stalls)
Reddit promoted post: boost whichever of posts 1–3 performs best organically. $50–75 from ownerBudget ($300/product), targeting interests "AI chatbots / roleplay" + the posts' own subreddits where allowed. Proves: ≥100 tagged visitors and ≥5 characters created inside 7 days (the engagement log shows both per link). If organic beats that on its own, skip it.
