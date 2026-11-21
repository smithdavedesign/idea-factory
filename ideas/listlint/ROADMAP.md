# Roadmap — listlint

Suggested stack:
- Vite + TypeScript static app: runs fully in the browser, free on Vercel Hobby.
- `exifr`: reads EXIF and XMP in the browser.
- `c2pa` (open-source JS reader): reads Content Credentials.
- A small perceptual-hash function (dHash on a canvas): no server needed.
- Vitest with fixture images: checks run without a browser.
- Playwright: one end-to-end drop-a-folder test.

## M1 — Photo checker (one weekend)
Deliverables:
- Drop a folder or files; each photo gets a label from its metadata.
- Table of photos with label and the reason (for example "Software: Adobe Photoshop").
- Everything runs locally; no network calls after page load.

Exit criteria:
- A fixture JPEG with a camera make/model and no Software tag returns `likely-unedited`.
- A fixture JPEG with Software = "Adobe Photoshop 25.0" returns `edited` with that reason.
- A fixture PNG carrying a C2PA manifest with an AI-generated assertion returns `edited`.
- A fixture JPEG with all metadata stripped returns `unknown`.
- Loading the page and scanning 3 fixtures makes zero network requests after the initial load.

## M2 — Group by listing and find originals
Deliverables:
- Group photos by `listing-id_NN.jpg` filename or by an Etsy listings CSV export.
- Flag listings with no `likely-unedited` photo.
- Perceptual-hash match from each edited photo to the likely original in the same listing.

Exit criteria:
- Given a CSV with 3 listings and fixtures where listing 2 has only edited photos, the report flags exactly listing 2.
- An original and a version of it cropped by 10% have a dHash Hamming distance of 10 or less; two unrelated photos have a distance above 20.
- A listing whose edited photo has a matching original names that original as the suggested photo.

## M3 — Evidence pack export
Deliverables:
- Per-listing zip: the chosen photo, a JSON of its metadata, its SHA-256 and the date checked.
- Shop-wide CSV summary.
- Plain-language disclaimer page.

Exit criteria:
- Exporting listing 1 produces a zip with exactly 3 files and a SHA-256 that matches the photo bytes.
- The CSV has one row per listing and a header row.
- The exported text never contains the word "compliant".

## M4 — Sell it
Deliverables:
- Free scan of up to 25 photos; Stripe link for $19 one-off full-shop scan or $9/month.
- Landing page with the sample report.

Exit criteria:
- A scan of 26 photos without a licence key shows only the first 25 results and an upgrade prompt.
- A valid licence key unlocks all results; an invalid key does not.
