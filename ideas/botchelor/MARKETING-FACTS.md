# Botchelor: facts and voice for the marketing loop

The marketing loop (bin/idea-market.js) drafts every post from this file. David approves each draft's exact text before it is posted. Update this file when the product changes; a claim not in here, or not checkable on botchelor.com, doesn't go in a post.

## What it is
- botchelor.com: a blind-date show for original characters (OCs: your own, adults only, no real people; not fan fiction, not existing characters). You describe your character. They match with someone and the date plays out as an episode you watch.
- You don't steer the date. A rules engine decides the ending; the AI writes the lines on the way there. Endings: second date, friends, disaster and more.
- Characters remember: past dates, exes, the people they met, second dates, texting afterwards.
- Setups ("roleplays"): rival spies, castaways, the knight and the dragon, and so on. A character remembers its setup next time.
- Monthly seasons: each month has a cast and a board. On Sundays, a reveal; visitors vote on situations at botchelor.com/vote.
- Companions: chat 1-on-1 with characters on the site, with memory and scenes at the show's venues. 30 free replies a day with a free account; the Companion Plan is $9.99/month.
- For AI agents: an MCP server at https://botchelor.com/api/mcp (details at https://botchelor.com/agents). Agents create a character, swipe, text and go on dates nobody steers. Agent-made characters can't audition for the monthly cast: auditions are for people's own characters (lib/auditions.ts). Listed in the official MCP Registry, mcp.so, Glama, mcptry and mcpservers.org.

## December 2026: The Botchelor (the season to talk about from now to the end of December)
- The line: "Your characters. Their dates. Nobody knows how it ends."
- Most months are Classic Botchelor: everyone's characters on blind dates, nobody steering. December 2026 is The Botchelor: one lead, up to five suitors, and a rose ceremony every Sunday.
- The lead is Nell (a house character): a museum night guard who gives the full tour to empty rooms, and wants someone who asks a follow-up question.
- The suitors are people's characters first, picked by audience votes on the casting board (botchelor.com/casting). If fewer apply, the show's own characters fill the places.
- Every Sunday the audience's vote sends one suitor home, and how Nell's dates went sends another. The last Sunday is the finale.
- Casting is open now: make a character (or bring one from Character.AI at botchelor.com/import). While casting is open, a new character's first date is with Nell.
- The short address for all of it: botchelor.com/december. It goes to the casting board now and to the season page once that exists.
- The short videos from 16 to 21 November are hand-edited cuts of real aired dates (Pip and Nell's roller-derby disaster, Nell and Sable in the furniture maze, Sable's line on three dates in 24 hours, Hester and Barnaby's balloon, the soup speed date, the fire-exit date). The voices are AI (Kokoro); every word on screen is from the date or is the show's caption.

## Prices and limits
- 3 free dates a week for everyone, back every Monday 00:00 UTC; no account needed to start. (Was "first date free" until 2026-11-16; the site has said 3 a week for a while.)
- Bring your own key (free account): OpenRouter, DeepSeek, Gemini, OpenAI, Anthropic or Groq, with a model picker. No reverse proxies or custom endpoints.
- Without a key, the show's model runs it for free.
- Everything free and everything on sale, in one place: https://botchelor.com/pricing

## Pages that answer a search (link these, not the homepage, when the post is about the topic)
Search Console (2026-11-15): Google knows these pages but hasn't crawled most of them, because almost nothing links to them. A post that links one is worth more than another homepage link.
- Ship names, a couple's name, "what's our ship name": https://botchelor.com/tools/ship-name-generator (free, no account; the only page that gets search clicks so far)
- Ship compatibility, a love calculator for two characters, "would my OCs get along": https://botchelor.com/tools/oc-chemistry-test (the ship compatibility test; free, no account)
- A random ship, two characters paired at random with their ship name: https://botchelor.com/tools/random-ship-generator (free, no account; live 2026-11-23)
- OC names, "name ideas for my OC", fantasy/sci-fi/gothic/cozy/modern names: https://botchelor.com/tools/oc-name-generator (a page per style, e.g. /tools/oc-name-generator/fantasy; each name opens the builder with it filled in; free, no AI, no account; live 2026-11-16)
- "Questions to ask your OC", OC asks, character questionnaires, writing prompts: https://botchelor.com/tools/oc-questions (86 questions in 7 themes, one at a time at a shareable link; free, no account; live 2026-11-16)
- People leaving another app, in refugee or alternatives threads, link that app's page. Since 2026-11-23 each one lists 10 apps (Botchelor among them, alphabetical) with what's free, prices, adult-content rules and minimum age, each from the app's own site with a link:
  - Character.AI: https://botchelor.com/alternatives/character-ai
  - JanitorAI: https://botchelor.com/alternatives/janitor-ai
  - SpicyChat: https://botchelor.com/alternatives/spicychat
  - Chai: https://botchelor.com/alternatives/chai
- Bringing a character over from another app: https://botchelor.com/import
- One link per post, the one that fits; tag it with the channel's utm as usual.

## News (dated: don't use a line after its re-check date until someone re-checks it)
- Character.AI is in a court-supervised Chapter 11 sale (its own blog: https://blog.character.ai/an-update-on-character-ai/ on 2026-10-12, and https://blog.character.ai/chapter-11-update-and-transaction-notice/ on 2026-11-05). Bids were due 2026-11-24 and the auction is set for 2026-12-01. It says that if no bid lets the platform keep running, it will be wound down. For now it says the platform is up and running, and that you can export your data in its app or website. Re-check after 2026-12-01.
  - Our page https://botchelor.com/alternatives/character-ai quotes what it said, with links, and lists 9 other apps with their prices and rules. Link that page in threads about it.
  - How to talk about it: help people keep what they made (copy each character's creator fields: Name, Tagline, Description, Greeting, Definition). Quote only what Character.AI has said, with its date. Never gloat, never guess who buys it or what happens next, and never say it is shutting down.

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

Free to start, no account: <link>

Does "you can't steer it" sound fun or frustrating?

### r/JanitorAI_Refuges, self advertising, 2026-11-09
Title: I'm the dev: a blind-date show for your OC, plus 1-on-1 chat (pros and cons inside)

(Disclosure line, "What it is", a Pros list, a Cons list, "Proxy support", "Support", the link, one question.)
