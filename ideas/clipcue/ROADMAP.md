# clipcue — roadmap

## Suggested stack
- Next.js on Vercel Hobby: one repo for UI and API routes, free hosting.
- Ollama (Qwen2.5-VL for the photo, Qwen 2.5 or Llama 3 for text) in local mode: $0 and matches the seed.
- LiteLLM free-model alias for hosted mode: no API spend.
- Zod: validate every model output as JSON before showing it.
- Vitest: the exit criteria below become tests.

## M1 — Prompt writer (one weekend)
Deliverables:
- `POST /api/prompt` takes `{description, model, camera}` and returns `{prompt, negative}`.
- Per-model template files for Wan 2.2 and LTX-2.x, and a camera preset list of seven moves.
- A page with a text box for the scene description, model and camera pickers, and a copy button. (Photo analysis comes in M2.)

Exit criteria (testable):
- `POST /api/prompt` with `{description:"a ceramic mug on a wooden table", model:"wan-2.2", camera:"push-in"}` returns 200, a `prompt` containing "push" and "mug", a non-empty `negative`, and no line breaks.
- Same input with `camera:"pan-left"` returns a prompt containing "pan left" and no "pan right".
- An unknown `model` returns 400.
- Every prompt for every model/camera pair (2 × 7) contains exactly one camera move from the preset list.
- If the LLM returns invalid JSON, the API returns 502 and stores nothing.

## M2 — Photo-aware
Deliverables:
- Photo upload, a vision-model call that returns a description, and the description wired into the prompt writer.
- Add Kling and Runway templates.
- "Try another" returns 3 variants.

Exit criteria:
- `POST /api/describe` with a test JPEG of a mug returns a description containing "mug" and under 40 words.
- `POST /api/prompt` with `variants:3` returns 3 distinct prompts, all with the same camera move.
- A file over 8 MB or not an image returns 400.

## M3 — Prove it and charge
Deliverables:
- A before/after harness: 30 photos, baseline prompt versus clipcue prompt, results logged in a table by hand-rated acceptable/not.
- Landing page with the measured retry reduction, a waitlist and a $9 Stripe payment link.
- Saved history per user.

Exit criteria:
- The harness script prints the median attempts for both prompt styles for 30 rows.
- The landing page's pay link returns 200 and a test-mode checkout completes.
- History returns the last 20 prompts for a signed-in user, none for another user.
