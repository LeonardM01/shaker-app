# 0006: Checks run as durable Vercel Workflows

- Status: accepted
- Date: 2026-10-08

## Context

A check chains slow, independently failing steps: a Steel session to read the listing (10–30 s), photo storage, Gemini extraction (5–10 s), comparables (database or a second Steel search), Jev and scoring. Roughly 20–60 s in total. The "Provjera u tijeku" screen shows each step separately, and a failed step must not take the others down ("Ostale provjere rade normalno"). A check must survive the user closing the tab.

## Decision

- Run each check with the Vercel Workflow SDK (`"use workflow"` / `"use step"`), which supports TanStack Start through its Vite plugin (Vercel changelog, 2026-06-16). Each pipeline stage is a durable step with its own retries.
- Each step writes its status to Postgres. The progress screen reads that status (poll or stream), not the workflow runtime.
- **Reuse:** a listing checked within the last 6 hours returns that check instead of starting a new one. The refresh button forces a new check.
- Watchlist listings are re-checked on a schedule (initially daily) to catch price changes and removals.

## Consequences

- No extra orchestration vendor; the pipeline stays on our host and in our repo.
- Confirm the Workflow SDK's release status (GA vs v5 beta) before building on it; Neon Functions are the fallback runtime.
- Scheduled re-checks multiply Steel and LLM cost by watchlist size; monitor it.
