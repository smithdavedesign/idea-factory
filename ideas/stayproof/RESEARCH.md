# stayproof — research

## Summary
Small Airbnb hosts and co-hosts lose AirCover damage claims because they can't show the damage happened during the guest's stay: the cleaner's photos are missing, taken at the wrong time, or not tied to the stay.
stayproof sends the cleaner a no-install link per turnover that asks for arrival and departure photos, timestamps them server-side, and turns any stay into a claim packet (before/after pairs, timeline, deadline countdown).
Discovery mode (no seeds). Demand evidence is mostly secondary (host forums, vendor blogs); that is the main open question.

## Evidence of the problem
- Hosts report AirCover denials for missing photo evidence. A news report describes a denial over a carpet stain for lacking "full-view photo evidence": https://www.scrippsnews.com/us-news/airbnb-initially-denies-claim-after-guests-left-almost-8-000-in-stolen-property-and-damages
- Hosts say AirCover did not help when it mattered: https://www.ktvu.com/news/airbnb-under-fire-as-hosts-share-concerns-over-aircover-promises and https://community.withairbnb.com/t5/Support-with-your-bookings/AirCover-What-s-the-point/m-p/2070909
- Without photos, Airbnb "might simply say they can't verify the damage happened during a guest's stay"; arrival photos from the cleaner are the only proof if damage existed before cleaning: https://strspecialist.com/win-your-aircover-claim-proof-deadlines
- Causation disputes: a claim fails if evidence can't tie damage to the specific stay: https://www.redawning.com/vacation-rentals/pm/post/airbnb-aircover-claims-property-managers
- A host forum thread describes a claim denied because the cleaner's photo was from before the stay and damage was reported only after checkout: https://strspecialist.com/community/thread/guest-damaged-furniture-didnt-report-now-what
- Deadlines are tight and sources disagree: 14 days from checkout (or before next check-in) to file via the Resolution Center, 30 days to submit documentation, incomplete files closed and denied (secondary sources): https://www.hostfully.com/blog/airbnb-damage-policy/ and https://www.timemark.com/blog/how-airbnb-handles-cleaning-disputes
- Some hosts win with third-party evidence (cleaner before photos, plumber report, camera video): https://www.traverselegal.com/blog/aircover-denied-host-legal-options/

## Who pays
- **Buyer:** a co-host or small manager running 3–15 listings who hires cleaners, and who carries the loss when a claim is denied. Not the cleaner.
- **Price point:** $6 per listing per month (about $18–$90/mo for 3–15 listings), or $9 per claim packet pay-as-you-go. This is my proposal, not a researched figure.
- **Evidence they pay for adjacent workarounds today:**
  - Turno charges about $8–$10 per property per month for checklists with required photos for hosts' own cleaners (sources conflict on exact price): https://www.capterra.com/p/166734/Turno/ and https://strspecialist.com/reviews/turno-cleaning-marketplace-review
  - A turnover clean costs roughly $75–$150, so a single denied damage claim of several hundred dollars outweighs a year of software: https://strspecialist.com/reviews/turno-cleaning-marketplace-review
  - Hosts buy separate short-term-rental insurance as a backstop (Safely): https://safely.com/articles/airbnb-guest-damages/
- No source I found shows hosts paying specifically for a claim packet. Unproven.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Turno (cleaning ops) | free marketplace; ~$8–$10/property/mo own cleaners | Photo checklists exist, but cleaners must use the Turno app, and it is built around scheduling, not claim packets or deadline tracking |
| Vacarya guides / strspecialist / Hostfully blogs | free | Advice only; the host does the assembly by hand |
| Timemark-style timestamp camera apps | free/low | One photo app, not tied to stays, no packet |
| Safely / own STR insurance | policy premiums | Insurance, not evidence |
| Airbnb AirCover | free | The thing being claimed against; strict evidence standards (Hostfully says April 2026 stricter): https://www.hostfully.com/blog/airbnb-damage-policy/ |

## Technical notes
- Cleaner flow: SMS/WhatsApp link per turnover, mobile web camera capture (no install), guided shot list per room, server-side timestamp, EXIF kept.
- Evidence integrity: store original, SHA-256 hash, server receipt time; optionally RFC 3161 timestamp later.
- Claim packet: PDF with before/after pairs per room, timeline, deadline countdown, and a draft host message. Draft text is a template; it does not guarantee Airbnb's outcome.
- Host calendar: iCal import of Airbnb booking dates (no Airbnb API needed).
- Stack fits free tiers (Next.js, Supabase/Turso, Cloudflare R2 free tier, pdf-lib).

## Risks & open questions
- Turno can add a claim-packet export and already has photo checklists.
- Deadlines and evidence rules come from secondary sources; Airbnb's own policy must be verified before shipping any deadline numbers.
- Pain arrives after a damage event; hosts must adopt it before they need it.
- Cleaners must actually take the photos; adoption depends on a very light flow.
- Airbnb may not accept third-party timestamps as stronger than plain photos.
- Related idea permitly (short-term-rental permit tracker) was passed; this is a different problem (evidence), but the same buyer segment and same weak-demand-evidence risk.

## Sources
- https://www.scrippsnews.com/us-news/airbnb-initially-denies-claim-after-guests-left-almost-8-000-in-stolen-property-and-damages
- https://www.ktvu.com/news/airbnb-under-fire-as-hosts-share-concerns-over-aircover-promises
- https://community.withairbnb.com/t5/Support-with-your-bookings/AirCover-What-s-the-point/m-p/2070909
- https://strspecialist.com/win-your-aircover-claim-proof-deadlines
- https://strspecialist.com/community/thread/guest-damaged-furniture-didnt-report-now-what
- https://www.redawning.com/vacation-rentals/pm/post/airbnb-aircover-claims-property-managers
- https://www.hostfully.com/blog/airbnb-damage-policy/
- https://www.timemark.com/blog/how-airbnb-handles-cleaning-disputes
- https://www.traverselegal.com/blog/aircover-denied-host-legal-options/
- https://www.capterra.com/p/166734/Turno/
- https://strspecialist.com/reviews/turno-cleaning-marketplace-review
- https://safely.com/articles/airbnb-guest-damages/
