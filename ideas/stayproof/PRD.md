# stayproof — PRD

## Problem
When a guest damages an Airbnb listing, the host must prove the damage happened during that stay, usually within 14 days of checkout. Hosts with cleaners often have no arrival photo, or a photo that can't be tied to the stay, and the claim is denied (see RESEARCH.md: Scripps News carpet-stain denial, host forum threads on cleaner photos). Existing cleaning apps (Turno) need the cleaner to install an app and don't produce claim packets.

## Target user
A co-host or small manager with 3–15 listings who hires independent cleaners and pays for the losses. Their painful moment: a cleaner texts "there's a burn on the couch" after checkout and the host has nothing dated from before the stay.

## Competitors & gap
Turno (~$8–$10/property/mo) covers scheduling and photo checklists inside its app; guides from Hostfully, Vacarya and strspecialist are free advice; timestamp camera apps are generic. Gap: a no-install cleaner link, photos tied to a specific booking, and a ready claim packet with a deadline countdown.

## MVP scope
- Host adds listings and imports bookings from the Airbnb iCal feed.
- Per turnover, an SMS/WhatsApp link opens a mobile web page for the cleaner (no login, no install).
- Guided shot list per room (host-defined), required before/after photos, server-side timestamp and SHA-256 hash.
- Host dashboard shows each stay with arrival and departure photo sets and a "damage found" flag with notes.
- One-click claim packet PDF: before/after pairs, timeline, booking dates, draft host message.
- Deadline countdown from checkout once a damage flag is raised, with the 14-day and 30-day windows shown as "verify with Airbnb" values.
- Free for 1 listing; paid per listing monthly.

## Non-goals
- Not insurance; no filing with Airbnb on the host's behalf.
- No cleaner scheduling or payments (Turno's area).
- No Airbnb API integration, no VRBO/Booking.com in M1.
- No guest-facing features or camera surveillance.

## Success metrics
- 30 hosts reach the first cleaner link in 4 weeks from 300 targeted visitors (10% of visitors).
- 60% of sent cleaner links return a full photo set within 24 hours of checkout.
- 5 hosts pay for a listing within 8 weeks at $6/listing/mo.
- At least 3 of 10 interviewed hosts say a packet like this would have changed a past denied claim.

## Open questions
- What exactly are Airbnb's current claim windows and evidence rules? (Sources conflict.)
- Does Airbnb weigh third-party timestamps more than plain photos?
- Will cleaners comply with a required photo flow?
- Will hosts pay before a damage event happens, or only after?
