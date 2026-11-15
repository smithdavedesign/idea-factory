# coiready — research

## Summary
From 2 Nov 2026 Amazon requires $1M liability cover from any seller with a listing in an "enhanced safety" category (11 categories, including supplements, cosmetics, children's products, lithium batteries, mattresses, small kitchen appliances, tires), whatever their sales, and it applies to years-old listings too. Sellers must upload a certificate of insurance (COI) that meets about 13 specific criteria, and Amazon's forum shows the same certificate being rejected over and over for small wording and name-matching errors. coiready is a pre-flight checker: upload the COI PDF, get a pass/fail per Amazon criterion and a ready-to-send fix request for the broker.

## Evidence of the problem
- Amazon's own forum notice about the change (posted 3 Sep 2026) had 4,800 views and 52 replies by 2 Nov 2026; the rule "took effect today" and applies "to both new and existing listings", with no sales threshold for the enhanced-safety categories. (https://ppc.land/amazon-forces-1m-cover-on-small-safety-category-sellers-from-november-2/)
- Small sellers in these categories were previously exempt under the $10,000/month trigger; the new rule removes that. The same article notes it is unclear what happens to sellers with no cover on day one and how case-by-case exceptions work. (same source)
- Seller Forums, "Certificate of Insurance rejected" (555 views, 15 replies): a seller renewed with the same certificate as last year, changed only the date, and was rejected: "Your proof of insurance does not name 'Amazon.com Services LLC and its affiliates and assignees' as an additional insured." The seller said the policy itself named Amazon on page 45; replies said the certificate itself must show it. Amazon's reply was only that the case was "under review by our partner team". (https://sellercentral.amazon.com/seller-forums/discussions/t/e0fe556d-c41a-4ba1-bd18-6aad1984e56c)
- Seller Forums, "Certificate of Insurance keeps being rejected": Amazon staff replied that Amazon was listed as a Certificate Holder but needs to be an Additional Insured, and listed nine requirements (occurrence-based, $1M per occurrence and aggregate, deductible at most $10,000 shown on the certificate, covers all listed products, Amazon as additional insured, named insured matches the legal entity, carrier rated A- by S&P or AM Best, signed, 30 days' cancellation notice). (https://sellercentral.amazon.com/seller-forums/discussions/t/b63e560c-251c-4d98-a683-2cf5415e5da6)
- Insurer-side guidance lists the common causes of rejection: insurer name not matching the "Insurer(s) Affording Coverage" box, a standard COI without the endorsement wording, and a claims-made policy where occurrence is required. (https://www.assureful.com/blog/amazon-certificate-of-insurance and https://help.next-insurance.com/hc/en-us/articles/4417097180691-How-do-I-provide-proof-of-coverage-to-Amazon)
- A vendor report says Amazon emails affected sellers and gives them 45 days to submit proof before listings can be deactivated. I could not confirm this against an Amazon notice. (https://ppc.land/amazon-forces-1m-cover-on-small-safety-category-sellers-from-november-2/ and https://myamazonguy.com/news/amazon-liability-insurance-requirements/)

## Who pays
- **Buyer:** a small Amazon seller (roughly $1k–$100k/month, often a solo owner or two-person team) with at least one listing in an enhanced-safety category who now has to get a compliant COI uploaded inside the deadline. Secondary buyer: Amazon-seller consultants, prep centers and aggregators who handle compliance for many sellers.
- **Price point:** $19 one-time for a checked certificate with a fix list, or $39/year including renewal reminders and re-checks. Agencies and consultants $9 per extra certificate in a pack. This is a proposal, not something I found someone paying.
- **Evidence they pay for adjacent things:** the policy itself costs real money (quotes of $837–$2,200 a year for a seller at $500k–$1M revenue reported by EcomCrew; specialist brokers advertise "from $26 a month", and one insurer says most sellers pay $116/month or less), so a $19 check is small next to a listing deactivation risk. (https://www.ecomcrew.com/amazons-new-insurance-rules-hit-small-sellers-in-11-categories/ , https://www.assureful.com/blog/amazon-certificate-of-insurance)
- **Honest gap:** I found no one currently charging for a standalone COI checker, and no one asking for one. The paid workaround today is the broker, who bundles certificate help into the policy. So willingness to pay for the checker alone is unproven.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| Specialist Amazon-seller brokers (Assureful, Next Insurance, Marsh/Amazon Insurance Accelerator) | Policy from about $26/month; certificate help bundled | Only help if you buy from them; no check of a certificate you already hold or got elsewhere |
| Generic commercial general liability from any broker | About $50–$80/month per Assureful | Usually lacks the product liability extension and Amazon additional-insured wording, and the seller finds out only at rejection |
| Seller Forums / Amazon support | Free | Slow, generic rejection text, no line-by-line diagnosis |
| Seller-compliance consultants and agencies | Not found | Hourly, overkill for one document |
| Generic COI-tracking tools for contractors and property managers | Varies | Built for requesting certificates from vendors, not for the one certificate Amazon needs |
| Manual check against the Seller Central criteria page | Free | The seller has to know what ACORD 25 fields to read |

## Technical notes
- Input: a COI PDF (usually ACORD 25) or a photo. Most are text PDFs; scans need OCR. Extract insured name, insurer names, coverage type and occurrence/claims-made box, each limit, deductible, additional insured wording, dates, signature, cancellation notice.
- Check against the 13 criteria on Amazon's requirements page. The page sits behind Seller Central sign-in, so the rule list has to be maintained by hand from public summaries and the forum replies and tagged with a "last verified" date.
- Output: pass / fail / "can't tell from the certificate" per criterion, plus a short email to paste to the broker ("please add Amazon.com Services LLC and its affiliates and assignees as additional insured on the certificate, with named insured exactly '<name>'").
- Privacy: certificate contains business name and policy number only; delete uploads after 30 days. No Amazon login needed.
- An LLM does the extraction and the wording of the fix email; the pass/fail rules are deterministic code so they can be tested.

## Risks & open questions
- The rule is new; the list of 11 categories is not public in full and Amazon may soften or change it. The rule list may drift.
- Brokers may simply get good at producing compliant certificates, shrinking the problem. The rejections in the forum threads are 2–3 years old, which shows the problem is long-standing but also that it is quiet.
- Only a share of sellers are in the 11 categories; the number of affected small sellers is unknown.
- It is a one-time need per renewal, so revenue is small per customer; the renewal reminder is the only recurring hook.
- Insurance-advice liability: the tool must say it checks the certificate against a published checklist and is not insurance or legal advice.
- Amazon does not accept or reject on this tool's say-so, so the pass result is a prediction, not a guarantee.

## Sources
- https://ppc.land/amazon-forces-1m-cover-on-small-safety-category-sellers-from-november-2/
- https://www.ecomcrew.com/amazons-new-insurance-rules-hit-small-sellers-in-11-categories/
- https://sellercentral.amazon.com/seller-forums/discussions/t/e0fe556d-c41a-4ba1-bd18-6aad1984e56c
- https://sellercentral.amazon.com/seller-forums/discussions/t/b63e560c-251c-4d98-a683-2cf5415e5da6
- https://www.assureful.com/blog/amazon-certificate-of-insurance
- https://help.next-insurance.com/hc/en-us/articles/4417097180691-How-do-I-provide-proof-of-coverage-to-Amazon
- https://myamazonguy.com/news/amazon-liability-insurance-requirements/
