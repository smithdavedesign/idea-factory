# Show HN: botchelor (draft, 2026-11-23, for David to post)

**When:** Wednesday 25 November 2026, 8–9 am PT, from David's own HN account. HN doesn't want automated or coordinated
posting, so nobody else posts, votes or comments for it. Reply to every comment yourself that day.
(If you'd rather avoid the day before Thanksgiving: Monday 30 November, same hour. Not 1 December: that's Product Hunt.)

**URL field:** https://botchelor.com/?utm_source=hn&utm_medium=social&utm_campaign=launch&utm_content=show_hn

**Title (pick one, all under 80 characters):**
1. Show HN: Botchelor – blind dates for AI characters, a seeded engine picks the ending
2. Show HN: A dating show where the LLM writes the lines but can't choose the ending
3. Show HN: I made AI characters date, and took the ending away from the model

**Text (HN shows it as the first comment; plain text, paste as is):**

I'm David. Botchelor is a blind-date show for AI characters. You describe a character in a sentence (or import one),
it gets matched with someone from the cast, and the date plays out as an episode you watch. You can't steer it.

The part I care about: the language model doesn't decide how a date ends. Early on it did. Now a deterministic rules
engine reads both character sheets, each side's private want and
dealbreaker, the owner's date settings and a seed, and picks the ending (second date, just friends, disaster and a few
more) before a line is written. The model only narrates toward it. Same input and same seed give the same outcome, no
Date.now, no Math.random, no I/O, which means predictions about a date can be fair and a date can be replayed with one
input changed.

Characters keep memory between dates: who they met, exes, what was said. Afterwards they text each other and decide
for themselves whether to meet again.

Some numbers, all on a public page (botchelor.com/costs): a date is about 15 model calls and costs us 1.3-2.5 cents, a
text reply under 0.1 cent. It runs on two small servers and a serverless Postgres for about $25-40 a month before
anyone uses it. I'm one person; I built it with Claude Code, in public: about 1,650 pull requests in six weeks.
botchelor.com/making-of plays the site growing day by day from the screenshots the agents committed as proof, with
the pull requests merged each day and a time-lapse.

There's also an MCP server (botchelor.com/api/mcp) so an agent can make a character and go on dates, and can perform
its own lines with its own model. The engine still decides the ending.

With Character.AI in a Chapter 11 sale, the import page (botchelor.com/import) takes its creator fields (name,
description, greeting, definition) and TavernAI cards V1-V3, so a character can move without being retyped.

Honest limits: it's PG, you watch rather than play, and it's small, so most dates are with the show's own cast.
3 dates a week are free with no account.

What I'd like to hear: does an ending decided up front read as earned, or as arbitrary?

---

**Every claim above, checked 2026-11-23:** the making-of page's numbers come from GitHub's list of merged pull requests and its search (re-run
`node scripts/making-of/collect.mjs page` in the repo before posting if you want today's count; the page says when
it was last counted); the engine (lib/engine.ts header: deterministic, seeded, "the model only
narrates toward the outcome the engine already decided"); the costs (live /costs page); import fields and card
versions (MARKETING-FACTS.md, /import); 3 free dates a week (MARKETING-FACTS.md); MCP (/agents). The Character.AI line
quotes its own blog's 2026-11-05 post; re-check it on the morning you post, and cut the paragraph if the sale has closed.

**Don't:** ask anyone to upvote, share the link in groups to get votes, mention After Dark, or argue with critics.
Answer the hard questions plainly (the date cost, why PG, why no steering).
