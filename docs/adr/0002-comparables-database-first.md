# 0002: Comparables come from our database first, live search as fallback

- Status: accepted
- Date: 2026-10-08

## Context

Most of the report depends on comparables: Ocjena ponude, Usporedba cijena (range bar and per-platform medians), Najsličniji oglasi, Predložena ponuda and the price verdict. The design needs at least 5 comparables before it shows a range ("3 od potrebnih 5" otherwise).

Our database only holds listings people have checked, so at launch it is nearly empty. Searching it alone would make almost every report `no_data` on price.

Njuškalo sits behind Radware ShieldSquare bot protection: a plain HTTP request to a search page is redirected to a captcha (`validate.perfdrive.com`), checked 2026-10-08. Server-side `fetch` can't read it.

## Decision

1. The LLM call that already reads the checked listing also returns a **search key** (e.g. `iPhone 13 Pro 128 GB`) and the marketplace category (see `GLOSSARY.md`).
2. Postgres finds comparables by normalized title (`pg_trgm` / full-text) in the same category, seen in the last 30 days: every search-key token present, none of a global exclusion list present (`max`, `plus`, `mini`, `ultra`, `maska`, `za dijelove`, `zamjena`, `kutija`, …).
3. Steps 2–3 run **per marketplace, in parallel** (one check step each for Njuškalo, Facebook Marketplace, Index oglasi, matching the "Provjera u tijeku" design). A marketplace with fewer than 5 fresh comparables gets one live search on its search results page through Steel (https://steel.dev) with the search key. Save every result as a **comparable observation**: title, price, city, category, URL, seen-at. No images, no LLM pass. Then re-run step 2 for that marketplace. A marketplace that still has none finishes as "Nema usporedivih oglasa" (neutral), not as a failure.
4. If still fewer than 5, drop the storage/variant token and say so in the report ("usporedba bez obzira na memoriju").
5. Price statistics use the median and trim outliers by IQR, so accessories and typos that slip through don't move the range.
6. Every check grows the database, so popular items need live searches less often.

No per-category rules and no LLM extraction for comparable observations: one SQL query and one word list.

A background crawler that pre-fills categories is deferred until we know which categories people check.

## Consequences

- A never-seen item can need three live searches (one per marketplace), about $0.03–0.09 per check, falling as the database fills.
- A first check takes roughly 20–40 s, not the 5–10 s in the progress design. Its copy changes to "Obično traje do pola minute. Svaka provjera se prikaže čim je gotova, ne moraš čekati sve." until timings are measured.
- Estimated cost of a fallback search on Steel's Launch plan (pricing read 2026-10-08: $0.10/browser-hour, $10/GB proxy, $3/1k captchas): about $0.01–0.03, dominated by proxy bandwidth. Block images, fonts and media on search pages. The Scale plan ($250/month) drops proxy to $6/GB.
- `Listing` holds both checked listings and comparable observations, so a row must say which it is.
- Matching is token-based, so the exclusion list is what stops "iPhone 13 Pro" matching "iPhone 13 Pro Max" or "maska za iPhone 13 Pro". Listings that omit the storage size are missed at step 2 and only caught by the step 4 fallback. Accepted for simplicity; revisit with per-item attribute extraction if comparables turn out noisy.
