# PRD.md

## Problem
Operators of conversational AI services in Hawaii risk fines up to $10,000 per violation for non-compliance with the Hawaii AI Disclosure and Safety Act (Act 248), which requires AI disclosures, minor protections, suicide prevention protocols, content safeguards, and annual reporting to the Hawaii Department of Health.

## Target user
- Primary: Product owners or developers at businesses operating conversational AI services in Hawaii (e.g., chatbots for customer service, AI companions, virtual assistants) who need to implement compliance measures quickly to avoid penalties.
- Secondary: Business owners or compliance officers who oversee AI deployments and need auditable proof of compliance.

## Competitors & gap
- Disclosed and Normis provide AI disclosure widgets focused on EU AI Act Article 50 transparency but lack Hawaii-specific requirements like minor disclosures every 3 hours, suicide hotline referrals, mental health care prohibitions, sexually explicit content filters, parental controls, and annual DOH reporting.
- General AI compliance platforms (e.g., Attestly) address broad AI laws but are not tailored to the specific provisions of Act 248 for conversational AI services.
- Building in-house (DIY) carries high risk of missing requirements and is time-consuming.

## MVP scope (5-8 bullet features)
- Persistent AI disclosure banner that shows a visible disclaimer for known minor users (or session-start + hourly reminders for continuous interactions).
- Suicide ideation detection that triggers an automatic response with crisis hotline information (e.g., 988 Suicide & Crisis Lifeline) and logs the event for annual reporting.
- Output filtering to prevent the AI from generating statements that imply it provides professional mental or behavioral health care.
- Integration with content moderation APIs to detect and block sexually explicit content in user inputs and AI outputs.
- Parent/guardian portal to manage minor user's privacy and account settings (e.g., screen time limits, data sharing preferences).
- Automated generation of an annual report PDF detailing: total crisis intervention referrals issued, descriptions of suicide prevention protocols deployed, and confirmation of sexually explicit content safeguards—formatted for submission to the Hawaii Behavioral Health Administration.
- JavaScript widget/SDK for easy integration with minimal code changes (e.g., adding a script tag and initializing with configuration).
- Audit trail logging of disclosure events and crisis referrals (without storing personal chat content) to support compliance demonstrations.

## Non-goals
- Building or hosting the conversational AI service itself; this tool is an add-on for existing services.
- Providing legal advice or guaranteeing compliance; users must consult legal counsel for their specific situation.
- Supporting non-conversational AI systems (e.g., AI for hiring, credit scoring) unless they involve direct user interaction that could be mistaken for human.
- Storing or processing personal conversation content beyond what is necessary for safety detection (privacy-by-design).
- Offering general AI impact assessments or bias audits required by laws like the Colorado AI Act.

## Success metrics (measurable, with numbers you can justify)
- Reduction in compliance-related legal notices: Target zero notices from Hawaii Attorney General for users who have deployed the tool for at least 30 days.
- Time to implement compliance: Average setup time under 2 hours for a typical chatbot integration (based on widget simplicity).
- Accuracy of suicide ideation detection: Aim for precision >80% (minimizing false positives) while maintaining recall >70% on a test set of Hawaii-relevant self-harm prompts, justified by industry standards for mental health NLP models.
- Coverage of disclosure requirements: 100% of required disclosure scenarios (contextual human-like belief, known minor persistent disclaimer, session-start + hourly reminders) correctly handled in automated tests.
- Annual report generation: Tool produces a complete, formatted report meeting DOH specifications in under 5 minutes when triggered.

## Open questions
- What is the exact threshold for "a reasonable person would believe they are interacting with a human" under Act 248, and how can this be reliably detected in practice?
- How should the tool handle mixed-audience services where both adults and minors may use the same chatbot without age verification?
- What is the optimal balance between suicide ideation detection sensitivity and specificity to minimize harmful false positives while capturing genuine crises?
- Which content moderation APIs offer the best accuracy for sexually explicit content detection in the context of conversational AI, and what are their cost implications at scale?
- How many businesses in Hawaii operate conversational AI services that fall under the scope of Act 248, and what is their willingness to pay for a compliance tool versus risking fines?