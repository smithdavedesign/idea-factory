# evalpad — research

## Summary
- Homeschool families in portfolio-review states (Pennsylvania, Florida, New York, Massachusetts and others) must have a work portfolio reviewed each year by a qualified evaluator, who interviews the child and signs a written certification or narrative. Families pay the evaluator roughly $30–$150 per child.
- Existing software (HomeschoolFox, Easy Homeschool Reporter, ArborSlate) serves the parent side. I found no tool built for the evaluator, who receives a pile of portfolios in the weeks before district deadlines and writes each narrative by hand.
- Idea: an evaluator-side workspace. A family sends work samples through a link, the evaluator gets a sorted portfolio with a draft narrative and a state-correct certification letter, and edits and signs it. The evaluator pays a flat monthly fee.

## Evidence of the problem
- The evaluation is a portfolio review plus a student interview, and the evaluator must state whether an appropriate education is occurring and send a written certification to the district (Pennsylvania). Source: https://education.pa.gov/K-12/Home%20Education%20and%20Private%20Tutoring/HomeEdPrivateTutoringGuide/HomeEdEvaluators/Pages/default.aspx
- Florida requires an annual evaluation by portfolio review or standardized test, and portfolios are kept for two years. New York requires annual assessment by testing or a narrative from a qualified person. Massachusetts accepts a portfolio, test or professional evaluation. Source: https://homeschoolfox.com/blog/homeschool-portfolio-reviews-vs-standardized-tests-what-each-state-accepts and https://homeschoolpicks.com/how-to-homeschool/homeschool-assessment-guide/
- Parents say portfolio assembly is daunting and that many struggle to keep it done, which shows up as a rush at the evaluator's door at year end. Source: https://ourjourneywestward.com/wrapping-up-homeschool-year/ and https://homeschoolgiveaways.com/?p=125094
- I found **no first-hand evaluator complaints** and no figures for hours per family. That is the biggest gap. Demand on the evaluator side is an inference.

## Who pays
- **Buyer:** an independent evaluator (a certified teacher, in a state where one is needed) who reviews 20–150 families a year, often through a homeschool support group or accreditation agency. Not the parent, who already pays the evaluator.
- **Price point to test:** $19–$29 a month, or $99 a year. Break-even for the buyer is about one family review, since families pay about $50–$150 each.
- **Evidence people pay for this job today:** Pennsylvania evaluators charge $50–$150 per child, most $75–$100. Source: https://homeschoolfox.com/blog/homeschool-portfolio-reviews-vs-standardized-tests-what-each-state-accepts (vendor figures, treat as soft). Florida evaluations run $30–$60 per review. Source: https://homeschool-1lf.pages.dev/blog/florida-homeschool-portfolio-templates-vs-evaluator
- **Evidence they pay for software:** families pay HomeschoolFox $12/month, and Easy Homeschool Reporter lists $59 in early access. Source: https://homeschoolfox.com/vs/scholaric and https://www.capterra.com/p/10043338/Easy-Homeschool-Reporter/. No evidence yet that evaluators pay for software.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| HomeschoolFox | $12/mo family; transcript add-on $29 | Parent-side. Generates evaluator letters and portfolios for the family, but is not an evaluator workspace |
| Easy Homeschool Reporter | $59 early access (NY) | One state, parent-side forms |
| ArborSlate | not verified | Record-keeping and compliance docs for families |
| Schoolfolio / Chalk / Homeschool Planner | free with in-app purchases or paid tiers | Photo-to-portfolio for parents, no evaluator view or narrative |
| Hand-made (Google Docs, email, templates) | $0 | What most evaluators likely use today |

## Technical notes
- Intake: a family upload link (photos and PDFs, no account), grouped by subject. A free-tier vision model could caption and tag work samples.
- Output: a sorted PDF portfolio, plus a draft narrative per child in the evaluator's own voice from 3 to 5 evaluator notes, and a certification letter filled from state templates (start with Pennsylvania and Florida).
- Hosting at $0: static front end, small free-tier database, local-first file handling to limit storage of children's work. Data about minors needs a deletion policy.

## Risks & open questions
- **No direct evidence evaluators want software**, and the buyer pool is small (hundreds to low thousands per state).
- HomeschoolFox could add an evaluator view. It already makes evaluator letters.
- Reaching evaluators: state accreditation agency directories (CHAP in Pennsylvania, FPEA in Florida) and support-group lists are the likely channel, which means outbound or community outreach.
- Legal: the evaluator, not the tool, signs. AI-drafted narratives must be edited and attributed. Children's work samples are sensitive.
- Seasonal: demand peaks in spring and early summer.

## Sources
- https://education.pa.gov/K-12/Home%20Education%20and%20Private%20Tutoring/HomeEdPrivateTutoringGuide/HomeEdEvaluators/Pages/default.aspx
- https://homeschoolfox.com/blog/homeschool-portfolio-reviews-vs-standardized-tests-what-each-state-accepts
- https://homeschoolpicks.com/how-to-homeschool/homeschool-assessment-guide/
- https://homeschool-1lf.pages.dev/blog/florida-homeschool-portfolio-templates-vs-evaluator
- https://homeschoolfox.com/vs/scholaric
- https://www.capterra.com/p/10043338/Easy-Homeschool-Reporter/
- https://ourjourneywestward.com/wrapping-up-homeschool-year/
- https://homeschoolgiveaways.com/?p=125094
