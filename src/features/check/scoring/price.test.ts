import { describe, expect, it } from 'vitest'

import { priceStats, priceVerdict, suggestOffer } from '#/features/check/scoring/price'

const euros = (...values: number[]) => values.map((value) => value * 100)

describe('priceStats', () => {
  it('returns null for no prices', () => {
    expect(priceStats([])).toBeNull()
  })

  it('takes the median, low and high of the prices', () => {
    expect(priceStats(euros(600, 560, 640, 580, 620))).toEqual({
      count: 5,
      medianCents: 60000,
      lowCents: 56000,
      highCents: 64000,
    })
  })

  it('averages the middle pair for an even count', () => {
    expect(priceStats(euros(500, 600, 700, 800))?.medianCents).toBe(65000)
  })

  it("trims IQR outliers so a cover or a typo doesn't move the range", () => {
    const stats = priceStats(euros(15, 560, 580, 590, 600, 610, 620, 640, 6000))
    expect(stats).toEqual({ count: 9, medianCents: 600_00, lowCents: 560_00, highCents: 640_00 })
  })
})

describe('priceVerdict', () => {
  const market = priceStats(euros(560, 580, 590, 600, 610, 620, 640))

  it('is no_data with fewer than 5 comparables', () => {
    expect(priceVerdict(50000, priceStats(euros(500, 600, 700, 800)))).toBe('no_data')
    expect(priceVerdict(50000, null)).toBe('no_data')
  })

  it('is no_data without a price', () => {
    expect(priceVerdict(null, market)).toBe('no_data')
  })

  it('is great below the market, fair around it, haggle above it', () => {
    expect(priceVerdict(52000, market)).toBe('great_price')
    expect(priceVerdict(60000, market)).toBe('fair_price')
    expect(priceVerdict(62500, market)).toBe('fair_price')
    expect(priceVerdict(64000, market)).toBe('room_to_haggle')
  })
})

describe('suggestOffer', () => {
  const market = priceStats(euros(560, 580, 590, 592, 600, 610, 620))

  it('offers the market median rounded down when the price is above it', () => {
    expect(suggestOffer(64000, market)).toEqual({
      offerCents: 59000,
      savingCents: 5000,
      savingPercent: 8,
    })
  })

  it('offers a little under the asking price when it is already at or below the market', () => {
    expect(suggestOffer(55000, market)).toEqual({
      offerCents: 52000,
      savingCents: 3000,
      savingPercent: 5,
    })
  })

  it('rounds to whole euros for cheap items', () => {
    expect(suggestOffer(4500, priceStats(euros(30, 35, 38, 40, 42)))?.offerCents).toBe(3800)
  })

  it('offers nothing with fewer than 5 comparables or without a price', () => {
    expect(suggestOffer(64000, priceStats(euros(560, 580)))).toBeNull()
    expect(suggestOffer(null, market)).toBeNull()
  })
})
