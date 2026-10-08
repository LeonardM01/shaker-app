// Ocjena ponude (ADR 0005): the seller's Shaker reviews, combined with price
// fairness when there are comparables. Plain arithmetic, no model.

import { minComparables } from '#/features/check/scoring/price'
import type { PriceStats } from '#/features/check/scoring/price'

/** Real reviews only: demo reviews never reach a score. */
export type ReviewStats = { count: number; averageStars: number }

export type OfferScore =
  /** "Još nemamo dovoljno podataka": fewer than 5 reviews. Never a made-up score. */
  | { kind: 'no_data' }
  | {
      kind: 'score'
      /** 0–100. */
      value: number
      /** "Ocjena se temelji samo na recenzijama prodavača" when reviews_only. */
      basis: 'reviews_only'
      reviews: ReviewStats
    }
  | {
      kind: 'score'
      value: number
      basis: 'reviews_and_price'
      reviews: ReviewStats
      /** Asking price against the comparables' median, in whole percent. */
      priceDiffPercent: number
    }

export const offerScoreRules = {
  minReviews: 5,
  /** The prior before Shaker has any real reviews. */
  defaultPlatformAverageStars: 4,
  /** How many platform-average reviews the Bayesian average starts from. */
  reviewPriorWeight: 5,
  reviewWeight: 0.4,
  priceWeight: 0.6,
  /** Price part points per 1 % under (or over) the median, around 50. */
  pricePointsPerPercent: 2.5,
}

const clamp = (value: number) => Math.min(100, Math.max(0, value))

function reviewPart({ count, averageStars }: ReviewStats, platformAverageStars: number): number {
  const prior = offerScoreRules.reviewPriorWeight
  const smoothed = (prior * platformAverageStars + count * averageStars) / (prior + count)
  return ((smoothed - 1) / 4) * 100
}

export function offerScore({
  reviews,
  platformAverageStars,
  priceCents,
  stats,
}: {
  reviews: ReviewStats
  platformAverageStars: number
  priceCents: number | null
  stats: PriceStats | null
}): OfferScore {
  if (reviews.count < offerScoreRules.minReviews) return { kind: 'no_data' }
  const fromReviews = reviewPart(reviews, platformAverageStars)

  if (priceCents === null || !stats || stats.count === 0) {
    return { kind: 'score', value: Math.round(fromReviews), basis: 'reviews_only', reviews }
  }

  const diffPercent = (priceCents / stats.medianCents - 1) * 100
  const fullPricePart = clamp(50 - diffPercent * offerScoreRules.pricePointsPerPercent)
  // With 1–4 comparables the price part only moves away from neutral 50 by n/5.
  const confidence = Math.min(stats.count, minComparables) / minComparables
  const pricePart = 50 + (fullPricePart - 50) * confidence
  return {
    kind: 'score',
    value: Math.round(
      offerScoreRules.reviewWeight * fromReviews + offerScoreRules.priceWeight * pricePart,
    ),
    basis: 'reviews_and_price',
    reviews,
    priceDiffPercent: Math.round(diffPercent),
  }
}
