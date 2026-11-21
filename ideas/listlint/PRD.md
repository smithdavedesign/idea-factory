# PRD — listlint

## Problem
Etsy's 22 Oct 2026 policy requires at least one unedited photo of the real item on most listings and bans AI-generated patterns and instructions. There is no grace period, and enforcement is planned for early 2027. A seller with hundreds of listings cannot tell which ones fail, cannot easily prove a photo is untouched, and faces automated takedowns with weak appeals (see RESEARCH.md, Evidence of the problem).

## Target user
An Etsy seller of physical goods or craft patterns with 50–2,000 listings, for whom the shop is a real income. Their painful moment: a best-selling listing is removed by an automated flag and they cannot show Etsy the original photo. They already pay $6–$30 a month for SEO tools.

## Competitors & gap
eRank, Marmalead, Alura and EverBee sell search optimisation; none checks photos against the new policy. Etsy's own warnings fire at upload and after removal. Nothing audits an existing catalogue or builds appeal evidence. The gap is real but unproven as a paid need (RESEARCH.md, Competitors).

## MVP scope
- Drop a folder of listing photos into the browser; nothing is uploaded anywhere.
- Read EXIF and C2PA data for each photo and label it Likely unedited, Edited (editing software or AI credential found), or Unknown (metadata stripped).
- Group photos by listing from a filename convention or an Etsy listings CSV export, and flag listings with no Likely-unedited photo.
- Use perceptual hashing to find, among a listing's photos, the one that is the likely original of an edited image.
- Show a shop-wide table: listing, photos checked, status, and the suggested photo to mark as the unedited one.
- Export a per-listing evidence pack (PDF or zip): the photo, its hash, its metadata and the date checked, for use in an appeal.
- Wording that says "evidence", never "compliant", with a link to Etsy's current policy.

## Non-goals
- Guaranteeing a listing will pass Etsy review.
- Detecting AI-generated images with a classifier.
- Using the Etsy API or editing listings (needs Commercial Access).
- Print-on-demand and digital-goods listings.
- Rewriting AI-generated patterns or instructions.

## Success metrics
- At least 40 of 50 fixture photos with known edit history get the correct label (80%).
- A scan of 500 photos finishes in under 60 seconds in a desktop browser.
- Of 20 sellers shown a sample report, at least 5 say they would pay $9 a month or $19 once (25%).
- At least 3 sellers send their own folder within 30 days of the first community post.

## Open questions
- Will Etsy's coming authorship tools make this redundant?
- Does the final policy wording change what counts as "unedited"?
- Are enough sellers without an unedited photo to make a tool worth buying?
- Which seller communities allow a post about it?
