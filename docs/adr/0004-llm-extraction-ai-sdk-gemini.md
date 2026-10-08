# 0004: LLM extraction through the Vercel AI SDK, starting on Gemini Flash-Lite

- Status: accepted
- Date: 2026-10-08

## Context

Each check sends the listing's text and photos to an LLM to extract facts (search key, category, stated specs, what's missing, contradictions between text and photos such as a battery-health screenshot). Official prices on 2026-10-08, USD per 1M tokens input/output: `gemini-2.5-flash-lite` 0.10/0.40, `gemini-3.1-flash-lite` 0.25/1.50, `gpt-5-nano` 0.05/0.40 (reasoning tokens billed as output), `gpt-4.1-nano` 0.10/0.40. GPT-4.5 is no longer listed. A check is roughly 2k text tokens, ~6 photos and ~1.5k output tokens, so every candidate costs about $0.001–0.005 per check, below the Steel session cost. Accuracy on photos (Croatian iOS screenshots, photo/text mismatches) matters more than price.

## Decision

- Call LLMs through the Vercel AI SDK (`generateObject` with a Zod schema), so output is typed and validated and the model is one config value.
- Start on `gemini-3.1-flash-lite` with a direct Gemini API key on the **paid** tier (the free tier lets Google use content, including sellers' photos, to improve its products).
- Before launch, run an eval of ~20 real listings (phones, cars, furniture, some with screenshots). Move to a stronger model (e.g. a Gemini Flash) if Flash-Lite isn't accurate enough.

## Consequences

- Switching model or provider is a config change, not a rewrite.
- The Neon AI Gateway (available in `aws-eu-central-1`, needs a paid Neon plan, prices not published) was considered and deferred.
