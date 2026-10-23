# Plan: botchelor, week of 2026-10-26

The bottleneck is still acquisition: 44 visitors this week, against the playbook's 50, and 43 of them arrived as "direct". Nobody posted the launch kit, so it was abandoned. Last week's three visit features (ship name generator, episode share card, OC chemistry test) are all still inside their windows, which end 3–6 Nov, so this week stays away from search-tool pages. It goes after the two channels those features don't touch: spectators, through a daily prediction game with a spoiler-free result to share, and the SillyTavern buyer, through a character card they can carry into the tools they already use, with a link back. A third, small search tool comes last.

## Items
```json
[
  {
    "id": "daily-date",
    "title": "Daily Date: one blind date a day to predict, no account",
    "why": "RESEARCH.md's strongest behavioural evidence is the Love Island habit: more than a quarter of mobile viewers played the prediction game. The launch kit dropped r/LoveIslandUSA because Botchelor has \"no spectator-only hook\". A single house-cast date each day at a fixed URL, predicted without an account and ending in a copyable, spoiler-free result line, gives spectators a reason to come back and something to paste into group chats and Discord, the way Wordle results spread. Shares carry ?ref=daily, so the beacon can tell this loop apart from the other visit experiments.",
    "metric": "visit",
    "target": 50,
    "windowDays": 14,
    "size": "M",
    "payments": false,
    "acceptance": [
      "GET /daily returns 200 for a logged-out visitor and shows today's date number, both house characters' names and sheets, and a prediction form with exactly three choices (second_date, friends, disaster). Before a pick, the server-rendered HTML does not contain the episode's ending value or its last scene",
      "The same UTC day always serves the same episode, a different day serves a different one, and /daily/{n} serves past day n with its ending shown. The day's episode is chosen deterministically from the house-cast pool (unit test with a frozen clock), and it works with every LLM env var unset if that day's episode is already stored",
      "Submitting a pick without an account reveals the episode, says whether the pick was right, and keeps a streak count in localStorage: two correct days in a row show \"Streak: 2\" in a Playwright test that advances the clock",
      "A \"Copy result\" button copies text that contains \"Botchelor Daily #{n}\", an emoji for right or wrong, the streak and a URL ending in /daily?ref=daily, and does not contain the ending value or either character's name",
      "/daily has og:title containing \"Botchelor Daily\" and is listed in /sitemap.xml; the home page links to it above the fold; loading /daily?ref=daily sends a `visit` to the RepoHQ beacon with ref=daily"
    ]
  },
  {
    "id": "character-card-export",
    "title": "Export your OC as a SillyTavern character card",
    "why": "REVENUE.md's buyer is an adult who already roleplays their OC with AI, and that audience (r/SillyTavernAI, card hubs) passes characters around as V2 cards: a PNG with chara_card_v2 JSON in a tEXt chunk. Giving a creator their own Botchelor character as a card that opens in SillyTavern, with a creator_notes line pointing to its dates, adds a backlink to every card that gets shared. It also gives the r/SillyTavernAI showcase post a concrete reason to click. It exports only the creator's own character, never imports, so it stays within the PRD's non-goal on characters taken from elsewhere.",
    "metric": "visit",
    "target": 50,
    "windowDays": 14,
    "size": "M",
    "payments": false,
    "acceptance": [
      "GET /api/characters/{id}/card.png for a character owned by the requester returns 200, content-type image/png, and a tEXt chunk with keyword \"chara\" whose base64 JSON has spec \"chara_card_v2\", spec_version \"2.0\", and data.name, data.description (bio, want, dealbreaker) and data.personality (the three traits) equal to the character's fields (unit test parses the PNG)",
      "data.creator_notes contains https://botchelor.com/c/{id}?ref=card and the text \"AI-generated character from Botchelor (18+)\", and the card contains no account name, email or private \"soul\" field",
      "The same route returns 403 for a character the requester doesn't own and 404 for an unknown id; house characters and characters hidden by reports can't be exported",
      "The character page shows a \"Download SillyTavern card\" button only to its owner, and a test that opens the downloaded file with @lenml/char-card-reader (or an equivalent parser) reads back the same name",
      "GET /c/{id}?ref=card returns 200 for a logged-out visitor, shows the character's public sheet and links to its episodes and to /create, and sends a `visit` to the RepoHQ beacon with ref=card"
    ]
  },
  {
    "id": "meet-cute-generator",
    "title": "Free blind-date / meet-cute prompt generator for two OCs",
    "why": "Writers already use single-purpose generators for this: Story Shack runs a dating-show concept generator, a shipping prompt generator and a meet-cute generator, and CodeItBro runs an OTP prompt generator. Botchelor's showrunner already has the setting and twist seeds these tools output. Two names in, a deterministic setting, twist and stake out, ending in \"watch them actually go on this date\", puts a search page one click from /create with the scenario prefilled.",
    "metric": "visit",
    "target": 50,
    "windowDays": 14,
    "size": "S",
    "payments": false,
    "acceptance": [
      "GET /tools/meet-cute-generator returns 200 with an h1 containing \"Meet-Cute Generator\", two name inputs, a <title> containing \"Meet-Cute\" and a canonical link to itself",
      "Submitting \"Juniper\" and \"Dex\" lands on /meet-cute/juniper/dex, which server-renders a setting, a twist and a stake drawn from the showrunner's own seed lists; the same URL gives the same scenario on reload, and \"Reroll\" goes to a ?v=2 variant with a different setting (deterministic, no model call, works with every LLM env var unset)",
      "The result page links to /create with the first name prefilled and the scenario's setting passed as the date seed, and has og:title containing both names",
      "A name on the real-person blocklist or with a sexual-content term shows the same error /create shows and renders no scenario, and the result page has noindex",
      "/sitemap.xml lists /tools/meet-cute-generator, and the other /tools pages link to it"
    ]
  }
]
```

## Notes
- **Left out:**
  - **SillyTavern card *import* into /create.** It's the strongest activation lever for the SillyTavern buyer, but the PRD lists "anyone's character imported from elsewhere" as a non-goal, and RESEARCH.md warns that OC owners expect consent. Most cards on the hubs belong to other people. Export only, until David decides otherwise.
  - **Landing, pricing and checkout changes.** The playbook says distribution comes before conversion under 50 visitors a week, and with 0 Buy clicks there is nothing to test yet.
  - **Another chemistry test retry.** It needed three attempts but merged today (PR #721), so it now needs its window, not more work.
  - **A Discord bot.** Our audience lives on Discord, but a bot only brings visitors once servers install it, and nothing in the record suggests anyone would.
  - **An auto-poster for Bluesky or Reddit.** Posting is David's job, under the honest-posts rule.
- **Overlapping windows:** five visit experiments overlap until early November, which bends the "one change per experiment" rule. The ref tags (share, daily, card) and the /tools paths are what keep each one's visits apart. If the RepoHQ beacon still records only `ref=share`, as the launch kit says, widening it to any ref value comes first. That's a small chore and is inside the daily-date and card criteria.
- **For David to decide:**
  1. **The launch kit.** Visitors only reach these features through posts or search, and no post has gone up. r/ChatbotRefugees and Show HN are the first two in the kit. Daily Date gives the r/LoveIslandUSA idea a real reason to exist, but check that sub's self-promotion rules before posting there.
  2. **Card import** (above): yes or no.
  3. **Stripe.** The launch kit says token packs are live on botchelor, but the RepoHQ "Stripe product mapped" step is still undone, so checkout signals may not reach the funnel. Nothing here touches payments.
- **Unverified:** I found no keyword volumes for "meet-cute generator" or "OC character card". The Story Shack and CodeItBro pages show that the tool category exists, not how much traffic it gets. The V2 card format comes from secondary sources (the meganova.ai guides and the @lenml/char-card-reader README), not the canonical spec. The build should check it against SillyTavern's import code. LEARNINGS.md doesn't exist yet, and I couldn't open the product repo, so route names follow last week's plan and the launch kit.
