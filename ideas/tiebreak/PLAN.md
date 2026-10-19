# Plan: tiebreak, week of 2026-10-19

The bottleneck is visits: 5 this week, against the 50 a week the playbook asks for before any conversion work. Three content pages from the SEO experiment are live, but the launch posts haven't gone up yet. Sellers, authors and YouTubers search for free *tools* that show how an image looks at thumbnail size ([Listadum](https://www.listadum.com/etsy-thumbnail-preview-tool), [Bookwriter](https://www.bookwriter.vip/cover-thumbnail-legibility-test), [ThumbPreviewer](https://alternativeto.net/software/thumbpreviewer/about/)). Those tools preview one image at a time and nobody votes on the result. So this week builds a side-by-side preview tool for 2–4 candidates that ends in "let strangers pick", plus share cards so each poll that does get shared brings visitors back. Photo upload comes first because the tool and the share cards both depend on it, and the launch kit says sellers will raise it as their first objection.

## Items
```json
[
  {
    "id": "photo-upload-options",
    "title": "Upload photos as poll options",
    "why": "LAUNCH-KIT.md says the first objection will be that options take an image link and sellers keep photos on their phones. The preview tool and share cards below also need images hosted by tiebreak, so this comes first. It uses the free storage tier, which keeps it at $0.",
    "metric": "activate",
    "windowDays": 14,
    "size": "M",
    "payments": false,
    "acceptance": [
      "On / each option has a file input that accepts image/jpeg, image/png and image/webp; picking a file shows a thumbnail preview in that option's slot before submit",
      "Creating a poll with two uploaded images returns a poll whose options both carry an image URL on tiebreak's own storage, and the poll page renders both as <img> elements that load with status 200",
      "Uploading a file over 5 MB or with a non-image MIME type is rejected with a 4xx response and an inline error, and no poll is created",
      "The upload works at phone width (390px) in a Playwright run, and image-link options still work as before (the existing tests pass)"
    ]
  },
  {
    "id": "thumbnail-compare-tool",
    "title": "Free side-by-side thumbnail preview tool (Etsy, book cover, YouTube)",
    "why": "Buyers search for free thumbnail-preview tools, and the existing ones show one image at a time with no vote. tiebreak's tool previews 2–4 candidates side by side and hands them to a poll in one click. This is a search-landing tool, which makes it a different kind of thing from the three content pages in the running SEO experiment.",
    "metric": "visit",
    "target": 50,
    "windowDays": 14,
    "size": "M",
    "payments": false,
    "acceptance": [
      "/tools/etsy-thumbnail-preview, /tools/book-cover-thumbnail-test and /tools/youtube-thumbnail-preview each return 200 with a unique <title>, meta description and an <h1> naming the tool, and all three are listed in /sitemap.xml",
      "On /tools/etsy-thumbnail-preview, adding 3 local images renders each one in a search-grid mock at the 1:1, 4:3 and 5:4 crops (9 preview tiles), entirely client-side with no network upload until the user asks for a poll",
      "On /tools/book-cover-thumbnail-test, each added cover renders at about 160px and about 80px tall next to the others, and the YouTube page renders each candidate at 16:9 in a desktop-grid tile and a phone-feed tile",
      "Clicking 'Let strangers pick' on any tool page uploads the images and opens the new-poll form prefilled with them as options A–C; submitting it creates a poll (Playwright, desktop and 390px phone)",
      "Each tool page fires the visit beacon with its own path, so its visitors can be counted apart from the SEO-experiment pages"
    ]
  },
  {
    "id": "poll-share-cards",
    "title": "Poll share cards and a 'make your own' loop for voters",
    "why": "The concierge plan and launch posts both get votes by sharing poll links in communities and chats. Right now a link unfurls as plain text. A card showing the actual candidates gets clicked, and every voter who arrives is someone who could make their own poll.",
    "metric": "visit",
    "windowDays": 14,
    "size": "S",
    "payments": false,
    "acceptance": [
      "A poll's page has og:image and twitter:image (summary_large_image) meta tags pointing to a per-poll image route that returns image/png at 1200x630",
      "The per-poll image shows the poll question and every option (the image thumbnail for an image option, the text for a text option); a closed poll's image marks the winner and the vote split",
      "After a voter casts a vote, the poll page shows a 'Make your own tiebreak' link to /?ref=poll, and the visit beacon records ref=poll when that link is followed",
      "A poll with 4 options, a 200-character question and no images still produces a valid PNG without the text overflowing (snapshot test)"
    ]
  }
]
```

## Notes
- **Nothing here replaces posting.** growth.next is an owner post, and the launch kit (r/SideProject, r/EtsySellers, Indie Hackers, r/selfpublish, r/PartneredYoutube) still hasn't gone out. These features give those posts somewhere better to land, and the tool pages give the link-banning communities something genuinely useful to point to. They don't make visitors without the posts.
- **Overlap with the running SEO experiment** (`tiebreak-20261014-seo`, ends 2026-11-11). The tool pages are also search pages, so the per-path beacon in thumbnail-compare-tool's acceptance criteria is there to keep the two results separate. If the pipeline holds strictly to "one change per experiment", ship the tool pages as their own experiment, and judge the SEO pages only on their own paths.
- **Upload means storing images from strangers.** The existing report button and the 3-reports-hide rule apply. If David wants an automated image filter before upload goes live, that's a separate item, and the free options are thin. This is his call.
- **Left out:**
  - Pricing changes, the Pro page and the $5 checkout: the playbook says distribution first, and nothing here touches payments.
  - More content pages in the style of the SEO experiment, until that experiment reports.
  - Demographic targeting or written reasons: the review says that's PickFu's turf, and if buyers ask for it that's a kill signal.
  - Native-app work: the bottleneck is web search and shared links.
  - LEARNINGS.md doesn't exist yet, so there were no lessons from this product to build on.
- **Instrumentation experiment** (`tiebreak-20261013-instrumentation`) ends 2026-10-20. Its result should confirm that the visit beacon fires on every path before these windows start.
