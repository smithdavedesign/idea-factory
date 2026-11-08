# Launch kit: packpass (2026-11-08, updated the same evening after idea-factory #48)

Page: https://idea-factory.1426davejobs.workers.dev/packpass/ · Decision: not before the page answers there, then 14 days from the move (see below) · Now: 0/50 visitors, 0 signups

**The page answers since 2026-11-08 22:05 UTC.** You added the allow line, the Worker is deployed, and its visit counting works (a test view from the page landed and was deleted). The pipeline records the new address and restarts the 14-day test at its next daily run, about 17:30 UTC on Mon 9 Nov. **Post #1 after that:** Mon 9 Nov, 12:30–4 PM US Eastern, so every visit falls inside the new window. The old address in state.json (https://idea-pages-livid.vercel.app/packpass/) is dead until then. Don't sign up yourself: your email would count as a signup.

**You post, by hand, from your own accounts. Nothing here has been posted.**

**The 10 Nov deadline no longer parks it.** Since idea-factory #48, a demand test isn't judged while its page sits on a dead host. When the page moves to the Worker, the test gets a full 14-day window from the move, and no extension is used up (`decideValidation` and `restartAfterMove` in lib/pipeline.js). So the 50 visitors are counted in that new window. **Still, expect answers more than visitors:** only #1 allows a link. The Etsy subreddits and UKBF ban promotion, so those posts are questions with no link. Their replies still answer the review's open question: would sellers pay for a plan, or only for someone to do the registrations? The paid option below is the way to reach 50 visitors inside the new window.

**I couldn't read the Reddit rules from here.** Reddit blocks this network (HTTP 403 "You've been blocked by network security"; old.reddit redirects to login), so all four Reddit helpers in ~/ai-stack/bin failed, and the web-fetch tools refuse reddit.com. The Reddit rules quoted below come from dated third-party copies. Read each sidebar before you post: it takes a minute once you're signed in.

## Order
1. **Shopify Community, Ask & Offer board.** Post as soon as the page answers, any day (weekday daytime, US Eastern, reaches the most merchants). It's the only place I checked that allows a link for these buyers, provided you disclose that you're building it, so it's the only post that can send visitors to the page.
2. **r/EtsySellers.** A weekday a day or two after #1, ideally a Monday, 8–11 AM US Eastern (5–8 AM Pacific). It's the biggest group of the exact buyer (~261k sellers), but it bans promoting services, so the post is a question with no link. The replies are the evidence.
3. **UK Business Forums, Overseas Trade.** The day after #2, UK working hours (9 AM–5 PM UK = 1–9 AM Pacific). UK sellers have been outside the EU since Brexit, and the 2022 LUCID thread there is where the research found the conflicting advice. The general rules ban unsolicited promotion, so no link.
4. **r/Etsy.** Two days after #2, 8–11 AM US Eastern (avoid Friday: the 2023 rules make Friday the day for shop critique requests). It has 325k buyers and sellers, and the post asks whether sellers simply stop shipping to the EU, which is one of the review's kill criteria. No link. It goes two days after #2 so people in both subreddits don't see two similar questions back to back.

Space them a day or two apart, so the source of each spike stays readable. Only #1 links to the page, so its visits should show up as community.shopify.com.

## 1. Shopify Community: Ask & Offer (https://community.shopify.com/c/ask-offer/294)
**Rules:** the Community FAQ bans "Promoting products, services, websites, or blogs outside the Ask and Offer board"; on that board you must "Clearly disclose any ownership, employment, affiliate, or other commercial relationship." It also bans "Copying and pasting the same content across multiple boards or topics" and "Adding promotional links to third-party blogs, consultancy websites, or other external sites in replies." So: one topic, the link only in the first post, and never repeated in replies.
**Fits because:** these are store owners who ship parcels themselves, and Shopify never asks them for EPR numbers, so the duty is easy to miss. The board is busy (15 topics active in the 24 hours to 8 Nov, mostly app makers, a few merchants), but another builder's EPR survey there (26 Aug) got 2 replies in two months. Expect a handful of visitors, not dozens. Don't reply in that builder's thread; it's their research post.
**Needs:** a Shopify ID to sign in. A new account's first post may wait for a moderator; don't post it again.
**Title:** Shipping to the EU from outside it: how are you handling packaging EPR registrations?
**Post:**
> Disclosure: I'm the one building this. It isn't built yet, and the link below is a waitlist page that checks whether anyone wants it.
>
> Since 12 August 2026 the EU packaging regulation applies with no minimum sales threshold, and each country still runs its own register: LUCID in Germany, a unique ID number through an eco-organisation such as Citeo in France, and in some countries a local representative. Etsy now asks its sellers for these numbers. Shopify doesn't ask, which makes it easy to miss that a store shipping there may need them too.
>
> The idea: you answer a few questions (where you ship from, which EU countries, roughly how many parcels, how much is print-on-demand) and get a country-by-country plan: what to register and in what order, a cost range, the labels to print and the filing deadlines, each with its source. Information, not legal advice, and it doesn't file anything for you. The planned price is $29, against representatives who quote from about 190 EUR a year per country.
>
> Waitlist: https://idea-factory.1426davejobs.workers.dev/packpass/
>
> What I'd most like to know, if you ship to EU customers from the US, UK, Canada or Australia:
> 1. What have you done so far: registered yourself, paid a representative or an EPR app, stopped shipping to some countries, or nothing yet?
> 2. Would a plan like this be worth paying for, or would you only pay someone to do the registrations for you?

**Afterwards:** reply to every comment within a few hours, without repeating the link. Note who says they'd pay for a plan and who wants it done for them; that's the demand evidence.

## 2. r/EtsySellers (https://www.reddit.com/r/EtsySellers/)
**Rules:** I couldn't read them live (see the top). AutoModerator text from this sub, in third-party snapshots from late 2025: "Any type of self promotion (including promotion of services for Etsy sellers) is also not allowed here." The weekly "Self Promotion & Store Milestones" thread (a new one each Monday; "Week of November 02, 2026" is the current one) is for shop links: "This is a post for promotional only." So the post has no link and no product name, and it doesn't go in the weekly thread. **Read the sidebar first.** If it bans market-research posts, skip to #3. If the sub asks for a flair, pick its question or advice one.
**Fits because:** ~261k members, up 50k in a year. These are the sellers who see Etsy's EPR fields, many of them in the US, UK, Canada and Australia.
**Title:** Sellers outside the EU: what are you doing about Etsy's EPR number fields for Germany, France and Spain?
**Post:**
> Etsy now asks for EPR registration numbers for Germany, France and Spain, and says it's up to each seller to work out which rules apply. From outside the EU that seems to mean a separate registration per country (LUCID in Germany, a unique ID through an eco-organisation like Citeo in France), sometimes a paid local representative, and different labels.
>
> Disclosure: I'm looking at building a simple per-country checklist for this, so I'm trying to understand how sellers actually handle it. There's no link and nothing for sale in this post.
>
> If you ship to EU customers from the US, UK, Canada or Australia:
> - What did you do: register yourself, pay a representative or a service, stop shipping to some countries, or leave the fields empty for now?
> - Where did you get stuck: working out which countries apply, the cost, the labels, or the forms?
> - Would a country-by-country plan have been worth paying for, or would you only pay for someone to do the registrations?

**Afterwards:** reply to every comment within a few hours; that's where the demand evidence is. If someone asks where to sign up, the sub's rule still applies: ask the mods before posting the link. If the post doesn't appear, message the mods rather than posting it again.

## 3. UK Business Forums: Overseas Trade (https://www.ukbusinessforums.co.uk/)
**Rules:** the Terms of Membership prohibit "any unsolicited or unauthorised advertising or promotional material or any other form of similar solicitation (spam)". I found no board where a builder may post a link for feedback, so no link.
**Fits because:** UK sellers have been outside the EU since Brexit and face the same per-country registrations. The research's source thread, "Germany EPR Compliance (packaging)" (https://www.ukbusinessforums.co.uk/threads/germany-epr-compliance-packaging.417648/), shows the conflicting advice, but it dates from April 2022 (17 replies). Start a new thread in Overseas Trade (under Running Your Business) and mention the old one rather than reviving it.
**Needs:** a UKBF account.
**Title:** UK sellers shipping to EU customers: how are you handling packaging EPR now PPWR applies?
**Post:**
> Since 12 August 2026 the EU packaging regulation applies with no minimum sales threshold, and each country still runs its own register: LUCID in Germany, a unique ID through an eco-organisation in France, and in some countries an authorised representative. Etsy now asks its sellers for the German, French and Spanish numbers. UK businesses have been outside the EU since Brexit, so every EU country you ship to looks like a separate registration.
>
> There's a 2022 thread here, "Germany EPR Compliance (packaging)", where one member was quoted about 400 EUR a year in admin fees and another was filing the German reports themselves. I'd like to know where people have landed under the new rules.
>
> Disclosure: I'm looking at building a simple country-by-country checklist for small sellers (what to register, a rough cost, which labels), so I'm trying to understand the problem before building anything. I'm not linking to anything.
>
> If you sell to EU consumers from the UK:
> - Did you register yourself, use a representative or compliance service, or stop shipping to some countries?
> - What was hardest to work out?
> - Would a plan like that be worth paying for, or would you only pay someone to do the registrations?

**Afterwards:** reply to every post the same day. UKBF regulars often answer with their own setup, which is exactly the evidence you're after.

## 4. r/Etsy (https://www.reddit.com/r/Etsy/)
**Rules:** I couldn't read them live. The sub describes itself as "The unofficial community for all things Etsy, buyers and sellers both welcome." Its 2023 mod guideline reads: "Outside of these Friday critique requests and the weekly stickied promotional post, direct links to your Etsy shop are not allowed in this sub!" I found nothing about tools or services, so treat a link as promotion: no link. **Read the sidebar first.**
**Fits because:** 325k members, many of them sellers who got the same prompt. It's also the place to test the review's kill criterion: do sellers just stop shipping to the EU?
**Title:** Has the EU packaging (EPR) registration made you stop shipping to any EU countries?
**Post:**
> Etsy's Shop Manager now asks for EPR numbers for Germany, France and Spain, and since August the EU rules apply to sellers of every size, with each country running its own register and fees. From what I've read, sellers outside the EU end up doing one of three things: register in each country, pay a representative to handle it, or stop shipping to the countries where it costs the most.
>
> Disclosure: I'm looking at building a simple per-country checklist for this, so I'm trying to learn what sellers actually do. No link here.
>
> If you sell from outside the EU: which of those did you pick, and what decided it? And if you stopped shipping somewhere, was that a real chunk of your sales or barely any?

**Afterwards:** reply to every comment within a few hours. Several "I just stopped shipping there" answers count as evidence against the idea, so record them as such.

## Dropped
- **Etsy Community forums** (LAUNCH.md): no rule dropped it; I couldn't check it. The boards say "Sign in for full access" / "Log in to read", the Community Policy (https://www.etsy.com/legal/community) refused the fetch (HTTP 403), so its promotion rule can't be quoted, and the EPR threads I found are older ones in Technical Issues. Posting also needs an Etsy account. If you have one, read the policy signed in; a no-link question there would be the review's second community.
- **r/shopify**: its own description says "this is a promotion-free sub and the rules (please read them) are very strictly enforced." Shopify merchants are reached through #1, where a link is allowed.
- **r/ecommerce** (688k): "A community dedicated to the design and implementation of eCommerce sites." That means store builders and marketers more than one-person Etsy shops, and its rules couldn't be read from here.
- **Show HN, Indie Hackers**: the buyers aren't developers or founders.
- **Etsy seller Facebook groups**: you can only see their rules after joining, so they can't be checked.

## Paid option (inside the new window, once the page answers)
**Reddit promoted post: $100 over 7 days (~$14 a day)** · targeting: people active in r/EtsySellers and r/Etsy (Reddit Ads' community targeting), located in the US, UK, Canada and Australia · proves: 50+ unique visitors from Etsy sellers within 7 days, and whether at least 5 of them (5%, the build bar) join the waitlist.
This beats posting because both subreddits where the buyers are ban service links, so no organic post can send them to the page. A promoted post is labelled as such and is Reddit's own way to show them one. For the ad, adapt the #2 text: change its disclosure to "I'm building this; the waitlist page is below" and add the link. Ad review can take up to a day, so start it the day you post #1. Reddit shows an estimated cost per click before you pay. If it's well above $2, $100 buys fewer than 50 visitors; keep the cap and judge on what comes in. Within the $300 owner budget; you decide and pay.

## After you post
Run `/launch packpass posted` with where and when, plus the post's URL if you have it. That's logged to `launch-log.json`, which feeds the Ideas page and RepoHQ's `get_idea_pipeline`.

Sources checked 2026-11-08: page addresses (new: 404, old: 402); Shopify Community FAQ (https://community.shopify.com/faq), Ask & Offer board (https://community.shopify.com/c/ask-offer/294) and its EPR thread (https://community.shopify.com/t/how-are-shopify-merchants-handling-eu-packaging-epr-ppwr/672726, posted 26 Aug, last reply 23 Oct); member counts and sub descriptions from GummySearch, updated 7–8 Nov (https://gummysearch.com/r/EtsySellers, /r/Etsy, /r/shopify, /r/ecommerce); r/EtsySellers weekly-thread text from a third-party snapshot dated 2026-01-03 (https://reddit.sentinel-team.org/posts/1o5fkyu/snapshots/2026-01-03T03%3A00%3A18.700854Z) and the AutoModerator line from search results of late-2025 snapshots; r/Etsy's 2023 guideline (https://www.reddit.com/r/Etsy/comments/14ylt9c/, read via a copy); UKBF Terms (https://www.ukbusinessforums.co.uk/help/terms-conditions/) and the 2022 thread (open, 17 replies); Etsy Community front page (sign-in wall) and Community Policy (403); Etsy's EPR collection for France, Germany and Spain (https://www.valueaddedresource.net/etsy-petition-eu-packaging-rules/, 11 Sep 2026).
