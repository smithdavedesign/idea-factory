# clipcue — research

## Summary
David's seed: use a lightweight local LLM (Llama 3, Mistral, Qwen 2.5 via Ollama) to write camera-motion, lighting and pan/zoom prompts for image-to-video models such as Wan 2.1 and LTX-Video.
The pain is real (camera motion is the weak point of image-to-video, and every retry costs credits), but hobbyists want this free. The only version someone pays for is a narrow one: product and listing photos for sellers and agents who pay per clip.
Sharpened idea: look at the photo, write ONE model-specific motion prompt that is likely to work first time, and spend fewer paid retries. A local LLM does the work at $0 marginal cost to us.

## Evidence of the problem
- A Wan 2.2 image-to-video test found camera control unreliable. Zooming out worked fairly well, but the model sometimes confused zoom in and out. Panning right worked, while panning left kept producing a pan right with a zoom out. The author's workaround was to generate several more videos and pick the best (https://stable-diffusion-art.com/wan-2-2-image-to-video/, as summarised in search results; the page itself returned 403 to fetch).
- A ComfyUI forum user said there is "no camera control really" in Wan 2.2 5B and suggested trying keywords and LoRAs (https://forum.comfy.org/t/wan-2-2-5b/3665).
- Guides agree on what good prompts look like: prompt the motion, not the scene (subject action, then camera, then pace), keep to one beat, pin the seed once something works (https://www.veed.io/learn/wan-2-2-prompting-guide). LTX guides give a 4-part structure (subject/scene, action, style, camera) and say the camera move should be named early, in one flowing paragraph (https://www.veed.io/learn/ltx-video-prompting-guide, https://www.rundiffusion.com/ltx-2-prompt-guide, https://wiro.ai/blog/ltx-2-distilled-8-motion-prompts-for-image-to-video/). Each model family wants a different style, which is exactly what an LLM with a per-model system prompt can encode.
- Retries cost money. Kling charges 9 credits per second at 720p (45 credits, about $0.68, per 5-second clip) and 12 at 1080p (60 credits, about $0.91) with no volume discount (https://marcandrews.com/kling-ai-credits-explained/). One ecommerce guide tells sellers to budget 3–4 generated versions per final video, and a Kling API analysis reports $0.50–$3.00 per final 10-second clip once regenerations are counted (both via the search summary of https://marcandrews.com/kling-ai-for-uk-ecommerce-product-videos-that-convert/ and https://ecommercefastlane.com/best-ai-image-to-video-tools-for-shopify-sellers/).

## Who pays
- **Buyer:** small ecommerce sellers (Etsy/Shopify/Amazon, 20–200 SKUs) and solo real-estate agents who already make short AI clips from still photos with paid credits.
- **Price point:** $9/month (or a $19 one-time pack of 100 prompts). Anchored below the generators themselves ($6.99–$25.99 Kling, $15 Runway) so it reads as an add-on, and at the level of the one paid prompt tool found.
- **Evidence they pay for something like it today:**
  - AI Film Director Studio, a GPT-based tool that analyses an uploaded image and writes storyboard-style prompts for video generators, is sold at $19/month (https://bobbyguions.gumroad.com/l/aifilmdirectorstudio).
  - Sellers already pay generators $6.99–$25.99/month on Kling and about $15/month on Runway, which gives about 52 seconds of flagship video per month (https://marcandrews.com/kling-ai-credits-explained/, https://marcandrews.com/kling-ai-for-uk-ecommerce-product-videos-that-convert/).
  - Real-estate photo-to-video tools charge $9.70–$129 per listing tier and $75 for a same-day service (https://www.heygen.com/blog/turn-real-estate-photos-into-videos, https://www.zipyourflyer.com/blog/magictours-are-here-the-ai-real-estate-listing-video-service-that-turns-your-photos-into-cinematic-property-videos-same-day/). Photographers charge $150–$500 per listing (https://www.autoreelapp.com/blog/how-much-does-real-estate-photography-cost-compared-to-ai-listing-videos, a competitor's figure).
  - Caveat: no source shows anyone paying specifically for a prompt writer on product photos. The strongest evidence is the $19 Gumroad tool and the credit burn. Willingness to pay is unproven.

## Competitors & alternatives
| Name | Price | Gap |
|---|---|---|
| AI Film Director Studio (Gumroad, GPT-based) | $19/mo | Cinematic storyboard focus, tied to ChatGPT, not model-specific for Wan/LTX or product shots |
| Generators' built-in prompt helpers (Runway, Kling, Higgsfield $9/mo and up) | included in $6.99–$25.99/mo | Tied to one vendor; they sell the clip, not a better first attempt |
| ComfyUI workflows with an LLM prompt node (OpenAI chat node in the Wan camera-push LoRA workflow) | free | Needs ComfyUI skills; not for sellers (https://www.runcomfy.com/comfyui-workflows/motion-lora-camera-push-in-wan-14b-720p-i2v) |
| Free prompt guides (VEED, fal, RunDiffusion, LTX blog) | free | Static advice, no look at the actual photo (https://ltx.io/blog/ltx-2-3-prompt-guide) |
| ChatGPT / Claude with a pasted guide | free to $20/mo | The real substitute: any user can paste a guide and a photo. clipcue must beat it on per-model templates, presets and saving retries |
| Real-estate photo-to-video services | $9.70–$129 per listing tier | Sell the finished video, not the prompt |

## Technical notes
- Pipeline: photo in, a vision-capable local model (Qwen2.5-VL or Llama 3.2 Vision via Ollama; the seed names Llama 3, Mistral and Qwen 2.5) describes the subject and composition, then a text LLM fills a per-model template (Wan 2.2, LTX-2.x, Kling, Runway) with one camera move, one subject action, lighting and pace.
- Camera presets are the real value: push in, pull out, orbit, pan left/right, rise. Wan's left/right asymmetry means presets should append known-good wording and negatives (morphing, flicker, jitter).
- Runs free for us: the local model is the product's engine for the seed's audience; a hosted version would need a free-tier model through LiteLLM. Output stays text, so no video hosting.
- LTX camera movement can also be set as a preset field in some APIs (Runware `settings.cameraMovement`, eight values), so templates must know when to leave camera out of the prompt (https://runware.ai/docs/models/lightricks-ltx-2-5-pro/guides/camera-movement).
- Optional later: send the prompt to a generator's API with the user's own key.

## Risks & open questions
- ChatGPT plus a pasted guide does most of this for free; the moat is thin.
- Models change fast (Wan 2.1 to 2.2, LTX to LTX-2.5). Templates need constant upkeep.
- Whether a better prompt really cuts retries is unmeasured; it needs a before/after test on the same 30 photos.
- Sellers may prefer one-click video tools over writing prompts at all.
- Reviewers have already passed several weak-willingness-to-pay consumer ideas (tiebreak, alterpaw); this one also lacks a named paying buyer. Confidence is Low.
- Generated real-estate imagery can invent details (two tools invented a window) and California AB 723 requires disclosure of altered listing images (https://www.heygen.com/blog/turn-real-estate-photos-into-videos). Out of scope for prompts, but a compliance note for the agent angle.

## Sources
- https://stable-diffusion-art.com/wan-2-2-image-to-video/
- https://forum.comfy.org/t/wan-2-2-5b/3665
- https://www.veed.io/learn/wan-2-2-prompting-guide
- https://www.veed.io/learn/ltx-video-prompting-guide
- https://www.rundiffusion.com/ltx-2-prompt-guide
- https://wiro.ai/blog/ltx-2-distilled-8-motion-prompts-for-image-to-video/
- https://ltx.io/blog/ltx-2-3-prompt-guide
- https://runware.ai/docs/models/lightricks-ltx-2-5-pro/guides/camera-movement
- https://www.runcomfy.com/comfyui-workflows/motion-lora-camera-push-in-wan-14b-720p-i2v
- https://marcandrews.com/kling-ai-credits-explained/
- https://marcandrews.com/kling-ai-for-uk-ecommerce-product-videos-that-convert/
- https://ecommercefastlane.com/best-ai-image-to-video-tools-for-shopify-sellers/
- https://bobbyguions.gumroad.com/l/aifilmdirectorstudio
- https://www.heygen.com/blog/turn-real-estate-photos-into-videos
- https://www.zipyourflyer.com/blog/magictours-are-here-the-ai-real-estate-listing-video-service-that-turns-your-photos-into-cinematic-property-videos-same-day/
- https://www.autoreelapp.com/blog/how-much-does-real-estate-photography-cost-compared-to-ai-listing-videos
