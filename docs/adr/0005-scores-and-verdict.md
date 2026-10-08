# 0005: How Ocjena ponude, Kvaliteta oglasa and the verdict are computed

- Status: accepted
- Date: 2026-10-08

## Context

The report shows two scores (Ocjena ponude, Kvaliteta oglasa), a price verdict badge and a suggested offer. Scores must be explainable and reproducible, must treat missing data as unknown (gray), and must be fair to sellers. At launch almost no seller has Vrijedi.Ly reviews and many items have few comparables.

TypeSafe Jev (https://docs.typesafe.ai, read 2026-10-08) returns typed answers (Choice, Score on a 2–10 level rubric, Noul 0–1) with probabilities and `confidence`. It is text only, English-first, $0.042 per 1M input tokens, and does not document determinism. Its docs recommend atomic questions combined by your own code.

## Decision

**Verdict badge, Usporedba cijena, Predložena ponuda:** price only, from comparables (ADR 0002). Need ≥5 comparables, otherwise `no_data`.

**Ocjena ponude:** plain TypeScript, no model.

```
seller reviews < 5      → no_data ("Još nemamo dovoljno podataka")
reviews ≥ 5, n = 0      → reviews only ("Ocjena se temelji samo na recenzijama prodavača")
reviews ≥ 5, n = 1..4   → reviews + price part weighted n/5, rest pulled to neutral 50
reviews ≥ 5, n ≥ 5      → reviews + price part at full weight
```

- Price part: listing price against the IQR-trimmed median of comparables.
- Review part: Bayesian average of stars, smoothed toward the platform average. Verified-purchase reviews get a higher weight once purchases can be verified (ADR 0011); until then all real reviews weigh the same.
- The comparable count is not shown with the score.

**Kvaliteta oglasa:** always shown.

1. Gemini (ADR 0004) reads photos and Croatian text and returns English-keyed JSON facts (photo contents, stated/missing facts, contradictions).
2. Jev answers atomic questions on those facts (e.g. Score: how well the photos show condition; Score: how complete the description is; Noul: defects are stated; Noul: asks to move contact off the platform).
3. Our code combines answers into 0–100 with a weighted formula. Answers below a confidence threshold are dropped and that part shows as unknown.

"Što nedostaje ili se ne slaže" rows come from Gemini's facts, not from Jev.

**Both scores** are pure functions of stored inputs (facts, Jev answers, comparable stats, review stats) and carry a `rulesetVersion`. Reasons are codes with parameters; Croatian copy is rendered from the feature's copy file. Initial weights are set during the model eval (ADR 0004).

**Demo reviews** we write ourselves exist only on labelled demo listings and are excluded from every real score and query (PRODUCT.md: no invented testimonials).

## Consequences

- At launch Ocjena ponude is gray on most real listings; the verdict, price comparison and Kvaliteta oglasa still answer the buyer.
- Re-running extraction can change facts (LLMs aren't deterministic); a stored check never changes.
- Jev on Croatian content is untested; feeding it English-keyed facts from Gemini limits that risk.
