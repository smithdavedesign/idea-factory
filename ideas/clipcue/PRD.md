# clipcue — PRD

## Problem
Image-to-video models respond badly to vague prompts, and camera motion is the weakest part: Wan 2.2 tests show zoom in/out confusion and a pan-left that comes out as a pan-right (stable-diffusion-art.com). Each retry on a paid generator costs about $0.68–$0.91 (Kling, 5-second clip), and guides tell sellers to budget 3–4 versions per final clip. Writing a good prompt means knowing each model's preferred style (motion not scene, one beat, camera named early), which most sellers don't.

## Target user
A small ecommerce seller (Etsy/Shopify, 20–200 SKUs) or solo real-estate agent who already pays $7–$26/month for a generator and turns still photos into 5-second clips. The painful moment: the third failed generation of the same product photo, with credits running down. Secondary: hobbyists running Wan/LTX locally who want the seed's local-LLM workflow.

## Competitors & gap
AI Film Director Studio ($19/mo, GPT-based, storyboard focus), generators' built-in prompt helpers (locked to one vendor), ComfyUI LLM nodes (need technical skill), and free guides. ChatGPT with a pasted guide is the real substitute. The gap: a photo-aware prompt writer with per-model templates and camera presets tested against known model quirks, no ChatGPT prompt-crafting required, and a local mode at $0.

## MVP scope
- Upload one photo; a vision model returns a two-line description of subject and composition.
- Pick a target model (Wan 2.2, LTX-2.x, Kling, Runway) and a camera preset (push in, pull out, orbit, pan left, pan right, rise, locked-off).
- Generate one prompt in that model's preferred shape: subject action, then camera, then pace, one flowing paragraph, one beat.
- Add known-good negative prompt text per model (morphing, flicker, jitter).
- "Try another" returns 3 variants with different motion verbs.
- Copy button and a saved history per photo.
- Local mode through Ollama, and a hosted mode on a free-tier model.

## Non-goals
- Generating or hosting video.
- Calling generator APIs on the user's behalf in v1.
- Storyboards, multi-shot scripts or audio.
- Image generation or editing.

## Success metrics
- Prompt validity: 95% of 100 test photos produce a single-paragraph prompt with exactly one camera move and no scene re-description.
- Retry reduction (the claim to prove): on 30 photos, the median number of generations to an acceptable clip is at least 30% lower than with a plain "make it move" prompt; the baseline is 3–4 attempts per clip.
- Demand: 5 of the first 50 seller visitors to a landing page join a waitlist or pre-pay $9; at least 3 pay within 30 days.
- Local mode runs on an 8 GB laptop in under 20 seconds per prompt.

## Open questions
- Does a better prompt measurably cut retries, or is the variance in the model, not the prompt?
- Will sellers pay for this separately from the generator?
- Subscription ($9/mo) or one-time pack ($19 for 100 prompts)?
- How often do model updates break the templates?
