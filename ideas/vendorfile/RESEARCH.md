# vendorfile — research

## Summary
- Since 3 June 2026 every SEC-registered investment adviser under $1.5B AUM must have written policies to oversee the service providers that touch customer data, with due diligence and monitoring, and the provider must tell the adviser of a breach within 72 hours.
- Small RIAs are scrambling: advisers say vendors don't answer requests for written assurances, and incident-response plans are written "to check the box". The file that proves oversight happened is what an examiner asks for.
- vendorfile is a flat-price vendor-oversight file for 1–10 person RIAs: vendor register, request emails with a 72-hour notice clause, reminders and reply tracking, and an exam-ready binder as a PDF.

## Evidence of the problem
- Compliance date for smaller entities (RIAs under $1.5B AUM) is June 3, 2026; larger entities were Dec 3, 2025 (Sidley, https://www.sidley.com/en/insights/newsupdates/2026/04/us-sec-regulation-s-p-compliance-deadline-approaching-for-smaller-entities).
- The SEC small entity guide says covered institutions must have written policies for oversight of service providers, "including through due diligence and monitoring", so providers protect customer information and notify the adviser as soon as possible and no later than 72 hours after becoming aware of a breach (https://www.sec.gov/files/rules/final/2024/regulation-s-p-small-entity-compliance-guide.pdf, https://www.sec.gov/files/34-100155-fact-sheet.pdf). The firm stays responsible for customer notices even if a vendor sends them.
- Practitioners quoted at the deadline: client readiness "ranged from full preparedness to total surprise"; advisers and vendors "are struggling to define 'reasonable assurances'"; some providers "are simply not responding to advisors seeking contractual or written assurances"; firms without a current data-flow map can't meet the 30-day notice (WealthManagement, https://www.wealthmanagement.com/regulation-compliance/rias-scramble-to-meet-reg-s-p-compliance-deadline).
- Law-firm and consultant guidance continues to flag that the SEC will prioritize exams in 2026 (DWT, https://www.dwt.com/blogs/privacy--security-law-blog/2026/05/reg-sp-smaller-entities-june-2026-deadline; Kroll, https://www.kroll.com/en/publications/financial-compliance-regulation/regulation-s-p-amendments, not fetched, 403).
- Caveat: this is vendor/lawyer commentary. No adviser interview or forum thread asking for this specific tool was found.

## Who pays
- **Buyer:** the chief compliance officer, who at a 1–10 person RIA is usually the founder/principal.
- **Price point:** $49/month or $490/year flat, unlimited vendors.
- **Evidence they pay for the same job today** (Techvera, 10-person RIA reference, https://techvera.com/resources/blog/what-it-costs-to-run-compliant-ria-technology-stack-in-2026):
  - compliance platform (RIA in a Box, COMPLY, Orion) $6,000–$20,000/yr;
  - contract remediation to add Reg S-P breach-notice language $3,000–$8,000 one-time to outside counsel;
  - vendor risk register maintained by an outside consultant $5,000–$15,000/yr;
  - the article estimates 2–4 hours per vendor for annual SOC 2 review, 8–12 material vendors.
  These are one blog's estimates for a 10-person firm and the article gives no solo-firm figure. A $49/month tool sits far below every one of them, but that is not proof a solo adviser will pay it.
- Smart RIA lists a basic plan at $50/month flat on Capterra (https://www.capterra.com/p/158544/Smart-RIA/), a price anchor for small-adviser software, though it is not a vendor-oversight tool.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| COMPLY (RIA in a Box) vendor due diligence | Free tier up to 5 vendors per its marketing; paid unpublished, demo only; platform $6k–$20k/yr per Techvera | Bundled in a big platform; 5-vendor cap is below a typical vendor list; sold via demo (https://comply.com/?p=6143) |
| Outside counsel / vCISO | $3k–$8k one-time contract fixes; $5k–$15k/yr register | Priced for 10+ person firms |
| Spreadsheet + email + shared folder | free | No reminders, no reply tracking, no binder; the status quo and the main competitor |
| Smart RIA | $50/mo basic (Capterra) | General RIA CRM/compliance, not built around vendor evidence |

## Technical notes
- Core is CRUD plus scheduled email: vendors, contact, data types accessed, contract clause status, SOC 2 / attestation expiry, last review date.
- Request emails sent from the adviser's own address via SMTP/Gmail API or sent as copy-paste templates in M1; replies tracked by a forwarding address (inbound parse) in M2.
- PDF binder generation from stored records (server-side HTML to PDF).
- Not legal advice: templates need a disclaimer and a review-by-counsel notice. No customer data stored: only vendor metadata.

## Risks & open questions
- Free COMPLY tier (up to 5 vendors) and the "spreadsheet is good enough" status quo; the prior reviewer verdicts on credclock and listvault passed on the same shape (a tracker whose competitor is a free spreadsheet).
- Zero network among RIAs; reachable via RIA compliance communities and LinkedIn, untested.
- Whether a solo adviser sees the oversight file as a $49/month need or an annual afternoon task.
- Template liability, and the rule has been in force since June, so the urgency window may be closing.
- Whether examiners expect a specific form; the rule asks for policies, not a format.

## Sources
- https://www.sidley.com/en/insights/newsupdates/2026/04/us-sec-regulation-s-p-compliance-deadline-approaching-for-smaller-entities
- https://www.sec.gov/files/rules/final/2024/regulation-s-p-small-entity-compliance-guide.pdf
- https://www.sec.gov/files/34-100155-fact-sheet.pdf
- https://www.wealthmanagement.com/regulation-compliance/rias-scramble-to-meet-reg-s-p-compliance-deadline
- https://techvera.com/resources/blog/what-it-costs-to-run-compliant-ria-technology-stack-in-2026
- https://comply.com/?p=6143
- https://www.capterra.com/p/158544/Smart-RIA/
- https://www.dwt.com/blogs/privacy--security-law-blog/2026/05/reg-sp-smaller-entities-june-2026-deadline
