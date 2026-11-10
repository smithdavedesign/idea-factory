# stayproof — roadmap

## Suggested stack
- Next.js on Vercel: one codebase for host dashboard and cleaner web page, free tier.
- Supabase (Postgres + auth) free tier: hosts, listings, stays, photo records.
- Cloudflare R2 or Supabase Storage free tier: photo files.
- pdf-lib: claim packet PDF with no server dependency.
- node-ical: parse Airbnb iCal booking feeds.
- Twilio-free path first: host copies the cleaner link into their own text thread (no paid SMS in M1).

## M1 — cleaner link to claim packet (one weekend)
Deliverables:
- Host creates a listing with a room shot list and pastes an iCal URL.
- Each checkout generates a cleaner link with a random token.
- Cleaner page captures arrival and departure photos per room, stores server timestamp and SHA-256.
- Host page lists stays with photo sets and a damage flag.
- Claim packet PDF export for one stay.

Exit criteria (testable):
- Importing an iCal with 2 bookings creates 2 stays with the correct check-in and checkout dates.
- POST of a photo to a valid cleaner token returns 201 and stores a SHA-256 equal to the hash of the uploaded bytes; an invalid or expired token returns 404.
- Uploading the same photo bytes twice to different rooms keeps both records with distinct server timestamps.
- Flagging damage on a stay with checkout 2026-03-01 shows 13 days remaining on 2026-03-02 and 0 on 2026-03-15.
- The claim packet PDF for a stay with 3 rooms contains 3 before/after pairs and the booking dates.

## M2 — cleaner compliance
Deliverables: reminders for cleaners who haven't uploaded, required-shot enforcement, host email digest.
Exit criteria:
- A stay with a missing required room photo shows "incomplete" and blocks the green status.
- A reminder job selects exactly the stays past checkout+2h with no departure set.

## M3 — payments and pricing
Deliverables: Stripe checkout for $6/listing/mo, free tier of 1 listing, pay-per-packet $9 option.
Exit criteria:
- A free host adding a 2nd listing is blocked with a paywall response (402).
- A webhook for a paid subscription unlocks additional listings within one request.

## M4 — stronger evidence
Deliverables: RFC 3161 timestamp per photo set, tamper check page.
Exit criteria:
- `openssl ts -verify` on a stored token exits 0 and a one-byte change to the photo reports a mismatch.
