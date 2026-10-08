# 0009: Report text is written in a final step, without the offer amount

- Status: accepted
- Date: 2026-10-08

## Context

The report has generated prose: Sažetak, Što pitati prodavatelja?, Provjeri prije plaćanja, and the offer message. If the extraction call wrote it, the text could contradict scores computed later. Guests must never receive the suggested offer, and the Sažetak must not name it (guest lock design, `.impeccable/surfaces/figma-app.md`).

## Decision

- A final "write" check step (shown as "Pitanja za prodavatelja · Nakon svih provjera") runs after scoring, with one `generateObject` call (ADR 0004).
- Inputs: extracted facts, verdict, score reason codes, category. The offer amount is never an input.
- Outputs: Sažetak (2–3 sentences), questions to ask (from missing and contradicting facts), a category-specific pre-payment checklist, and an offer message containing a `{ponuda}` placeholder.
- The server fills `{ponuda}` and sends it only to signed-in users.
- Code guardrails: regenerate if the text contains a number not present in the inputs. The prompt forbids wording that presents the seller as guilty without evidence.

## Consequences

- One extra cheap LLM call per check (~$0.001).
- Text can't leak the locked offer or contradict the computed verdict.
