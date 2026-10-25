# ownshot — roadmap

Suggested stack: Next.js (one app for pages and API routes, deploys free on Vercel); Postgres via Supabase free tier (auth, storage and rows in one place); `openssl`-compatible RFC 3161 client in Node (`node-forge` or shelling out to `openssl ts`) against FreeTSA (free trusted timestamps); `pdf-lib` for packet PDFs (no server rendering cost); `exifr` for EXIF; Stripe Checkout for payment (flat fee, no card held by agents).

## M1 — Timestamped case file + appeal packet (one weekend)
Deliverables:
- Upload an image to a listing case file; store the file, SHA-256 hash and EXIF capture date.
- Request an RFC 3161 token from FreeTSA for the hash and store it with the file.
- Case file page listing originals, process shots and notes.
- Export a ZIP: originals, `.tsq`/`.tsr` files, certificate chain, a PDF summary and a verify-it-yourself page.
- Landing page with a "build my packet" waitlist form.

Exit criteria (a test could run):
- POST an upload of a 1 MB JPEG and the response includes a 64-hex-char `sha256` equal to the file's actual SHA-256.
- The same upload stores a `.tsr` token and `openssl ts -verify` against the FreeTSA CA exits 0 for that file's hash.
- A JPEG with EXIF `DateTimeOriginal` 2026-03-02T10:15:00 shows `capturedAt` of that exact value; a JPEG with no EXIF shows `capturedAt` null and the packet says "no camera date".
- GET export for a case file with 3 images returns a ZIP containing exactly 3 originals, 3 `.tsr` files and 1 `summary.pdf`.
- Changing one byte of an original makes the packet's included verification script report MISMATCH for that file only.
- If FreeTSA returns an error, the upload is saved with `timestamp: pending` and a retry job sets it within 3 attempts.

## M2 — Accounts, payment and flagged-listing quick start
Deliverables:
- Email-link sign-in, per-seller dashboard of case files.
- Stripe Checkout: $9 one-time packet unlock and $12/month plan.
- "Flag received" wizard: paste listing URL and email text, get an attach-this checklist and a drafted appeal message.

Exit criteria:
- A free account can create case files but GET export returns 402 until a payment record exists.
- A Stripe test-mode webhook `checkout.session.completed` for the $9 price unlocks export for exactly that case file.
- The wizard given an email containing "Creativity Standards" returns a draft message that includes the listing URL and a numbered list of at least 4 attachments.
- A seller cannot read another seller's case file (GET returns 404).

## M3 — Copy sweep spike
Deliverables:
- Spike comparing a perceptual-hash (pHash) match against marketplace search results and a user-side browser extension approach; measure cost per shop per month.
- If under $2 per shop per month, weekly "your photo appears on …" email for the top 20 listings.

Exit criteria:
- pHash distance of a photo and its 50%-scaled, recompressed copy is at most 8 of 64 bits in a unit test; unrelated photos are above 20.
- A fixture set of 10 known copies and 40 unrelated images yields at least 8 of 10 hits with at most 2 false positives.
- Cost report states measured dollars per shop per month in the repo.

## M4 — Etsy listing link (optional, after demand is proven)
Deliverables: Etsy Open API v3 OAuth, import listing photos into case files, flag listings with no timestamp yet.

Exit criteria:
- OAuth callback stores a token and `GET /shop/listings` returns a mocked 25-listing page that creates 25 case files.
- A listing with no timestamped originals is marked "unprotected" and one with at least one token is marked "protected".
