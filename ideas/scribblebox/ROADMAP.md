# Scribblebox — Roadmap

## M1 — Upload to watermarked toy-box preview (one weekend)
Deliverables:
- Upload page accepting JPG/PNG/HEIC up to 10 MB.
- Background removal and crop for a drawing photo.
- One template (toy box) rendered server- or client-side with child's name, age and a blurb.
- Watermarked PNG preview.
- Files deleted after 7 days.

Exit criteria (testable):
- POST /api/preview with a valid 1200x1600 JPG and name "Mia", age 6 returns 200 and a PNG with the watermark flag set, within 30 seconds.
- POST /api/preview with a 12 MB file returns 413; with a .exe returns 415.
- The blurb endpoint returns 20–300 characters and never contains a real brand from the blocklist (e.g. "Lego", "Barbie", "Kellogg").
- A job older than 7 days is removed by the cleanup function (test with injected clock).
- A fully white image returns a 422 "no drawing found" error rather than a blank box.

## M2 — Payment and download
Deliverables: Stripe Checkout for $9 single and $19 bundle; unwatermarked PNG and 300 DPI PDF; email link.
Exit criteria:
- A webhook for checkout.session.completed marks the job paid and a signed download URL returns 200 with a PDF of 2550x3300 px at letter size.
- The same URL after 7 days returns 410.
- An unpaid job's download URL returns 402.

## M3 — More templates and papercraft
Deliverables: cereal box and book cover templates; fold-out papercraft PDF with fold lines.
Exit criteria:
- All three templates render for the same upload and each output passes a dimension check.
- The papercraft PDF has 1 page with fold lines at declared coordinates (snapshot test).

## M4 — Launch and measure
Deliverables: landing page, share page, analytics events for upload, preview, checkout, share.
Exit criteria:
- Events upload_started, preview_ready, checkout_started, paid and shared are each recorded once per action (integration test).

## Suggested stack
- Next.js on Cloudflare Pages: free tier allows commercial use and has cheap edge compute.
- Canvas/SVG compositing client-side (sharp on the server if needed): zero model cost and keeps photos local longer.
- @imgly/background-removal (runs in browser): no API cost.
- Cloudflare R2 with a lifecycle rule for 7-day deletion.
- Stripe Checkout: no card is held by agents; David enables it.
- Free-model blurb via LiteLLM: near-zero cost.
