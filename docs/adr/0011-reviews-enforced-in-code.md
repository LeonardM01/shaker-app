# 0011: Review rules are enforced in code, with no moderation

- Status: accepted, amended by ADR 0014 for extension reviews
- Date: 2026-10-08

## Context

Vrijedi.Ly reviews feed Ocjena ponude (≥5 needed, ADR 0005), so they invite self-reviews and review bombing. The design says "41 od 48 recenzija napisali su kupci s potvrđenom kupnjom", but nothing confirms a purchase yet. For the MVP every rule must be enforceable by code, with no manual moderation.

## Decision

| Rule | Enforced by |
| --- | --- |
| Only signed-in users review | Session check in the server function |
| One review per seller per user | Unique `(userId, sellerId)` on reviews |
| No review of a seller you've claimed | Claim lookup before insert |
| A review is about one listing | Required `listingId` |
| One seller reply per review, by the claiming user | Unique `reviewId` on replies (ADR 0008) |
| Demo reviews never count | `isDemo` flag excluded from every real query and score |

- **Potvrđena kupnja is a placeholder.** Reviews carry a `verifiedPurchase` field that is always `false` until real proof of purchase exists. The UI keeps its slot, but nothing is shown as confirmed and the "X od Y recenzija … potvrđenom kupnjom" line is hidden while the count is zero. Demo reviews may set it, as labelled examples.
- Ocjena ponude weights all real reviews equally until `verifiedPurchase` can be true.

## Consequences

- No moderation tooling for the MVP. Abuse (multiple accounts) is possible; revisit with account age, rate limits or proof of purchase.
- Turning on purchase verification later is a data change plus a weight in the scoring ruleset, not a schema change.
