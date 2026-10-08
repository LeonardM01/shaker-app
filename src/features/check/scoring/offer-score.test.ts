import { describe, expect, it } from 'vitest'

import { offerScore } from '#/features/check/scoring/offer-score'
import { priceStats } from '#/features/check/scoring/price'

const euros = (...values: number[]) => values.map((value) => value * 100)

// Worked example: 10 five-star reviews against a platform average of 4.0
// smooth to (5·4 + 10·5) / 15 = 4.667 stars, a review part of 91.7.
const goodSeller = { count: 10, averageStars: 5 }
const platformAverageStars = 4

describe('offerScore', () => {
  it('has no data when the seller has fewer than 5 reviews, whatever the comparables', () => {
    expect(
      offerScore({
        reviews: { count: 4, averageStars: 5 },
        platformAverageStars,
        priceCents: 54000,
        stats: priceStats(euros(600, 600, 600, 600, 600, 600)),
      }),
    ).toEqual({ kind: 'no_data' })
  })

  it('rests on reviews alone when there are no comparables', () => {
    expect(
      offerScore({ reviews: goodSeller, platformAverageStars, priceCents: 54000, stats: null }),
    ).toEqual({ kind: 'score', value: 92, basis: 'reviews_only', reviews: goodSeller })
  })

  it('weights the price part by n/5 and pulls the rest to 50 with 1–4 comparables', () => {
    // r = 540/600 = 0.9 → price part 75, weighted 2/5 → 60; 0.4·91.7 + 0.6·60 = 72.7
    expect(
      offerScore({
        reviews: goodSeller,
        platformAverageStars,
        priceCents: 54000,
        stats: priceStats(euros(600, 600)),
      }),
    ).toEqual({
      kind: 'score',
      value: 73,
      basis: 'reviews_and_price',
      reviews: goodSeller,
      priceDiffPercent: -10,
    })
  })

  it('counts the price part at full weight with 5 or more comparables', () => {
    // 0.4·91.7 + 0.6·75 = 81.7
    expect(
      offerScore({
        reviews: goodSeller,
        platformAverageStars,
        priceCents: 54000,
        stats: priceStats(euros(600, 600, 600, 600, 600)),
      }),
    ).toMatchObject({ kind: 'score', value: 82, basis: 'reviews_and_price' })
  })

  it('scores a good price from a poorly reviewed seller lower', () => {
    const stats = priceStats(euros(600, 600, 600, 600, 600))
    const good = offerScore({ reviews: goodSeller, platformAverageStars, priceCents: 54000, stats })
    const poor = offerScore({
      reviews: { count: 10, averageStars: 2 },
      platformAverageStars,
      priceCents: 54000,
      stats,
    })
    expect(poor.kind === 'score' && good.kind === 'score' && poor.value < good.value).toBe(true)
  })

  it('falls back to reviews only when the listing shows no price', () => {
    expect(
      offerScore({
        reviews: goodSeller,
        platformAverageStars,
        priceCents: null,
        stats: priceStats(euros(600, 600, 600, 600, 600)),
      }),
    ).toMatchObject({ kind: 'score', value: 92, basis: 'reviews_only' })
  })
})
