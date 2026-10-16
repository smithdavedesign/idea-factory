# clipcue — verdict: pass, score 4/10

**Pass.** The pain (wasted paid retries) is real, but the buyer is a category, the free substitute (ChatGPT/Claude plus a pasted guide) does most of the job, and M1 doesn't even test the photo-aware claim.

Evidence strength overall: Low. Everything comes from blog posts and search summaries in RESEARCH.md. There is no named buyer and no one shown paying for a prompt writer on product photos.

## Q1 Demand reality — 3/10
- Evidence: Wan 2.2 camera control is unreliable (stable-diffusion-art.com, forum.comfy.org). Retries cost about $0.68–$0.91 per 5s Kling clip, and guides say to budget 3–4 versions per clip (marcandrews.com).
- That shows the generators are unreliable. It doesn't show anyone wants a separate prompt tool. The only paid analogue is AI Film Director Studio at $19/mo on Gumroad, one listing with no sales numbers.
- No one has been asked, no one has offered to pay, and no one has been upset by the problem going unsolved. RESEARCH.md says willingness to pay is unproven.
- Would change my mind: 3+ sellers in r/Etsy, r/ecommerce or Kling/Runway communities who describe burning credits on retries and say they'd pay $9 to avoid it.

## Q2 Status quo — 4/10
- Today sellers regenerate 3–4 times, paste a free guide into ChatGPT, or use the generator's built-in prompt helper. The workaround is cheap: one extra ~$0.70 clip.
- Total cost to the user is perhaps $2–$5 per finished clip. For a 20–200 SKU seller that is real money in total, but per decision it is too small to justify a new subscription.
- ChatGPT/Claude with an image upload already writes a photo-aware prompt. The substitute is free or already paid for. clipcue's edge (per-model templates, camera presets) is a saved prompt, and a decent user can copy it in an afternoon.

## Q3 Desperate specificity — 2/10
- "Small ecommerce sellers with 20–200 SKUs" and "solo real-estate agents" are categories, not people. No name, no role, no consequence. Nobody gets fired over a failed pan.
- The secondary audience, hobbyists on local Wan/LTX, is the one that actually feels the camera-control pain, but they want it free (RESEARCH.md says so).
- Would change my mind: one named seller or agent, found in a community thread, who has said they spend X hours or $Y a month on retries.

## Q4 Narrowest wedge — 5/10
- The wedge is sensible: one photo, one model, one camera move, one prompt with a negative. A static table of per-model templates is the whole product.
- Problem: the narrowest version also has no moat. A landing page that sells "prompts that work first time" can be tested for a weekend of effort, but a template table is exactly what ChatGPT plus a pasted guide replaces.
- The real wedge may be a curated, tested prompt library (a $19 pack of known-good camera presets for Wan/LTX/Kling), with no app at all.

## Q6 Future-fit — 3/10
- Models are improving fast. Camera control is the stated weakness today, and Wan 2.2 to 2.5 and Kling keep fixing it, with native camera presets (Runware `cameraMovement`) already appearing. Each fix shrinks the problem.
- Generators will ship built-in photo-aware prompt helpers (several already do). The product becomes less essential, not more, as the models improve. Template upkeep is a permanent tax.

## Q5 substitute: what to watch M1 users doing
Watch 5 sellers who already pay for Kling or Runway.
- Do they paste the prompt as is, or edit it?
- Do they run the same photo with and without it?
- Do they ask for photo-aware output?
- Do they drop back to ChatGPT after the first use?

## Premises
1. Prompts are the main cause of failed generations. Partly contradicted: the research shows model asymmetry (pan-left yielding pan-right), which no prompt fixes.
2. Sellers will pay separately from the generator. Unsupported.
3. A local LLM is the engine at $0. True for hobbyists, not for sellers, who won't run Ollama. Hosted mode needs a free-tier model with unknown vision quality and rate limits.
4. A better prompt cuts retries by at least 30%. Unmeasured, and the PRD says so.
5. Templates stay valid. Doubtful, as models change monthly.

## Alternatives
- **A. Minimal: static prompt pack.** A $19 one-time PDF/Notion pack of tested camera-preset prompts per model, with before/after clips. Effort S, risk Low. No app, and it tests demand directly. Reuses nothing in the portfolio.
- **B. Ideal: the full photo-aware app (the PRD).** Upload, vision model, per-model templates, history, payment. Effort M–L, risk High. Compete with ChatGPT and generator-built-in helpers on convenience.
- **C. Lateral: a free Chrome side panel or Custom GPT for Kling/Runway,** funnelling to a paid tier of the template pack. Effort S, risk Med. Distribution is the main problem.
- **Extend David's existing repos?** The context search shows none in image-to-video. The pipeline's strongest ideas are compliance and evidence tools for named B2B niches (aidis, feedwarden, proofpack). clipcue is a consumer-style prompt helper, the type reviewers have already passed (tiebreak, alterpaw).
- Recommendation: A, and only if David is curious. B is not worth a demand test.

## Scope challenge (SCOPE REDUCTION)
Narrowest version worth testing: one landing page promising "Wan/Kling camera prompts that don't pan the wrong way", with 3 hand-made before/after clips and a $9 pre-pay link. If that cannot get 5 pre-pays from 50 qualified visitors, the app is not worth building.

## M1 feasibility
- One weekend: yes. A Next.js route, two template files, seven presets, Vitest. Zero cost: yes (Vercel, LiteLLM free alias).
- But M1 as written takes a text description, not a photo. The photo-aware claim (the entire differentiator) isn't tested until M2. M1 is therefore a text-to-prompt tool that ChatGPT already is.
- The one test that proves M1: a hand-rated comparison on 30 photos of attempts to an acceptable clip, plain vs clipcue prompt, using a free tier or the user's own credits. This is the PRD's retry-reduction metric, and it costs David generator credits, which agents can't spend.

## Risks
- Free substitute (ChatGPT/Claude plus guide) is good enough.
- No named buyer and no proof of willingness to pay.
- Retry reduction may be nil because variance sits in the model.
- Template upkeep as Wan, LTX, Kling and Runway change.
- Generators ship their own photo-aware helpers.
- Real-estate angle adds disclosure issues (California AB 723).
- The hobbyist audience that feels the pain wants a free local tool.

## Kill criteria
Drop it if any of these holds after a two-week test:
- fewer than 5 waitlist or pre-pay signups from 50 qualified visitors;
- no seller or agent can be named who spends more than $10/month on retries;
- the 30-photo test shows less than 30% fewer attempts;
- a major generator ships photo-aware prompt suggestions.

## Assignment
Before building anything, post once in a Kling/Runway seller community asking how many generations they burn per usable clip, and what they do about it. Count answers that name a dollar figure.
