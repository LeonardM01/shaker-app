// Price against comparables (ADR 0002, 0005): IQR-trimmed stats, the price
// verdict and the suggested offer. Money is integer cents throughout.

import type { Verdict } from '#/lib/listing'

/** Below this many comparables there is no market price to speak of. */
export const minComparables = 5

export type PriceStats = {
  /** Every comparable, including the trimmed outliers. */
  count: number
  medianCents: number
  lowCents: number
  highCents: number
}

/** Quantile with linear interpolation between closest ranks. */
function quantile(sorted: readonly number[], q: number): number {
  const position = (sorted.length - 1) * q
  const lower = Math.floor(position)
  const below = sorted[lower] ?? 0
  const above = sorted[lower + 1] ?? below
  return below + (above - below) * (position - lower)
}

/**
 * Median, low and high after dropping values outside 1.5 IQR, so accessories
 * and typos that slip through matching don't move the range.
 */
export function priceStats(pricesCents: readonly number[]): PriceStats | null {
  if (pricesCents.length === 0) return null
  const sorted = [...pricesCents].sort((a, b) => a - b)
  const q1 = quantile(sorted, 0.25)
  const q3 = quantile(sorted, 0.75)
  const spread = 1.5 * (q3 - q1)
  const kept = sorted.filter((price) => price >= q1 - spread && price <= q3 + spread)
  return {
    count: sorted.length,
    medianCents: Math.round(quantile(kept, 0.5)),
    lowCents: kept[0] ?? 0,
    highCents: kept.at(-1) ?? 0,
  }
}

/** The market when there are enough comparables to have one. */
export function marketOf(stats: PriceStats | null): PriceStats | null {
  return stats && stats.count >= minComparables ? stats : null
}

/** Within this share of the median a price is fair. */
const fairBand = 0.05

/** Price only; the scam rule overrides it with `risk` (see scam.ts). */
export function priceVerdict(priceCents: number | null, stats: PriceStats | null): Verdict {
  const market = marketOf(stats)
  if (priceCents === null || !market) return 'no_data'
  const ratio = priceCents / market.medianCents
  if (ratio < 1 - fairBand) return 'great_price'
  if (ratio <= 1 + fairBand) return 'fair_price'
  return 'room_to_haggle'
}

export type SuggestedOffer = {
  offerCents: number
  savingCents: number
  /** Whole percent of the asking price. */
  savingPercent: number
}

/** When the asking price is already at or below the market, offer this much less. */
const belowMarketDiscount = 0.05

/** Offers round down to a step that reads naturally for the price. */
function roundingStepCents(priceCents: number): number {
  if (priceCents < 100_00) return 1_00
  if (priceCents < 1000_00) return 10_00
  if (priceCents < 10_000_00) return 50_00
  return 100_00
}

/**
 * The market median when the price is above it, otherwise a little under the
 * asking price. Rounded down. None without a market.
 */
export function suggestOffer(
  priceCents: number | null,
  stats: PriceStats | null,
): SuggestedOffer | null {
  const market = marketOf(stats)
  if (priceCents === null || priceCents === 0 || !market) return null
  const target =
    priceCents > market.medianCents ? market.medianCents : priceCents * (1 - belowMarketDiscount)
  const step = roundingStepCents(priceCents)
  const offerCents = Math.floor(target / step) * step
  const savingCents = priceCents - offerCents
  return { offerCents, savingCents, savingPercent: Math.round((savingCents / priceCents) * 100) }
}
