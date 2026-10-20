# Plan: botchelor, week of 2026-10-19

The bottleneck is acquisition: 40 visitors this week, under the playbook's 50, and nearly all of them are "direct" (23 of the 40 were a single burst). Only 2 came from Reddit, and the launch kit (`botchelor-20261016-kit`) is still only "proposed", not posted. Nothing on the site matches what this audience types into a search box. Botchelor's indexed pages are 73 episodes with UUID URLs and house-character names that nobody searches for. These three features add free tools at search terms the audience already uses ("ship name generator", "character chemistry / OC relationship generator"), each ending in "send them on a real date". They also make every episode link unfurl as a prediction card when it's dropped into Reddit or Discord. All three run without a model call, so they cost $0 per visitor.

## Items
```json
[
  {
    "id": "ship-name-generator",
    "title": "Free OC ship name generator",
    "why": "\"Ship name generator\" is a search with live demand (one single-purpose tool gets about 3K visits a month per indexator.ai), and nothing that ranks for it links shipping to OCs. Each result page is a shareable /ship/<a>/<b> URL that ends in \"send them on a blind date\", which puts the search traffic one click away from /create.",
    "metric": "visit",
    "target": 50,
    "windowDays": 14,
    "size": "S",
    "payments": false,
    "acceptance": [
      "GET /tools/ship-name-generator returns 200 with an h1 containing \"Ship Name Generator\", two name inputs, a <title> containing \"Ship Name Generator\" and a canonical link to itself",
      "Submitting \"Juniper\" and \"Dex\" lands on /ship/juniper/dex, which server-renders at least 5 distinct ship names, each containing at least 2 letters from each input name, and the same URL renders the same names on reload (deterministic, no model call: it works with every LLM env var unset)",
      "/ship/juniper/dex links to /create with the first name prefilled (the /create name input's value is \"Juniper\") and has og:title containing both names",
      "A name on the real-person blocklist or with a sexual-content term renders the error message and no ship names, and the result page has noindex",
      "/sitemap.xml lists /tools/ship-name-generator, and loading the page sends a `visit` to the RepoHQ beacon with path /tools/ship-name-generator"
    ]
  },
  {
    "id": "oc-chemistry-test",
    "title": "OC chemistry test: will these two make it?",
    "why": "Writers search for character chemistry and OC relationship generators (Jenova, Taskade and Headcanon Generator all target it), and Botchelor already has the inputs (three traits, a want, a dealbreaker) and a rules engine that decides second date, friends or disaster. Shown as a free test, the engine becomes a search page and a teaser for the episode, and its CTA turns a curious visitor into a character on /create.",
    "metric": "visit",
    "target": 50,
    "windowDays": 14,
    "size": "M",
    "payments": false,
    "acceptance": [
      "GET /tools/oc-chemistry-test returns 200 with a form for two characters, each with name, three traits, a want and a dealbreaker (the same fields and limits as /create), and a <title> containing \"Chemistry Test\"",
      "Submitting the same two characters twice gives the same 0-100 score and the same predicted ending, one of second_date, friends or disaster; a character whose dealbreaker matches the other's trait always gets \"disaster\" (unit test on the scoring function); it makes no model call",
      "The result is a shareable URL that server-renders both names, the score, the predicted ending and 3 one-line reasons, with og:title containing both names",
      "The result page has a \"Watch the real date\" link to /create with both characters' fields prefilled, and inputs under 18, on the real-person blocklist or with sexual content are rejected with the same messages /create uses",
      "/sitemap.xml lists /tools/oc-chemistry-test, and the home page and /create footer link to both tools"
    ]
  },
  {
    "id": "episode-share-card",
    "title": "Episode share card: link unfurls as a prediction poll",
    "why": "Episode pages give only a bare \"Copy link\", and the audience lives in Reddit and Discord, where a link's preview decides whether anyone clicks it. A per-episode image that asks \"How does it end? Second date, friends or disaster\" turns each shared episode into the spectator invite the PRD's share loop counts on. A ?ref tag lets us see those visits apart from \"direct\".",
    "metric": "visit",
    "target": 50,
    "windowDays": 14,
    "size": "M",
    "payments": false,
    "acceptance": [
      "GET /api/og/episode/{id} returns 200, content-type image/png, 1200x630, for an existing episode, and 404 for an unknown id",
      "Episode page head has og:image pointing at /api/og/episode/{id}, twitter:card summary_large_image, and for an unaired episode an og:description containing \"Guess how it ends\" that does not contain the episode's ending value",
      "Neither the image route nor the meta tags include a creator's account name or email before both creators have consented to the reveal (test on an episode with no reveal consent)",
      "The episode page has share links to reddit.com/submit and bsky.app/intent/compose plus Copy link, and every shared URL carries ?ref=share",
      "Opening an episode URL with ?ref=share sends a `visit` to the RepoHQ beacon with ref=share, and the page shows a \"Make your own character\" link to /create above the fold for a logged-out visitor"
    ]
  }
]
```

## Notes
- **Left out:** landing-page, pricing and onboarding changes. The playbook says distribution comes before conversion until a product has 50 visitors a week, and with 1 activation and 0 Buy clicks, a conversion test would measure nothing. I also left out an "OC dating profile template" page: it's mostly copy, and search showed only scraped template pages, so the demand is unclear. I'd rather tidy the existing SEO surface than add to it: 73 episode URLs, mostly the same Chud × Sable couple, are thin, near-duplicate pages. That cleanup (noindex the repeats) is a small chore for the factory, not a feature, so it isn't on this list.
- **Not a repeat of an experiment:** the only experiment so far is the launch kit, and it has never been posted (status "proposed"). These features are product work, not posts. They do give David a less promotional thing to post: "I made a free OC ship name / chemistry tool" fits subreddit self-promo rules better than "try my app".
- **For David to decide:**
  1. Post the launch kit, or drop it. Without posts, SEO pages take weeks to index, so this 14-day window may show little from the tools alone.
  2. The kit and REVENUE.md still point at botchelor.vercel.app, but the site is live on botchelor.com. Posts should use botchelor.com, and the Vercel URL should redirect there so visits aren't split.
  3. The last build failed because Docker wasn't running ("couldn't start the build sandbox"). Start Docker or these builds will fail the same way.
  4. Stripe is still undone. None of these items touch payments, and they don't need to until visits pass 50 a week.
- **Unverified:** the 3K-a-month figure is a third-party estimate for one ship name tool, and none of these searches gave keyword volumes. Treat the targets as tests, not forecasts.
