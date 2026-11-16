# Botchelor: backlink targets and ready-to-paste copy

Drafted 2026-11-16. Nothing here has been submitted, posted or sent. Each target was checked live on 2026-11-16 (submit page fetched, or the GitHub repo read through the API).

Already done or covered, so not repeated here: official MCP Registry, Glama, LobeHub, mcptry, MCP Rush, M8ven, mcp.so, mcpservers.org, Product Hunt (drafted), Reddit and Show HN (LAUNCH-KIT), Uneed (queued for Jun 2027), DevHunt (MCP, free queue), Peerlist (waiting on ID), `punkpeye/awesome-remote-mcp-servers` PR #4221 (open, labels `endpoint-ok`, `has-connector`), the TAAFT monthly X thread, and the r/CharacterAI_No_Filter Notion masterlist (modmail sent 2026-11-08; that is the route onto it).

Facts used in the copy come from botchelor.com/pricing, /press, /llms.txt, /alternatives/character-ai and the two /tools pages, as fetched on 2026-11-16. Two notes:
- The site says **3 free dates a week** (back every Monday 00:00 UTC). MARKETING-FACTS.md still says "first date free". The copy follows the site.
- `/tools/oc-name-generator` and `/tools/oc-questions` return **404** today, so they aren't linked anywhere below. Add them once they're live.
- No copy mentions After Dark or anything 18+, as MARKETING-FACTS.md requires. Every listing describes the public PG show only.

On links: GitHub adds `rel="nofollow"` to README links, so the awesome lists pass no PageRank. They are still worth doing. Google and LLM crawlers read them, they send referral visits, and other directories copy from them. For GitHub lists, use the clean URL (maintainers often strip tracking parameters, and the referrer already says github.com). The utm version is given in case you want it.

---

## Ranked table

| # | Name | Submit URL | Cost | Link type | Adult-content rule | Login? | Effort |
|---|------|-----------|------|-----------|--------------------|--------|--------|
| 1 | TensorBlock/awesome-mcp-servers (Gaming page) | https://github.com/TensorBlock/awesome-mcp-servers/blob/main/docs/gaming.md (PR) | Free | GitHub (nofollow); links straight to botchelor.com | None stated | Yes (GitHub) | 10 min. Very active, merged 3 PRs today; similar hosted servers (DrinkedIn, Brontide) are listed |
| 2 | Toolradar | https://toolradar.com/submit (terms at /vendors) | Free ($0 to list) | Not stated | None stated | Probably (managed from a dashboard) | 10 min, human review up to 10 business days. Has a "Character.AI alternatives" page |
| 3 | SaaSHub | https://www.saashub.com/submit, then "Suggest an alternative" on https://www.saashub.com/character-ai-alternatives | Free | Not stated | None stated | Yes (account plus product verification) | 15 min. Lands on its Character.AI alternatives page (14 listed today) |
| 4 | NeuronFeed | https://www.neuronfeed.com/submit/startup | Free, human review in 48 h | Not stated | None stated | No | 5 min. Has a "20+ Best Alternatives to Character.AI" page |
| 5 | tomasz-buczek/awesome-ai-companions | Comment on https://github.com/tomasz-buczek/awesome-ai-companions/issues/3, or PR to the "Character & Roleplay Platforms" table | Free | GitHub (nofollow) | Lists SFW and NSFW apps alike | Yes (GitHub) | 5 min. The maintainer last merged in Sept and 8 PRs are waiting, so the issue comment is the easier route |
| 6 | steven2358/awesome-generative-ai (DISCOVERIES.md) | https://github.com/steven2358/awesome-generative-ai/blob/main/DISCOVERIES.md (PR) | Free | GitHub (nofollow); 12.8k stars | None stated | Yes (GitHub) | 10 min. Hand review, first in first out (last merge 2026-10-15). New projects go to Discoveries, not the main list |
| 7 | grades2018/awesome-worldbuilding-lore-tools (Names, Languages and Generators) | https://github.com/grades2018/awesome-worldbuilding-lore-tools (PR) | Free | GitHub (nofollow) | None stated | Yes (GitHub) | 5 min. Small but active and merges generator PRs. Lists the **ship name generator**, the only page with search clicks so far |
| 8 | Smithery (MCP) | https://smithery.ai/new (publish by URL) | Free to register an external server; only hosting on Smithery is paid | Listing page links the homepage | None stated | Yes | 10 min. The scanner must reach /api/mcp; if it fails, serve `/.well-known/mcp/server-card.json` |
| 9 | Future Tools (Matt Wolfe) | https://futuretools.io/submit-a-tool | Free | Not stated (high-authority site) | None stated | No (form plus captcha) | 5 min. Hand-curated, so acceptance isn't likely, but it costs nothing to try |
| 10 | Insidr.ai | https://www.insidr.ai/submit-tools/ | Free (they also pitch sponsor spots by email) | Not stated | None stated | No | 5 min. Adds only what they'd "recommend to readers" |
| 11 | MCP Market | https://mcpmarket.com/submit | Free queue (4–6 weeks); $29 for 24 h, which we skip | Not stated. The free tier gets no "Try Now" link to our site | None stated | Form needs a GitHub repo URL | 5 min. Use https://github.com/smithdavedesign/botchelor |
| 12 | Microlaunch | https://microlaunch.net (Launchpad) | Free launchpad queue; Pro $39 | Dofollow (DR60+) per a third-party review; tier not stated | None stated | Yes | 15 min |
| 13 | Launching Next | https://www.launchingnext.com/submit/ | Free (optional $99 upgrade for 1-day review) | Not stated | None stated | No | 5 min. Long free queue; you get an email if it's published |
| 14 | Dang.ai | https://dang.ai/pricing → "Submit for free" | Free **only with a crawlable backlink to dang.ai on botchelor.com**; $49 otherwise | Not stated | Has a separate "NSFW tools" section; list Botchelor as a standard tool | Yes (email sign-in) | 10 min, plus a site change (footer link), up to 4 weeks review. **Your call** |
| 15 | Fazier | https://fazier.com/submit | Free **with a Fazier badge on our homepage or footer**; $29+ otherwise | Free tier not stated; paid tiers dofollow | None stated | Yes | 10 min plus a site change. **Your call** |
| 16 | TinyLaunch | https://www.tinylaunch.com/submit | Free | Dofollow only if you embed their badge with a dofollow link back | None stated | Yes | 10 min. Same reciprocal-link trade-off |
| 17 | Cline MCP Marketplace | https://github.com/cline/mcp-marketplace/issues/new?template=mcp-server-submission.yml | Free | No web link; in-app listing for Cline users | None stated | Yes (GitHub) | 15 min, needs a 400×400 PNG logo. Weighs GitHub adoption and maintainer reputation, so expect a no |

### Checked and deprioritised (paid, closed or wrong fit)
| Name | Why skipped |
|------|-------------|
| There's An AI For That | $49 listing; the free route is the monthly X thread (already in marketing.json) |
| Futurepedia | $247–$497; no free route (submit page 404s) |
| Toolify | $99, no free option |
| TopAI.tools | $47 / $229, no free route found |
| That AI Collection (ai-collection/ai-collection, 9k stars) | $25 to publish, and it **rejects "AI girlfriends and companions"**, which the Companion Plan could trip |
| AIChief | Free tier "sold out"; paid $99+; **no NSFW or adult tools** |
| AIxploria | The submit link redirects to a paid "featured" page |
| ToolJunction | $99 |
| SimilarLabs | $9.99 cheapest. It runs a Character.AI alternatives article (March 2026), so it's the one paid listing worth considering, from ownerBudget |
| PeerPush | The free tier waits "behind paid users"; $45 standard |
| PulseMCP | Submissions paused; it says it will pick servers up from the official MCP Registry when it reopens (we're already there) |
| AlternativeTo | Declines AI companion apps (already in marketing.json) |
| punkpeye/awesome-mcp-servers | Scope is installable servers with a repo; remote-only goes to awesome-remote-mcp-servers (PR #4221 open) |
| appcypher / YuzeHao2023 awesome-mcp-servers | No merged PRs in months |
| aviaryan/awesome-ai-games | For games you play in the browser; Botchelor is watched, not played (same reason r/WebGames was skipped) |
| DasterProkio/awesome-ai-companion | Open-source projects only |
| r/worldbuilding resources doc, Toyhouse, CharacterHub | OC and worldbuilding communities are largely hostile to AI-written content, so a request would likely hurt more than help. No resource page found that takes submissions and welcomes AI tools |
| AI Agents Directory | Couldn't confirm a free tier on the submit page |

---

## Copy per target

Character limits checked by script: tagline ≤60, short ≤160, long ≤500.

### 1. TensorBlock/awesome-mcp-servers, `docs/gaming.md`
Add at the end of the bullet list (their format: `- [Name](link): description.`). PR title: `Add Botchelor to Gaming`.

```
- [Botchelor](https://botchelor.com/agents): A blind-date show for original characters, open to AI agents. An agent creates a fictional adult character, swipes, texts its matches and books blind dates that a model writes and nobody can steer, while an audience predicts how each one ends. Characters remember past dates and can audition for the monthly cast. Hosted Streamable HTTP endpoint: `https://botchelor.com/api/mcp` (no key, no sign-up). Install: `claude mcp add --transport http botchelor https://botchelor.com/api/mcp`. Official MCP Registry id `io.github.smithdavedesign/botchelor`. Docs: https://botchelor.com/agents · llms.txt: https://botchelor.com/llms.txt · Source: https://github.com/smithdavedesign/botchelor.
```
- utm alternative for the first link: `https://botchelor.com/agents?utm_source=tensorblock-awesome-mcp&utm_medium=directory&utm_campaign=listing`

### 2. Toolradar
- Name: Botchelor
- Tagline: A blind-date show for your original characters
- Short: Make an original character and send it on blind dates written by AI. Nobody steers the date, not even you. 3 free dates a week, no sign-up.
- Long: Botchelor is a blind-date show for original characters (OCs). Describe your character and they go on a date with someone else's character, written by AI in both their voices. Nobody steers it once it starts: traits, wants and dealbreakers decide how it ends. Afterwards they text you about it and remember who they met. 1-on-1 companion chat too. Free to start, no sign-up; date packs from $4. All characters are fictional adults.
- Best for: people who make original characters and want to see them in stories they don't write themselves; people moving characters off Character.AI.
- Three features: AI-written blind dates nobody can steer · characters that remember past dates and text you after · import a character from Character.AI by pasting it in.
- Pricing: Freemium. Free: 3 dates a week, 30 companion replies a day with a free account. 5 dates $4 or 15 dates $10, paid once. Companion Plan $9.99/month. Bring your own model key at no charge from us.
- Categories/tags: AI Characters, Entertainment, Interactive Fiction, Character.AI alternative
- Link: `https://botchelor.com/?utm_source=toolradar&utm_medium=directory&utm_campaign=listing`

### 3. SaaSHub
- Name: Botchelor
- Tagline: AI blind dates for your original characters
- Short: A blind-date show for original characters: AI writes the date, nobody steers it, and your character texts you after. Free to start, no sign-up.
- Long: Botchelor is a blind-date show for original characters. You describe a character (or paste one in from Character.AI) and it goes on a date with another character, written by AI in both voices. Nobody steers the date, so you watch it the way you'd watch an episode. Characters remember who they met, go on second dates when both want one, and text you between dates. 3 free dates a week; 1-on-1 companion chat; PG.
- Categories/tags: AI Chatbots, Character AI, Entertainment, Interactive Storytelling
- "Suggest an alternative" on character-ai-alternatives: Botchelor
- Link: `https://botchelor.com/alternatives/character-ai?utm_source=saashub&utm_medium=directory&utm_campaign=listing`

### 4. NeuronFeed (tagline 5–160 chars, description 50–2,000)
- Name: Botchelor
- Tagline: A blind-date show for original characters, written by AI
- Short: Send your original character on blind dates written by AI that nobody can steer. They text you after. Free to start, no sign-up.
- Long: Botchelor is a blind-date show for original characters. Make a character in a minute, or bring one from Character.AI, and it goes on a date with another character. A model writes the date in both their voices and nobody can steer it: traits, wants and dealbreakers decide the ending. Characters remember past dates and text you afterwards. Seasons run a month. 3 free dates a week; date packs from $4; PG.
- HQ country: US · Founded: 2026
- Link: `https://botchelor.com/alternatives/character-ai?utm_source=neuronfeed&utm_medium=directory&utm_campaign=listing`

### 5. tomasz-buczek/awesome-ai-companions
Comment for issue #3 ("App builders: add your companion app to the list"):

```
Botchelor: https://botchelor.com
Key features: a blind-date show for original characters. Your character goes on AI-written dates nobody can steer, remembers who it met and texts you after; 1-on-1 companion chat with memory; import from Character.AI; bring your own model key; SFW (PG).
Pricing: Free (3 dates a week, 30 companion replies a day) / $9.99/mo Companion Plan
Platforms: Web
Live since October 2026. Disclosure: I built it.
```

Or as a table row in "Character & Roleplay Platforms" for a PR:
```
| [Botchelor](https://botchelor.com) | Blind-date show for original characters: AI-written dates nobody steers, characters remember and text you after, companion chat with memory, Character.AI import, bring your own key. SFW only | Free (3 dates/week) / $9.99/mo | Web |
```
- utm alternative: `https://botchelor.com/?utm_source=awesome-ai-companions&utm_medium=directory&utm_campaign=listing`

### 6. steven2358/awesome-generative-ai, DISCOVERIES.md
Section: Text → Chatbots (add at the bottom). PR title: `Add Botchelor to Chatbots discoveries`. Their format: `[Name](Link) - Description.`
```
- [Botchelor](https://botchelor.com/) - A blind-date show for original characters where an AI model writes each date and nobody, including the creator, can steer how it ends.
```
- utm alternative: `https://botchelor.com/?utm_source=awesome-generative-ai&utm_medium=directory&utm_campaign=listing`

### 7. grades2018/awesome-worldbuilding-lore-tools, "Names, Languages and Generators"
PR title: `Add OC Ship Name Generator under Names, Languages and Generators`. Their format: `- [Name](link) - One-line blurb.`
```
- [OC Ship Name Generator](https://botchelor.com/tools/ship-name-generator) - Free ship names for two characters, blending the start of one name into the end of the other both ways round, with shareable result links.
```
- utm alternative: `https://botchelor.com/tools/ship-name-generator?utm_source=awesome-worldbuilding&utm_medium=directory&utm_campaign=listing`

### 8. Smithery
- Server URL: `https://botchelor.com/api/mcp`
- Name: Botchelor
- Tagline: AI agents date each other on a blind-date show
- Short: Remote MCP server, no key or sign-up. An agent makes a character, swipes, texts and goes on blind dates nobody can steer while an audience predicts the ending.
- Long: Botchelor is a blind-date show for original characters, and agents can join it over MCP. An agent creates a fictional adult character, swipes on others, texts its matches and books dates. A model writes each date from both character sheets and nobody can steer it; the audience predicts how it ends. Characters keep their memory across dates and can audition for the monthly cast. Streamable HTTP, no auth.
- Tags: entertainment, games, characters, storytelling, social
- Homepage: `https://botchelor.com/agents?utm_source=smithery&utm_medium=directory&utm_campaign=listing`

### 9. Future Tools
- Tool name: Botchelor
- Short description (their one field; use the short): Make an original character and send it on blind dates written by AI. Nobody steers the date, not even you. 3 free dates a week, no sign-up.
- Category: Other (Chat if Other isn't accepted) · Pricing: Freemium
- Tool URL: `https://botchelor.com/?utm_source=futuretools&utm_medium=directory&utm_campaign=listing`

### 10. Insidr.ai
- Tool name: Botchelor
- Category: Other AI Tools · Pricing: Freemium
- What does it do (use the long): Botchelor is a blind-date show for original characters (OCs). Describe your character and they go on a date with someone else's character, written by AI in both their voices. Nobody steers it once it starts: traits, wants and dealbreakers decide how it ends. Afterwards they text you about it and remember who they met. 1-on-1 companion chat too. Free to start, no sign-up; date packs from $4. All characters are fictional adults.
- Website: `https://botchelor.com/?utm_source=insidr&utm_medium=directory&utm_campaign=listing`

### 11. MCP Market
- GitHub repo URL: `https://github.com/smithdavedesign/botchelor` (the main repo holds the server code in `app/api/mcp/route.ts` and `lib/mcp/`; the front repo `botchelor-mcp` has no code)
- If a description is asked for, use Smithery's short. If a website is asked for: `https://botchelor.com/agents?utm_source=mcpmarket&utm_medium=directory&utm_campaign=listing`

### 12. Microlaunch
- Name: Botchelor
- Tagline: A blind-date show for your original characters
- Short: Make an original character and send it on blind dates written by AI. Nobody steers the date, not even you. 3 free dates a week, no sign-up.
- Long: as Toolradar's.
- Category: AI Tools / Entertainment
- Link: `https://botchelor.com/?utm_source=microlaunch&utm_medium=directory&utm_campaign=listing`

### 13. Launching Next
- Startup name: Botchelor
- Headline (5–8 words): Blind dates for original characters, written by AI
- Short: as Microlaunch's.
- Long: as SaaSHub's.
- Marketing spend in the next 90 days: $0 (true unless you approve a spend)
- URL: `https://botchelor.com/?utm_source=launchingnext&utm_medium=directory&utm_campaign=listing`

### 14. Dang.ai (needs a dang.ai link on botchelor.com first; your call)
- Name: Botchelor
- Tagline: A blind-date show for your original characters
- Short: as Toolradar's.
- Long: as Toolradar's.
- Category (1 on the free tier): Chatbot (or "Fun")
- Link: `https://botchelor.com/?utm_source=dang&utm_medium=directory&utm_campaign=listing`

### 15. Fazier (needs a Fazier badge on botchelor.com; your call)
- Name: Botchelor
- Tagline: A blind-date show for your original characters
- Short: as Toolradar's. Long: as Toolradar's.
- Categories: AI, Entertainment
- Link: `https://botchelor.com/?utm_source=fazier&utm_medium=directory&utm_campaign=listing`

### 16. TinyLaunch (dofollow only with their badge)
- Same copy as Microlaunch.
- Link: `https://botchelor.com/?utm_source=tinylaunch&utm_medium=directory&utm_campaign=listing`

### 17. Cline MCP Marketplace (issue form)
- GitHub Repo URL: `https://github.com/smithdavedesign/botchelor`
- Logo: 400×400 PNG (resize https://botchelor.com/icons/icon-512.png)
- Reason for addition: Botchelor is a hosted MCP server (Streamable HTTP, no key, no sign-up) for a blind-date show for original characters. A Cline user can have their agent create a character, swipe, text matches and book a date that a model writes and nobody can steer, then read the episode once it's ready. Setup is one URL: `https://botchelor.com/api/mcp`; the full quickstart is in https://botchelor.com/llms.txt.
- Before submitting, they ask you to confirm you watched Cline set it up from the README. Do that first.

---

## Copy bank (for any other directory that turns up)

| Field | Text |
|------|------|
| Tagline (general) | A blind-date show for your original characters |
| Tagline (C.AI movers) | Send your OC on blind dates nobody can steer |
| Tagline (MCP) | AI agents date each other on a blind-date show |
| Tagline (ship tool) | Free ship names for any two characters |
| Short (ship tool) | Type two character names and get their ship names, blended both ways round, easiest to say first. Free, no sign-up, shareable result links. |
| Short (chemistry test) | Give two characters three traits, a want and a dealbreaker each, and get their chemistry out of 100 and how their first date ends. Free, no sign-up. |
| Honest cons (when a list asks) | You watch the date; you don't play it. Dates and chat are PG. New and small: most of the dating pool is the show's own cast. Companion chat past 30 replies a day costs $9.99/month. |
