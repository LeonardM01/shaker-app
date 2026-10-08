# 0013: The extension calls an anonymous, versioned API that reuses the web check

- Status: accepted
- Date: 2026-10-08

## Context

The browser extension (github.com/MaxMaxMaxS/Shaker) scrapes Njuškalo, Index oglasi and Facebook Marketplace listing pages and shows a score, seller box and reviews. Today all of it is seeded demo data; it has no backend and no sign-in. The web app already computes the real report. The extension needs a door into it without the web app gaining features it doesn't have.

## Decision

- **Server routes under `/api/extension/v1/`**, as `CODING_STANDARDS.md` already allows for "the extension's API". Responses are JSON with `Access-Control-Allow-Origin: *` and no credentials, so the extension can call from its content script or service worker.
- **Opening a listing checks it automatically.** `POST /checks {url}` runs the web app's `runCheck`: it returns the completed report if a check from the last 6 hours exists (ADR 0006), joins a running check, or starts a new one. `GET /checks/{checkId}` returns step progress and, once completed, the report. The extension polls like the web app. Paid work never hangs off a GET.
- **The extension sends only the URL.** The check is the same server-side pipeline as the web app (ADR 0003). Its in-page scrape is not ingested, so anonymous clients can't plant prices or sellers in the comparables other checks depend on.
- **The response is the web report's shape and vocabulary**: Verdict, price range, suggested offer and offer message, scam patterns, Ocjena ponude, Kvaliteta oglasa, summary, questions, checklist, seller card, Shaker rating. Fields the web app doesn't compute are absent, not null placeholders. The extension keeps its demo for those (price history, "bolji od X % sličnih", Shaker-verified seller, response time, per-listing market prices on the seller window).
- **The extension gets the full report, not the guest one.** The web app's guest gate stays as it is; it is a conversion nudge, not a security boundary.
- **The extension's headline grade is Ocjena ponude as 0–5 stars** (value / 20). When it is `no_data` the extension shows gray "Nema podataka", never its seeded demo score. The demo fallback is only for fields the API doesn't have at all.
- **Provjeri poruku** is exposed as `POST /message-checks`, the same Gemini check as the web app, not stored.
- **Reviews** are listed and posted through the API; see ADR 0014.
- **Vinted is out**, as in the web app and the extension.

## Consequences

- **No auth and no rate limits on paid work.** Every extension user browsing an unchecked listing starts a Steel session and several Gemini and Jev calls; anyone can script `POST /checks`. Only the per-URL reuse throttles cost, the same exposure `startCheckFn` already has. Revisit with per-install and per-IP limits plus a daily cap on new checks once monthly Steel or Gemini spend passes a threshold we set.
- The full report, including what the web hides from guests, is public through the API.
- The extension must handle a check that takes tens of seconds on first open, and `removed` or `failed` checks.
- The contract is versioned (`v1`) because extension builds in testers' hands can't be updated in lockstep with the backend.
