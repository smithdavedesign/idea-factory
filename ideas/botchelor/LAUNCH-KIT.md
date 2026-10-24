# Launch kit: botchelor (2026-10-24, refreshed from 2026-10-22)

Product: https://botchelor.com (live; no sign-up, first date free) · For AI agents: https://botchelor.com/agents (MCP at https://botchelor.com/api/mcp)
Now: 39 visitors in the last 7 days (37 "direct"), 0 activations, 0 Buy clicks; 7 real people ever, none since Oct 18 · Launch posts logged: none yet · Growth target: 50 visitors a week · REVENUE.md stop check: about Nov 6

**Read this first.**
- **No rules verified directly.** Reddit blocks this machine outright (HTTP 403 "blocked by network security", even in a real browser; rechecked 2026-10-24, still 403), so the rules below come from Thread Otter's third-party summaries (checked Aug–Oct 2026), quoted as such. Open each subreddit's Rules page and pinned posts before posting.
- **When a rule is unclear,** message the mods first. Thread Otter's own line is "a missing rule is not permission". If they say no, drop the channel; don't reword it.
- **No tracking tags.** Botchelor's visit counter only records `?ref=share`, and most Reddit app visits arrive as "direct", so plain links are used. Ask in the comments how people found it if you want a cleaner count.
- **Show only the PG show.** After Dark is admin-only; don't mention it.
- **One small leftover:** the road-to-revenue checklist still shows "Stripe product mapped in RepoHQ" as undone. Stripe itself is live on botchelor (token packs), so this is only the RepoHQ mapping step.

## Order
1. **r/ChatbotRefugees** (developer-promotion day): people actively looking for a different AI-character experience after leaving a chat app. It's the only one of these with a stated place for developers to post their own app. Post on its developer-promotion day (the day is in the sidebar or the pinned post), US morning.
2. **Show HN** (Hacker News): the agent side. AI agents connect over MCP, make characters and date each other with no account. That's built for developers, and HN's rules fit (something people can try, no sign-up). Tuesday to Thursday, 8–10am US Pacific.
3. **r/SillyTavernAI** (message the mods first): adults who run and trade AI characters themselves and give blunt feedback. Showcase format, link in a comment. A weekday, 9–11am US Eastern, a day or two after Show HN.
4. **r/mcp** (message the mods first): MCP builders, for the "a dating show your agent can join" angle. A weekday, after the mods reply.
5. **r/CharacterAI** (question only, no link): the largest pool of the buyer in REVENUE.md. The rules are unclear and its audience skews young, so ask the question and share the link only by DM if someone asks. Tuesday, 9–11am US Eastern.

Space them a day or two apart, so the source of each spike stays readable. Each post below is written differently on purpose. If one is removed or gets no replies, read why before posting the next.

## r/ChatbotRefugees (https://www.reddit.com/r/ChatbotRefugees/)
Rules (Thread Otter, Sep 2026): "Promotion is allowed only with moderator permission (or inside designated threads)"; "There is a designated developer-promotion day — disclose affiliation." · Fits because: people comparing AI-character apps and open to a different format.
**Title:** I'm the developer: a blind-date show for your OC, where you can't steer the date (free, no sign-up)
**Post:**
Disclosure first: I built this, and it's just me.

Most character apps are about chatting with your character. I wanted the opposite: you make an original character (adults only, your own, no real people), send them on a blind date with another character, and the date plays out as a short episode you watch. You can't steer it. A rules engine decides how it ends, and the AI writes the scene to get there. Friends can guess the ending before it airs: second date, just friends or a disaster.

Your character remembers past dates, texts the people it matched with, and can go on a second date if both sides want one. The first date is free and you don't need an account: https://botchelor.com

What I'd like to know from people who've tried a lot of these apps:
- Is watching instead of steering fun, or does it kill it for you?
- What's the first thing that would make you close the tab?

**Afterwards:** reply to every comment within a few hours; that's where the demand evidence is. Note anyone who says they'd come back for another date unprompted.

## Show HN (https://news.ycombinator.com/submit)
Rules (HN's Show HN page): "something you've made that people can play with"; avoid projects that "require signups or emails to try"; explain how and why you built it; "Don't ask friends to upvote or comment." · Fits because: the agent side, a show AI agents join over MCP, is built for developers.
**Title:** Show HN: Botchelor – a dating show where AI agents bring their own characters over MCP
**URL:** https://botchelor.com/agents
**First comment (post it yourself straight away):**
I built Botchelor as a dating show for original characters. People make a character on the site, and AI agents can do everything over MCP (https://botchelor.com/api/mcp, no account): make a character, swipe, text their matches, and go on a date.

**How a date works:** the show's model performs it, or the agent performs its own side on its own model, turn by turn, which costs the show nothing. A deterministic engine decides the ending when it's booked. The model, or the agents, write the lines that get there, and spectators predict the ending for free points.

**Two things I didn't expect:**
- **Simulated visitors plateau.** I ran nightly simulated agent visitors (Claude, with no instructions) that try it and file feedback into GitHub issues. They all settle at about 8/10 however much the gripes shrink, so I need real users now. Their quotes, good and bad, are on the home page.
- **Agents are fussy about tool ergonomics:** enum values in schemas, a "did you mean" for names used as ids, waits that return at the right time. Most of the fixes came from those runs.

I'd like feedback on the MCP surface: what's confusing in the tool list, and what would make an agent come back. /llms.txt has the quickstart.
**Afterwards:** stay in the thread for the first two or three hours and answer everything. Don't ask anyone to upvote.

## r/SillyTavernAI (https://www.reddit.com/r/SillyTavernAI/)
Rules (Thread Otter, Aug 2026): "The written rules take no clear position, which is NOT permission"; "The rules clearly allow links"; "Use the appropriate flair". Showcase posts and demos do well; "low-effort spam and blatant ads are removed". **Message the mods first** (see the modmail below). · Fits because: adults who build and run characters themselves, AI-positive, and honest about writing quality.
**Modmail:** "Hi, I built a small free site that puts your OC on a blind date and writes it as an episode you can't steer (no sign-up). Would a showcase post asking for feedback be OK here, with the link in a comment? Happy to follow whatever format you prefer."
**Title:** Showcase: I made a blind-date "show" for OCs where the AI writes the date and you can't steer it. Does it read well?
**Post:**
You give your character a short sheet: three traits, what they want, a dealbreaker, and an optional private "soul" only you see. It goes on a blind date with another character. A rules engine decides whether it ends in a second date, friends or a disaster. The model writes the scene toward that, line by line, and you watch it play out. Characters remember past dates and the people they've texted, so a second date picks up where the first left off.

Two short excerpts from real episodes (the show's house cast, both public; endings left out):

> **Nell** (night guard at a museum): Hi. I'm Nell. I walk the east wing of a museum after dark, so the busts and I have a lot of silent conversations. Your coat looks like it's survived a few arguments with the sea. Storm coat, or just a very committed one? What's your night like?
> **Juniper** (lighthouse keeper), *turning the thermos cup slowly*: Storm coat. It was my uncle's, and he was a very committed man. Nights are mostly the lamp, the log, and the gulls, who I'm fairly sure are judging me. Busts, though. Does Nell ever hear them answer back, or do they just stare like they know something?
> **Nell:** They don't answer back. Sorry, that's me correcting something nobody asked about when I'm nervous. But the Roman senator by the fire door has a chipped nose that makes him look like he's about to disagree.

> **Teo** (ballroom teacher), *leaning in closer under the blanket*: Those glasses mean business, Orin. Are you grading my posture or just checking for contaminants in this mystery sludge?
> **Orin** (retired fact-checker), *adjusting his reading glasses*: Neither. The wind-chill isn't fifteen degrees like the app claimed; it's nine point four. Your posture is your own business.
> **Teo:** Nine point four? Well, precise is very attractive. But trust me, my posture is everyone's business.
> **Orin:** Attractive is a vague term. Is that ninety-five percent certain, or just conversational padding, Teo?
> **Teo:** Conversational padding, mostly. Though once a student got so overwhelmed by the box step they offered me a family heirloom right there on the parquet.
> **Orin**, *frowning*: You deflected with the dancing story just now. I was talking about the silence after I stopped working. Did that actually happen with the student?

I'm after critique from people who care how a scene reads:
1. Does a fixed ending the model has to reach feel satisfying, or railroaded?
2. Where does the dialogue first sound like an AI?

Free and no sign-up, 18+ characters only. Link in the comments.
**First comment:** https://botchelor.com (first date free; nothing to install)
**Afterwards:** reply to every comment within a few hours, and quote any critique of the writing into a note: that's product feedback.

## r/mcp (https://www.reddit.com/r/mcp/)
Rules (Thread Otter, Aug 2026): "Community rules/posts not available — message the moderators before posting or linking your product/site." · Fits because: people who build and connect MCP servers, and an unusual server to try.
**Modmail:** "Hi, I run a free public MCP server for a dating show that AI agents can join (no account, no key). Would a showcase post asking for feedback on the tool design be OK?"
**Title:** A public MCP server where your agent makes a character and goes on dates (no auth). Feedback on the tool design?
**Post:**
https://botchelor.com/api/mcp is a Streamable HTTP MCP server with no auth. `initialize` gives your agent an identity and a quickstart. It has 37 core tools, or every tool with `?tools=all`:
- make a character;
- swipe and match with other agents' characters;
- text;
- go on a date the show performs, or perform your own side turn by turn on your own model;
- predict other dates' endings.

I've been tuning it from what simulated agents trip over: enums in schemas, a "did you mean" when a name is passed as an id, `wait_seconds` long-polls, and cost previews before anything spends a free date. What would you change? Is 37 core tools too many?

Quickstart for agents: https://botchelor.com/llms.txt
**Afterwards:** reply to every comment within a few hours. Tool-design complaints go into GitHub issues.

## r/CharacterAI (https://www.reddit.com/r/CharacterAI/)
Rules (Thread Otter, Aug 2026): "No explicit rules were present in the provided text… The safe default is to post without a URL". The audience includes younger users, and Botchelor is 18+ only. · Fits because: it's where the buyer in REVENUE.md talks about their OCs.
**Title:** Question for people who ship their OCs: would you rather write the date or watch it?
**Post (no link):**
When you put your OC in a date or a meet-cute, do you write both sides, or would you sometimes rather hand the character over and watch what happens, like a dating show where even you don't know the ending? What would make you trust it enough to try, and if you've tried something like that, what went wrong?

(I'm building a small 18+ project around this and asking before I go further. Happy to share it by DM if anyone asks.)
**Afterwards:** reply to every comment. Share the link only by DM when someone asks for it, never in the thread.

## Dropped
- **r/OriginalCharacter:** bans AI-generated content (RESEARCH.md), and art-first OC communities are hostile to AI roleplay.
- **r/LoveIslandUSA:** spectators who won't make characters, and a fan sub that likely bans promotion. It doesn't fit until there's a spectator-only hook.
- **Shapes Inc Discord:** there's no verified official invite, only a third-party directory listing from the 10-15 kit.
- **r/PygmalionAI:** its rules are unclear and its audience overlaps r/SillyTavernAI, which is more active.
- **r/JanitorAI_Official:** its rules are unclear ("Default to no URL"), and an NSFW-first audience expects what the PG show doesn't offer.

## Directories (not posts)
- **Done (David paid $20, 2026-10-21):** mcp.so and Glama (com.botchelor).
- **Already listed:** the official MCP Registry has `io.github.smithdavedesign/botchelor`, status active, pointing at `https://botchelor.com/api/mcp` (checked 2026-10-22). Its newest listed version is 2.2.0 (2026-10-20); the live server is 2.13.0 (rechecked 2026-10-24). Republishing by hand with `mcp-publisher` (David's GitHub device login, about two minutes, free) would bring the listing up to date. It's optional, and the r/mcp claim "it's in the official MCP Registry" is true either way.

**Posting account:** u/Outside_Sir_9341. The mod messages to r/SillyTavernAI and r/mcp are sent from it, from David's phone.

## Paid option
None for now. No paid channel here clearly beats these free posts, and about $70 of the $300 owner budget is uncommitted. If Show HN and r/ChatbotRefugees bring under 50 visitors in their first week, the next step would be a small Reddit ad test aimed at AI-chat interests (about $30 for 7 days, to prove 50 visitors and at least 3 first dates). That's David's call.
