# leakwatch — PRD

## Problem
A solo seller of a $30–$100 template pack, ebook or small course on Gumroad, Etsy or Payhip may find copies of their file on free-download aggregators. Finding them by hand means repeated Google searches; filing means a sworn form per request. Paid services start at $45–$99/mo or $99+ per notice (see RESEARCH.md).

## Target user
Solo creators and tiny studios selling digital files, roughly $1k–$10k/mo, who already pay platform fees and tool subscriptions and might pay about $19/mo if it recovered a few sales. Reachable in r/gumroad, r/Etsy, template-seller communities and X creator circles.

## Competitors & gap
Remove.tech ($99–$399/mo), BranditScan (from $45/mo), Ceartas ($99–$199 per takedown), DMCA Masters/Altahonos (Telegram, from $149), coursepiracy.com (course-focused), Google's free form. Gap: a flat sub-$20 weekly sweep plus prepared notices for low-priced digital files, with the owner staying the signer.

## MVP scope
- Add a product: title, store URL, optional distinctive phrases/filename, canonical URL list
- Weekly sweep: search queries built from the product, deduplicated against already-seen URLs
- Candidate review inbox: user marks each hit Infringing / Legit / Ignore
- Notice generator: Google Search removal text (work description, original URL, infringing URLs) and a host abuse notice
- Host lookup: RDAP/DNS abuse contact for each infringing domain
- Weekly email digest of new candidates
- Log of notices prepared and sent by the user, with a follow-up reminder after 7 days

## Non-goals
- Filing notices on the user's behalf
- Telegram/private-channel monitoring
- DRM, watermarking, or licence-key systems
- Image or video fingerprinting
- Legal advice

## Success metrics
- Demand test: ≥ 40 seller emails on a landing page in 14 days from ≥ 3 communities, and ≥ 5 paying/pre-paying $19 (or ≥ 10 replying that they have found a pirated copy of their own product)
- On 5 real seller products, the sweep finds ≥ 1 true infringing URL for ≥ 3 of them
- Precision: ≥ 70% of surfaced candidates marked Infringing by the owner
- Under 2 minutes from digest to prepared notice per URL

## Open questions
- Which search API works at $0 for a new project, and how many queries does a weekly sweep need?
- Do sellers under $5k/mo care enough to pay $19?
- How many leaked files show up in web-indexed results versus Telegram only?
- What wording and disclaimers keep wrongful-notice risk with the signer and avoid the tool giving legal advice?
