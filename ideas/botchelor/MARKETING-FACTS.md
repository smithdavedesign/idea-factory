# Botchelor: facts and voice for the marketing loop

The marketing loop (bin/idea-market.js) drafts every post from this file. David approves each draft's exact text before it is posted. Update this file when the product changes; a claim not in here, or not checkable on botchelor.com, doesn't go in a post.

## What it is
- botchelor.com: a blind-date show for original characters (OCs: your own, adults only, no real people; not fan fiction, not existing characters). You describe your character. They match with someone and the date plays out as an episode you watch.
- You don't steer the date. A rules engine decides the ending; the AI writes the lines on the way there. Endings: second date, friends, disaster and more.
- Characters remember: past dates, exes, the people they met, second dates, texting afterwards.
- Setups ("roleplays"): rival spies, castaways, the knight and the dragon, and so on. A character remembers its setup next time.
- Monthly seasons: each month has a cast and a board. On Sundays, a reveal; visitors vote on situations at botchelor.com/vote.
- Companions: chat 1-on-1 with characters on the site, with memory and scenes at the show's venues. 30 free replies a day with a free account; the Companion Plan is $9.99/month.
- For AI agents: an MCP server at https://botchelor.com/api/mcp (details at https://botchelor.com/agents). Agents create a character, swipe, text, go on dates nobody steers, and can audition for the monthly cast. Listed in the official MCP Registry, mcp.so, Glama, mcptry and mcpservers.org.

## Prices and limits
- First date free, no account needed.
- Bring your own key (free account): OpenRouter, DeepSeek, Gemini, OpenAI, Anthropic or Groq, with a model picker. No reverse proxies or custom endpoints.
- Without a key, the show's model runs it for free.
- Everything free and everything on sale, in one place: https://botchelor.com/pricing

## Honest cons (use them; refugee subs require them)
- Dates and companion chat are PG. No NSFW.
- You watch the date; you don't play it.
- New and small: the dating pool is mostly the show's own cast.
- The Discord server is brand new and small.
- Companion chat past 30 replies a day costs $9.99/month.

## Support
- Discord: https://discord.gg/8VDdRF9YU (feedback, bugs, sharing dates).
- support@botchelor.com, or a reply to the post.
- Questions people ask: https://botchelor.com/faq · where each kind of question goes: https://botchelor.com/contact
- Press kit (boilerplate, facts, logo, screenshots, colours): https://botchelor.com/press
- Security reports: https://botchelor.com/security (and /.well-known/security.txt)

## Our accounts
- Reddit u/Outside_Sir_9341 · X @botchelorLLC · Bluesky @botchelor.bsky.social · TikTok @botchelorcom · Discord https://discord.gg/8VDdRF9YU

## What David can speak to (help answers only)

Help answers are plain participation in a community: no link, no product, nothing to sell. Answer only from this real experience:
- Building a web app solo with AI coding tools (Claude Code): what it's good at, where it goes wrong, reviewing what it writes, tests and checks before merging.
- Next.js (App Router) with TypeScript and Postgres; moving hosting off Vercel to DigitalOcean App Platform to control cost; slow pages from a database in a different region than the app.
- Keeping LLM costs near zero: free-tier models, per-day caps, budgets per feature, local models (Ollama) on a 16 GB Mac.
- Building a remote MCP server (Streamable HTTP) and getting it listed: the official MCP Registry, mcp.so, Glama, mcpservers.org, LobeHub, awesome lists; making tool descriptions agents actually understand.
- Launching as a solo dev on Reddit: self-promo rules, flairs, posts removed by automod, disclosure; tracking where visitors come from (UTM links, first-party analytics); having near-zero users and being honest about it.
- Stripe subscriptions for a small app.

He doesn't have experience with fundraising, hiring, running a team, paid ads at scale, or big revenue: don't answer as if he does.

## Voice
- First person, as the one developer who built it. Plain words, short sentences, no hype, no emoji in Reddit posts.
- Open with the disclosure: "Disclosure: I built this. One-person project, built with AI coding tools (Claude Code)."
- One concrete detail beats three adjectives. End with one real question for that community.
- Never the same text on two communities. Match each community's own format and rules.
- Links carry the tag the loop gives you; use it exactly.

## Never
- Never mention After Dark or anything 18+ outside spaces explicitly for it (none are in marketing.json).
- No vote-asking, no DMs, no fake accounts, no pretending to be a user.
- No claims about traction, users or revenue that aren't true. Real use is still small; say so if asked.
- No real people as characters, no minors.
- No "date my OC" links (botchelor.com/date/<code>): they only work for a visitor who already has a character. Chud's link (2026-10-29) brought 3 visitors and all 3 left within 6 seconds (2026-11-11 bounce review). To point people at a date, name a house character: https://botchelor.com/create?meet=house-juniper (any house id on this month's cast at botchelor.com/cast; a first character's first date is with them and plays at once). Never name Chud in a post.

## Posts David approved (examples of the voice)

### r/ChatbotRefugees, Promotion Sunday, 2026-11-01 (9 points, 4 comments: best so far)
Title: I'm the dev: your OC goes on a blind date you can't steer (free, no sign-up)

Disclosure: I built this. One-person project, built with AI coding tools (Claude Code).

You describe your OC (adults only, your own, no real people), they match with someone, and the date plays out as an episode you watch. You don't steer it: a rules engine picks the ending, the AI writes the way there. Pick a setup if you like (rival spies, castaways, the knight and the dragon), and your character remembers it next time.

First date free, no account: <link>

Does "you can't steer it" sound fun or frustrating?

### r/JanitorAI_Refuges, self advertising, 2026-11-09
Title: I'm the dev: a blind-date show for your OC, plus 1-on-1 chat (pros and cons inside)

(Disclosure line, "What it is", a Pros list, a Cons list, "Proxy support", "Support", the link, one question.)
