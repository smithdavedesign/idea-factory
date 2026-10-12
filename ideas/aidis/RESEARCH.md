# RESEARCH.md

## Summary (3 lines)
Operators of conversational AI services in Hawaii must comply with the Hawaii AI Disclosure and Safety Act (Act 248) effective July 14, 2026, which mandates AI disclosures, minor protections, suicide prevention protocols, and annual reporting.
Non-compliance risks civil penalties up to $10,000 per violation under Hawaii's unfair and deceptive trade practices law.
Businesses using chatbots for customer service in Hawaii (e.g., Akia, Romaix) need tools to implement these requirements efficiently.

## Evidence of the problem
- Hawaii enacted Act 248 on July 14, 2026, requiring disclosures when users might believe they're interacting with a human, persistent disclaimers for minors, suicide hotline referrals, bans on profiling minors and generating sexual/content, parental tools, and annual reports to DOH. (Source: https://regulations.ai/regulations/RAI-US-HI-SB30010-2026)
- Businesses in Hawaii are already deploying chatbots: Akia helped Prince Waikiki hotel reduce guest request response time from 9 minutes to 4 minutes using an AI assistant. (Source: https://akia.ai/case-studies/expedite-guest-request-response-by-55)
- Romaix built an AI-powered chat assistant for a Hawaiian tour company to provide 24/7 support, personalized recommendations, and multilingual service. (Source: https://www.romaix.ai/blogs/ai-meets-aloha-ai-powered-chat-assistant-for-hawaiian-tour-company)

## Who pays (the buyer, a price point, and evidence they pay for a workaround today, with sources)
- Buyer: Operators of conversational AI services in Hawaii (e.g., customer service chatbots, AI companions, virtual assistants for tourism, healthcare, or retail businesses).
- Price point: Based on general AI compliance platform pricing for small businesses, a plausible flat price is $29/month per chatbot service, with discounts for multiple bots.
- Evidence they pay for a workaround today: Businesses already pay for general AI compliance services (e.g., Attestly reports small businesses spend $500-$2,000 for compliance platforms) and face potential fines up to $10,000 per violation, creating strong incentive to invest in compliance tools. (Source: https://attestly.io/blog/ai-compliance-cost-small-business)

## Competitors & alternatives (table: name, price, gap)
| Competitor | Price | Gap |
|------------|-------|-----|
| Disclosed (EU AI Act disclosure widget) | €19/mo Starter | Only covers disclosure logging for EU AI Act Article 50(1); lacks minor protections, suicide protocols, mental health care bans, content filters, parental tools, Hawaii DOH reporting. |
| Normis (AI chatbot disclosure & labels) | Free tier available | Focuses on EU AI Act Article 50 transparency; does not address Hawaii-specific requirements like minor disclosures every 3 hours, crisis intervention logging, or annual DOH reports. |
| Attestly (AI compliance platform) | $500-$2,000 initial setup | General AI compliance platform for laws like Colorado AI Act, CPRA, etc.; not tailored to Hawaii AI Disclosure and Safety Act's specific provisions for conversational AI services. |
| DIY approach (in-house development) | $0 cash + 20-60 hours time | High risk of missing requirements, poor documentation, and ongoing maintenance burden; businesses prefer turnkey solutions. |

## Technical notes
- The tool would provide a JavaScript widget/SDK that operators embed in their conversational AI service.
- Features: context-aware AI disclosure banner (shows persistent disclaimer for known minors, or session-start + hourly reminders), suicide ideation detection via keyword/NLP model triggering crisis hotline response, output scanning to prevent mental health care claims, integration with content moderation APIs to block sexually explicit material, parent/guardian dashboard for managing minor user settings (requires auth), and automated generation of annual reports detailing crisis intervention referrals and safety protocols for Hawaii DOH.
- Would rely on existing NLP libraries for suicide ideation detection (e.g., using models from Hugging Face) and content moderation services (e.g., Perspective API, Azure Content Moderator) for scalability.
- Data storage: minimal logging of disclosure events and crisis referrals (no personal chat logs) to satisfy audit requirements while preserving privacy.

## Risks & open questions
- The Hawaii law may face legal challenges or amendments, potentially changing requirements.
- Operators may resist adding friction to user experience (e.g., frequent disclaimers for minors could annoy users).
- False positives in suicide ideation detection could lead to inappropriate crisis hotline referrals, harming user trust.
- Content filtering for sexually explicit material may not catch all edge cases, requiring ongoing tuning.
- Need to maintain up-to-date list of Hawaii crisis hotline numbers (e.g., 988 Suicide & Crisis Lifeline) and local resources.
- Uncertainty about how many businesses in Hawaii operate conversational AI services that fall under the law's scope (requires "reasonable person would believe it's human" threshold).

## Sources (bulleted URLs, ≥ 3)
- https://regulations.ai/regulations/RAI-US-HI-SB30010-2026
- https://data.capitol.hawaii.gov/sessions/session2026/bills/HB2502_HD1_.PDF
- https://akia.ai/case-studies/expedite-guest-request-response-by-55
- https://www.romaix.ai/blogs/ai-meets-aloha-ai-powered-chat-assistant-for-hawaiian-tour-company
- https://attestly.io/blog/ai-compliance-cost-small-business
- https://disclosed.sh/
- https://normis.app/product/transparency