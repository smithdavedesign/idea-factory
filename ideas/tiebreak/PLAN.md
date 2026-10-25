# Plan: tiebreak, week of 2026-10-26

The bottleneck is visits: 0 this week and 7 ever, against the playbook's 50 a week before any conversion work. Last week's plan didn't fail as an idea; it never shipped. The thumbnail tool failed three builds and the share cards failed three more, every time on "web, web, mobile failed", even though they were web-only features. So this week re-plans the two visit features, split into small single-purpose PRs that leave `mobile/` alone: per-poll share cards first (the smallest, and a test of whether the pipeline can land anything), then one search-landing tool page per buyer. Each tool page is its own experiment. Search shows that creators already use free, pre-publish, human-vote thumbnail testers ([CollabPals](https://www.collabpals.com/thumbnail-tester), [Touhfa Arena](https://touhfa.art/arena/)), and that sellers and authors otherwise fall back to PickFu (from $15–$50 a poll) or Google Forms and newsletter polls ([Helium10](https://www.helium10.com/blog/pickfu-a-b-testing-tool/), [MobileRead](https://www.mobileread.com/forums/showthread.php?p=3974517)).

## Items
```json
[
  {
    "id": "poll-share-cards-og",
    "title": "Per-poll share card (og:image) showing the candidates",
    "why": "Every route to voters in the record (launch kit, concierge plan) is someone pasting a poll link into a chat or forum, and today that link unfurls as plain text. Different from the two failed poll-share-cards builds (#15, #16): this one is only the image route and the meta tags. The 'make your own' loop and the closed-poll split are dropped, and nothing outside the web app's poll page and a new image route changes.",
    "metric": "visit",
    "target": 10,
    "windowDays": 14,
    "size": "S",
    "payments": false,
    "acceptance": [
      "GET /polls/<id> (the poll page) HTML contains og:image and twitter:image meta tags, plus twitter:card=summary_large_image, pointing to a per-poll image route",
      "The per-poll image route returns 200 with content-type image/png, and the PNG is 1200x630",
      "For a 2-option image poll the PNG contains both option images (snapshot test). For a 4-option text poll with a 200-character question it renders without text overflowing the canvas (snapshot test)",
      "An unknown poll id returns a 404 from the image route, and a private poll's image route returns a generic tiebreak card rather than its options",
      "No file under mobile/ changes in the PR, and the web and mobile CI checks pass"
    ]
  },
  {
    "id": "etsy-listing-photo-test",
    "title": "Free Etsy listing photo tester: 2–4 photos in a mock Etsy search grid, then 'let strangers pick'",
    "why": "The paying buyer in REVENUE.md is an Etsy seller choosing a main photo, and search turns up no free Etsy-specific tool that compares candidates and collects votes, only PickFu (paid, Amazon-focused) and live split testers. Different from the three failed thumbnail-compare-tool builds (#11–#13): one page for one buyer instead of three tool pages in one PR, with the poll handoff reusing the existing create form and upload (PR #10) rather than new upload code.",
    "metric": "visit",
    "target": 20,
    "windowDays": 14,
    "size": "M",
    "payments": false,
    "acceptance": [
      "/tools/etsy-listing-photo-test returns 200 with a unique <title>, a meta description and an <h1> naming the tool, and appears in /sitemap.xml",
      "Adding 3 local images renders each one as a 1:1-cropped tile inside a mock Etsy search-results grid, next to the others, with no network request carrying the image until the user asks for a poll (Playwright network log)",
      "Clicking 'Let strangers pick' opens the new-poll form with the 3 images as options A–C, and submitting it creates a poll whose page renders all three (Playwright, desktop and 390px phone)",
      "Loading the page fires the visit beacon with path /tools/etsy-listing-photo-test, so its visitors count apart from the SEO-experiment pages",
      "No file under mobile/ changes in the PR, and the web and mobile CI checks pass"
    ]
  },
  {
    "id": "youtube-thumbnail-test",
    "title": "Free YouTube thumbnail tester: 2–4 thumbnails in desktop and phone feed mocks, then a vote",
    "why": "Creators already search for free pre-publish thumbnail testers with human votes (CollabPals' credit exchange, Touhfa Arena, which is limited to 2 thumbnails over 5 days), and the research shows they pay TubeBuddy for the same decision. tiebreak takes 2–4 options and closes at a vote target. It reuses the Etsy page's grid component, so it's a small second PR, measured on its own path.",
    "metric": "visit",
    "target": 10,
    "windowDays": 14,
    "size": "S",
    "payments": false,
    "acceptance": [
      "/tools/youtube-thumbnail-test returns 200 with a unique <title>, a meta description and an <h1> naming the tool, and appears in /sitemap.xml",
      "Adding 2 local images renders each at 16:9 in a desktop home-grid tile and in a phone-feed tile at 390px width (4 preview tiles), entirely client-side",
      "Clicking 'Let strangers pick' opens the new-poll form prefilled with the images as options, and submitting it creates a poll (Playwright, desktop and 390px phone)",
      "Loading the page fires the visit beacon with path /tools/youtube-thumbnail-test",
      "No file under mobile/ changes in the PR, and the web and mobile CI checks pass"
    ]
  }
]
```

## Notes
- **Fix the build failures before spending another session on features.** Six feature attempts since 2026-10-20 failed. Five failed every check, including the mobile one, on web-only work (#11, #12, #13, #15, and #16 failing tests in the pipeline's run). One failed because Docker wasn't running. `state.json` also has `build.stopped: "M3: tests failing"` and `testsPassing: false` next to an acceptance verdict of "pass". That pattern looks like main itself is red (or the sandbox can't install or typecheck the workspace), not like six bad features. I couldn't open the repo or the CI logs from this session, so this is an inference. Someone should read `gh run view --log-failed` on #16 first. If main is red, a fix PR comes before item 1. Each item's "mobile/ untouched, checks pass" criterion is there to tell a broken feature apart from a broken pipeline.
- **The posts are still the biggest lever, and they're David's.** growth.next is an owner post, and none of the launch kit (r/SideProject, r/EtsySellers, Indie Hackers, r/selfpublish, r/PartneredYoutube) has gone out. 0 visitors mostly means nobody has been told. These features give the posts better places to land, such as a tool page to link from Indie Hackers and a share card for every poll link, but they don't replace the posts.
- **PR #10 (photo upload)** is recorded as a running experiment until 2026-11-02. Items 2 and 3 hand images to the poll form through it. If it isn't actually live on main, the handoff has to fall back to the form's existing image fields, and the builder should check that first.
- **Left out:**
  - A "PickFu alternative" compare page and more content pages: they're the same kind of change as the running SEO experiment (`tiebreak-20261014-seo`, ends 2026-11-11). Revisit once it reports.
  - The "make your own tiebreak" voter loop and the closed-poll result split on share cards: cut so the share-card PR stays small. They're the natural next items once share cards land.
  - A book-cover tool page: the third buyer, and the weakest search signal (authors mostly use PickFu, Google Forms or newsletters). Add it if the Etsy page draws visitors.
  - A Discord bot for creators' own servers: it needs David to create a Discord app and its token, so it's too big for this week.
  - The $5 checkout, pricing and the Pro page: the playbook says distribution comes first, and the Stripe step is still David's.
  - Native-app work: the bottleneck is web search and shared links.
- **David to decide:** whether the YouTube page is worth building before r/PartneredYoutube answers the launch kit's question ("is Test & Compare enough?"). If you'd rather not invest in the creator segment yet, drop item 3. The plan works with items 1 and 2 alone.
