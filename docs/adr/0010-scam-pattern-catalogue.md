# 0010: A fixed catalogue of six scam patterns

- Status: accepted
- Date: 2026-10-08

## Context

Znakovi prijevare promises "Provjerili smo 6 poznatih obrazaca prijevare s Njuškala i Facebooka". Product rules: risk red only next to the evidence that triggered it; no data is unknown, not suspicious; never word a seller as guilty without evidence.

## Decision

| # | Pattern | Detected by | Strength |
| --- | --- | --- | --- |
| 1 | Same photo on a different seller's listing | pHash in our database (ADR 0007) | strong |
| 2 | Payment or delivery link outside the marketplace (fake "dostava" / "sigurna kupnja" pages) | Gemini fact | strong |
| 3 | Price under 50 % of the trimmed median, with ≥5 comparables | code | medium |
| 4 | Asks to move to WhatsApp, Telegram or e-mail | Gemini fact | weak |
| 5 | Advance payment only, no pickup or cash on delivery | Gemini fact | medium |
| 6 | Urgency or pressure ("danas zadnji dan", "već imam kupca") | Gemini fact | weak |

- **Rizik verdict:** any strong pattern, or two or more medium ones. It replaces the price verdict.
- A weak pattern, or a single medium one, shows as a warning row next to its evidence; the verdict stays price-based.
- A new seller account is neutral information, never a pattern.
- **Message check:** patterns 2, 4, 5 and 6 run on a pasted seller message in one Gemini call; the result is shown inline and the message is not stored.

## Consequences

- Each pattern is a code (extends `RiskEvidenceKind`) with its evidence, so copy and colour stay next to the evidence.
- Adding a pattern changes the "6 poznatih obrazaca" copy; keep the count derived from the catalogue.
