# Plan: tiebreak, week of 2026-11-09

The bottleneck is still visits: 0 this week and 0 the week before, against the playbook's bar of 50 a week. The ideas aren't what's failing, though. The last six growth builds (newsletter vote links #20–22, public result pages #23, #24, #26) all died on a "Vercel failed" check, and #26 had passing tests and acceptance. The product now runs on Cloudflare Workers (tiebreak.1426davejobs.workers.dev), but a Vercel project still builds every PR and serves the old tiebreak-phi.vercel.app URL, which the launch kit links. So item 1 turns that leftover Vercel project into a redirect to the live site. That fixes the check that blocks every merge, and it stops visits through old links from landing on a stale, uncounted copy. Item 2 is the one new route to visitors with clear search demand behind it: a page for people already looking for a cheaper PickFu.

## Items
```json
[
  {
    "id": "vercel-redirect-to-workers",
    "title": "Turn the leftover Vercel deploy into a redirect to the live Workers site, and prove the beacon counts there",
    "why": "Six builds in a row (#20–#26) were abandoned on a failing Vercel check even when their tests passed, so no growth feature has merged since #10 (2026-10-19). Meanwhile tiebreak-phi.vercel.app, the URL in LAUNCH-KIT.md and any past posts, still points at a Vercel deploy and not the Workers site the beacon was moved to (a89ef45). A redirect-only Vercel config makes that check trivially green, sends every old link to the counted site, and gives Google one host to index. Only after that can #13, #15, #22 and #26 land and be measured.",
    "metric": "visit",
    "target": 10,
    "windowDays": 14,
    "size": "S",
    "payments": false,
    "acceptance": [
      "HEAD https://tiebreak-phi.vercel.app/, /polls/abc123 and /polls/abc123?src=x each return 301 or 308 with Location equal to https://tiebreak.1426davejobs.workers.dev plus the same path and query string",
      "On the PR itself, the GitHub check run from Vercel finishes with conclusion 'success' (read from the GitHub checks API), and the web and mobile CI checks pass",
      "The PR changes only the Vercel config (vercel.json or equivalent) and tests: no file under the web app's source or mobile/ changes, and the Workers deploy of main still returns 200 on /",
      "A Playwright run against https://tiebreak.1426davejobs.workers.dev/ at desktop and 390px width sees exactly one visit-beacon request per page load to the RepoHQ signal endpoint, with a 2xx response and the workers.dev host in its page URL",
      "Every page on the Workers site has a <link rel=\"canonical\"> on the https://tiebreak.1426davejobs.workers.dev host"
    ]
  },
  {
    "id": "compare-pickfu",
    "title": "PickFu alternative page: /compare/pickfu, an honest side-by-side with a 'start a free poll' handoff",
    "why": "PickFu is the paid tool every buyer in REVENUE.md already knows ($1 a response, $15 minimum, from its own help center). 'PickFu alternatives' is a query worth targeting: PickFu itself publishes a /pickfu-alternatives page, and Capterra, Spotsaas and FitGap run alternatives lists. A seller who wants one quick verdict without $15 is the exact buyer. This is a comparison-intent page for people searching a competitor's name, not one of the hand-written how-to pages in the running SEO experiment (tiebreak-20261014-seo), and it's measured on its own /compare/ path.",
    "metric": "visit",
    "target": 10,
    "windowDays": 28,
    "size": "S",
    "payments": false,
    "acceptance": [
      "GET /compare/pickfu returns 200 with a <title> and <h1> that contain 'PickFu alternative', and a meta description under 160 characters",
      "The page renders a table with 2 product columns (tiebreak, PickFu) and at least 6 rows: price per poll, minimum spend, who votes, written reasons, vote target and deadline, account needed. The PickFu cells include its demographic targeting and written reasons as PickFu advantages, and the price row links to https://www.pickfu.com/help/how-does-pickfu-s-pricing-work",
      "The page has a primary link to the new-poll form, and following it in Playwright (desktop and 390px) reaches a form that can create a 2-option poll",
      "/sitemap.xml lists /compare/pickfu, and loading the page fires the visit beacon with path /compare/pickfu",
      "No file under mobile/ changes in the PR, and the web and mobile CI checks pass"
    ]
  }
]
```

## Notes
- **Only two items, on purpose.** Four finished growth builds are waiting on the merge path, not on new ideas: #13 (thumbnail compare tool) and #15 (share cards) are reopened, and #22 (newsletter vote links) and #26 (public result pages) passed their own tests and failed only on Vercel. Once item 1 is green, re-run those four as they are, before anything new. A third new feature would only add to the pile stuck behind the same check.
- **David, check the Vercel project if item 1 can't do it from the repo.** If the Vercel project's dashboard settings (framework preset, build command, Ignored Build Step) override vercel.json, the redirect needs either a dashboard change, or disconnecting the Vercel Git integration and leaving a redirect-only deploy. Disconnecting alone fixes the check but leaves the old launch-kit URL serving a stale copy. Separately, the pipeline's merge gate treats a Vercel check as required on a product hosted on Workers. That's worth fixing in idea-factory so the next product that changes host doesn't stall the same way. It's outside this plan's scope.
- **The 0 may be partly measurement.** `funnel.all` shows 0 visits ever, yet the instrumentation experiment counted 2 and the SEO baseline was 6, and the funnel was last read on 2026-10-27. Item 1's beacon check settles whether visits on the Workers host reach RepoHQ. Don't call any running experiment (SEO ends 2026-11-11, photo upload 2026-11-16, #13 and #15 on 2026-11-14) until then, since their windows ran while nothing new was live.
- **The posts are still the biggest lever, and they're David's.** growth.next is an owner post, and nothing in LAUNCH-KIT.md has gone out. Update its URLs to the workers.dev host before posting, though item 1's redirect covers it either way. Search suggests authors still run cover votes on blogs and in newsletters with Google Forms or comment threads ([Alexis Grant](https://alexisgrant.com/kindle-cover-vote/), [Sara Foster](https://authorsarafoster.substack.com/p/readers-i-need-your-help)), so r/selfpublish is still the best fit for a first real creator.
- **Left out:**
  - An embeddable poll widget for author blogs: real precedent (authors' cover-vote blog posts, and Blogger polls that allow repeat votes), but like the newsletter links, it only brings visits once creators exist. Queue it after #22 shows whether creator-distributed links get clicks at all.
  - More compare pages (Photofeeler, Picabo, Piqly, Google Forms): those are consumer photo apps or general forms, not where the paying seller searches. Add them only if /compare/pickfu gets impressions.
  - The Etsy listing photo tester and the YouTube tester: #13 covers them, and free Etsy thumbnail previewers already exist (last week's notes).
  - The $5 checkout and the Pro page: payments is David's step, and the playbook puts distribution first.
- **I couldn't read the tiebreak code.** Shell and reads outside this folder were denied this session, so the acceptance criteria use the routes and checks named in the record (/polls/<id>, sitemap, web and mobile CI, the visit beacon). Builders should map them onto the actual paths.

Sources: [PickFu pricing](https://www.pickfu.com/help/how-does-pickfu-s-pricing-work), [PickFu alternatives](https://www.pickfu.com/pickfu-alternatives), [Capterra PickFu alternatives](https://www.capterra.com/p/175737/Instant-Market-Research/alternatives/), [Spotsaas](https://www.spotsaas.com/product/pickfu/alternatives), [FitGap](https://us.fitgap.com/products/pickfu), [Photofeeler FAQ](https://www.photofeeler.com/faq), [Picabo](https://www.producthunt.com/products/picabo-photo-voting), [Piqly](https://apps.apple.com/us/app/piqly/id6754887166).
