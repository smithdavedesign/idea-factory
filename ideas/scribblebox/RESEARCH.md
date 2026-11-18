# Scribblebox — research

## Summary
Parents and grandparents love turning a child's drawing into a "real" product, but the paid options jump from £18 keyrings to $75–$99+ books and plush toys, with nothing at a $9 impulse price. Scribblebox would turn one photo of a drawing into a boxed "official toy" (or cereal box, book cover) mock-up, delivered as a print-ready file and a shareable image. Evidence of demand for the *category* is solid; evidence for the *cheap digital* wedge is thin and must be tested.

## Evidence of the problem
- Parents have far more artwork than they can keep. An r/declutter thread ("Kids' drawings, what to do and what do you do") shows parents advising keep-favourites/photograph-and-toss, with guilt about tossing: https://lr.eu.psf.lt/r/declutter/comments/1dr7mx1/kids_drawings_what_to_do_and_what_do_you_do
- Parenting blogs recommend photographing art and keeping a few pieces, i.e. the workaround is "photo in a folder": https://www.theorganizedmama.com/what-to-do-with-kids-artwork/ and https://www.professorshouse.com/?p=816
- Grandparent gifts made from children's art are an established gift niche (see listings below).

## Who pays
- **Buyer:** parents, and above all grandparents and relatives buying a holiday/birthday gift from a child's drawing. Price point proposed: $9 for a digital boxed file, $19 for a bundle of 3 formats (toy box, cereal box, book cover) with print-ready PDF.
- **Evidence they pay for something like it today:**
  - Budsies plush from a child's drawing: coverage cites starting prices of $99 (current), earlier $69–$79: https://boredpanda.com/kids-drawings-into-toys-plush-company-budsies and https://www.demilked.com/?p=154285
  - Artkive printed art book: "25 Pieces — $75", about $89.99 total for a minimum book per a third-party estimate: https://www.artkiveapp.com/pricing and https://www.webull.com/news/15268674543559680
  - Child's drawing keyring £20 and bookmark £18 on Not On The High Street: https://www.notonthehighstreet.com/urbantwist/product/personalised-child-s-drawing-leather-and-wood-keyring and https://notonthehighstreet.com/thelittlepicturecompany/product/your-child-s-drawing-on-a-metal-bookmark
  - Custom children's book from drawings (Sketchy Notions): https://sketchynotions.com/products/custom-childrens-book
- **Gap:** all of the above are physical, slow and $18–$100+. There is no visible instant, $9 digital option, which is the proposed wedge. No source shows people paying $9 for it specifically; that is unproven.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Budsies | ~$99+ (reported, varies $69–$115 by date) | Slow made-to-order plush, expensive |
| Artkive | $75 for 25 pieces (book); app free with 40-photo limit | Archive/book, not a funny "product" artifact; $75+ |
| Not On The High Street sellers (keyring, bookmark, embroidery) | £18–£20 | Physical, UK, per-item, ship time |
| Etsy kids mockup templates | ~$1.49–$4.24 | Sold to designers (PSD/smart object), not a finished personalised result |
| Fiverr toy packaging designers | gig prices vary (not verified) | Manual, slow, designed for brands |
| Canva / free mockup sites | free | DIY effort; parents rarely do it |

Sources: https://www.etsy.com/listing/4385509459 , https://fiverr.com/samiravabi/design-toy-packaging-and-kids-product-boxes , https://blog.artkiveapp.com/post/best-grandparent-gifts-kids-art

## Technical notes
- Core is image processing, not generative AI: upload photo of drawing → auto crop/deskew → remove paper background (client-side or lightweight model) → composite into SVG/Canvas packaging templates (toy box, cereal box, book cover, trading card) with generated, clearly fictional brand names and a funny blurb ("Contains 1 imagination. Batteries not included.").
- Optional AI: a free-model call to write the blurb from the child's name/age and what the drawing is.
- Output: PNG for sharing and 300 DPI print-ready PDF (letter / A4) with fold lines for a papercraft box.
- Run cost near zero: client-side compositing; Vercel Hobby plus object storage with auto-delete after 7 days.
- Payments need a non-Hobby host eventually (Vercel Hobby forbids commercial use); Cloudflare Pages or similar is an alternative.

## Risks & open questions
- **Willingness to pay $9** versus free Canva/mockups: unproven, no source shows it.
- Free alternative: parents can already photograph and share the drawing. The product must be funnier/more finished than DIY.
- One-time, seasonal purchase (Nov–Dec peak, birthdays year-round); no retention.
- Children's images: privacy and consent. Store nothing long-term, no public gallery, no accounts for children, and avoid targeting under-13 users (COPPA); the buyer is the adult.
- Trademark: use fictional brands, never real toy/cereal marks.
- Easy to copy; moat is taste, templates and distribution.
- Search results gave no sales data for the mock-up niche, only listings.

## Sources
- https://www.artkiveapp.com/pricing
- https://boredpanda.com/kids-drawings-into-toys-plush-company-budsies
- https://www.demilked.com/?p=154285
- https://www.notonthehighstreet.com/urbantwist/product/personalised-child-s-drawing-leather-and-wood-keyring
- https://notonthehighstreet.com/thelittlepicturecompany/product/your-child-s-drawing-on-a-metal-bookmark
- https://lr.eu.psf.lt/r/declutter/comments/1dr7mx1/kids_drawings_what_to_do_and_what_do_you_do
- https://www.theorganizedmama.com/what-to-do-with-kids-artwork/
- https://www.etsy.com/listing/4385509459
- https://fiverr.com/samiravabi/design-toy-packaging-and-kids-product-boxes
- https://blog.artkiveapp.com/post/best-grandparent-gifts-kids-art
