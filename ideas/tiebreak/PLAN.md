# Plan: tiebreak, week of 2026-11-02

The bottleneck is still visits. There were 0 this week and 0 the week before, against the playbook's bar of 50 a week before any conversion work. Last week's three items didn't fail as ideas. They never landed: the share cards (#15) and the multi-buyer thumbnail tool (#13) are reopened and waiting on CI that GitHub billing blocked, and the Etsy tester failed twice (#17, #18) in the middle of Claude usage-limit pauses. So this week doesn't re-plan those. It adds two different routes to visitors that don't depend on David posting: vote links a creator drops into their own newsletter, so every reader who votes is a visit, and indexable result pages for public polls. The first is the stronger bet, because authors already run cover votes in their newsletters with a deadline, and that is tiebreak's model ([Neve](https://neve.substack.com/p/help-me-choose-a-new-cover-for-delilahs), [Sara Foster](https://authorsarafoster.substack.com/p/readers-i-need-your-help), [Alexis Grant](https://alexisgrant.com/kindle-cover-vote/)). Today they do it with reply-to-vote or an off-platform poll that has no tally page.

## Items
```json
[
  {
    "id": "newsletter-vote-links",
    "title": "Vote-from-your-newsletter: copyable email and Substack blocks with one link per option",
    "why": "Authors already ask their own lists to pick a cover by a deadline (Neve's Substack, Sara Foster, Alexis Grant's 4,000-subscriber list, where most of her votes came from the newsletter), and sellers and creators have Instagram audiences or email lists. A block of option images, each linking to its own vote, turns every click from a reader into a tiebreak visit and every poll creator into a distribution channel. This is different from the share cards in #15: those make a pasted link unfurl, while this puts voteable options inside an email, where unfurls don't happen.",
    "metric": "visit",
    "target": 20,
    "windowDays": 14,
    "size": "M",
    "payments": false,
    "acceptance": [
      "The poll page shows a 'Get votes from your newsletter' panel to the poll's creator only (same voter cookie or x-tiebreak-voter header). For a 3-option poll it offers two copy buttons: an HTML block (a <table> with inline styles, no <script>, no <style>, one <a href> per option wrapping that option's image or text, absolute URLs) and a Markdown/plain block (one image line plus one link line per option) for Substack and similar editors",
      "Each option link has the form /polls/<id>?pick=<A|B|C|D>&src=newsletter. A GET of that URL records no vote: the vote count is unchanged after the GET, which keeps email link scanners and prefetchers from voting. The page opens with that option preselected and one 'Confirm vote' button, and confirming creates exactly one vote (Playwright, desktop and 390px phone)",
      "A second confirm by the same voter returns 409 and the count doesn't change. A ?pick= link to a closed poll shows the result page, not a vote button",
      "Landing on a ?src=newsletter link fires the visit beacon with the poll path and source 'newsletter', so these visits count apart from search and shared-link visits",
      "No file under mobile/ changes in the PR, and the web and mobile CI checks pass"
    ]
  },
  {
    "id": "public-result-pages",
    "title": "Opt-in public result pages for closed polls, indexed in the sitemap",
    "why": "PickFu publishes closed cover polls as indexable result pages, and they rank for queries like 'which book cover' (pickfu.com/books/book-covers/…), so buyers do search the questions themselves. tiebreak can do the same with real polls only: a creator ticks 'publish the result', and the closed poll becomes a page titled with its question. This is programmatic pages from user polls, which makes it a different change from the hand-written content pages in the running SEO experiment (tiebreak-20261014-seo), measured on its own /results/ path.",
    "metric": "visit",
    "target": 10,
    "windowDays": 28,
    "size": "M",
    "payments": false,
    "acceptance": [
      "The create-poll form has a 'Publish the result when it closes' checkbox, off by default, and a private (paid) poll can't turn it on (the API returns 400 if both are set)",
      "When an opted-in poll closes, /results/<slug> returns 200 with <title> and <h1> equal to the poll question, a meta description stating the winner and the vote count, every option with its vote split, and a 'Make your own tiebreak' link to the new-poll form",
      "/results/<slug> for an open poll, an un-opted poll, or a poll hidden by 3 reports returns 404, and /sitemap.xml lists only opted-in, closed, unhidden polls",
      "Loading /results/<slug> fires the visit beacon with path /results/<slug>",
      "No file under mobile/ changes in the PR, and the web and mobile CI checks pass"
    ]
  }
]
```

## Notes
- **David, first: unblock CI.** No growth feature has merged since photo upload (#10, 2026-10-19). #13 and #15 sit reopened because GitHub Actions never ran (account billing block), and four attempts stopped on the Claude usage limit. Until Actions runs, every item here stalls in the same place. Fixing it lands two finished features (#13, #15) before anything new is built.
- **Check the beacon before reading any result.** `funnel.all` shows 0 visits ever, but the instrumentation experiment counted 2 and the SEO experiment started from a baseline of 6. The site has also moved from tiebreak-phi.vercel.app to tiebreak.1426davejobs.workers.dev (a89ef45, "host-neutral beacons"), and the funnel was last read on 2026-10-27. Before calling any of these experiments, someone should load the workers.dev site and confirm that a visit reaches RepoHQ. LAUNCH-KIT.md and any posts link the old Vercel URL, so check that it still serves or redirects. Some of this 0 may be measurement, not demand.
- **The posts are still the biggest lever, and they're David's.** growth.next is an owner post, and nothing from the launch kit has gone out. The newsletter item gives the r/selfpublish post a concrete reason to try tiebreak ("drop this block into your next newsletter").
- **Not re-planned, and why:**
  - Share cards (#15) and the multi-buyer thumbnail tool (#13): both are running experiments that only need CI.
  - The Etsy listing photo tester (#17, #18) and the YouTube tester: #13 already covers Etsy, book cover and YouTube previews. Search also turns up free Etsy thumbnail-crop previewers ([Listadum](https://www.listadum.com/etsy-thumbnail-preview-tool), [Listing Thumbnail Tester](https://listing-thumbnail-tester.netlify.app)), which weakens the "nobody offers this" premise for an Etsy-only page. Retry it only if #13 is closed for its code.
- **Left out:**
  - An Instagram-story image (1080×1920, poll plus link): it reuses #15's image route, so build it after #15 merges.
  - A Discord bot: it needs David to create an app and a token.
  - Poll-closed notifications: they serve activation and retention, which isn't the bottleneck.
  - The $5 checkout and the Pro page: payments is David's step, and the playbook puts distribution first.
- **David to decide:** item 2 only pays off once real polls exist and the new workers.dev domain gets indexed, so it's a slow bet. If you'd rather keep the pipeline on one item at a time while CI is flaky, build item 1 alone.
