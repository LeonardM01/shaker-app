// The fixed catalogue of six scam patterns (ADR 0010). Each fired pattern
// carries its evidence, so risk red only ever appears next to it.

import type { ScamSignals } from '#/features/check/listing-facts'
import { marketOf } from '#/features/check/scoring/price'
import type { PriceStats } from '#/features/check/scoring/price'
import type { Verdict } from '#/lib/listing'

export const scamPatterns = [
  { code: 'duplicate_photo', strength: 'strong' },
  { code: 'off_platform_payment_link', strength: 'strong' },
  { code: 'price_far_below_market', strength: 'medium' },
  { code: 'off_platform_contact', strength: 'weak' },
  { code: 'advance_payment_only', strength: 'medium' },
  { code: 'urgency_pressure', strength: 'weak' },
] as const

type Pattern = (typeof scamPatterns)[number]
export type ScamPatternCode = Pattern['code']
export type PatternStrength = Pattern['strength']

/** The patterns read from text, which the message check also runs. */
export type TextPatternCode = Exclude<ScamPatternCode, 'duplicate_photo' | 'price_far_below_market'>

export type PatternEvidence =
  /** The same photo on this many listings of other sellers. */
  | { kind: 'duplicate_photo'; otherListingCount: number }
  | { kind: 'price_far_below_market'; priceCents: number; medianCents: number }
  /** What the text says, verbatim; null when the model saw it but couldn't quote it. */
  | { kind: 'quote'; quote: string | null }

export type PatternResult =
  | { code: ScamPatternCode; strength: PatternStrength; status: 'clear' }
  | { code: ScamPatternCode; strength: PatternStrength; status: 'fired'; evidence: PatternEvidence }
  /** Its input is missing (a failed step, too few comparables). Gray, never suspicious. */
  | { code: ScamPatternCode; strength: PatternStrength; status: 'unknown' }

/** Under this share of the trimmed median a price is "too good to be true". */
const farBelowMarketShare = 0.5

const signalKeys: Record<TextPatternCode, keyof ScamSignals> = {
  off_platform_payment_link: 'offPlatformPaymentLink',
  off_platform_contact: 'offPlatformContact',
  advance_payment_only: 'advancePaymentOnly',
  urgency_pressure: 'urgency',
}

function textEvidence(code: TextPatternCode, signals: ScamSignals | null): PatternEvidence | null | undefined {
  if (!signals) return undefined
  const signal = signals[signalKeys[code]]
  return signal.present ? { kind: 'quote', quote: signal.evidence } : null
}

/** Evidence when the pattern fired, null when clear, undefined when unknown. */
function evidenceFor(
  code: ScamPatternCode,
  input: Parameters<typeof evaluateScamPatterns>[0],
): PatternEvidence | null | undefined {
  switch (code) {
    case 'duplicate_photo': {
      const duplicates = input.duplicatePhotos
      if (!duplicates) return undefined
      return duplicates.otherListingCount > 0
        ? { kind: 'duplicate_photo', otherListingCount: duplicates.otherListingCount }
        : null
    }
    case 'price_far_below_market': {
      const market = marketOf(input.stats)
      if (!market || input.priceCents === null) return undefined
      return input.priceCents < market.medianCents * farBelowMarketShare
        ? { kind: 'price_far_below_market', priceCents: input.priceCents, medianCents: market.medianCents }
        : null
    }
    case 'off_platform_payment_link':
    case 'off_platform_contact':
    case 'advance_payment_only':
    case 'urgency_pressure':
      return textEvidence(code, input.signals)
  }
}

function resultOf(
  { code, strength }: Pattern,
  evidence: PatternEvidence | null | undefined,
): PatternResult {
  if (evidence === undefined) return { code, strength, status: 'unknown' }
  if (evidence === null) return { code, strength, status: 'clear' }
  return { code, strength, status: 'fired', evidence }
}

/** All six patterns, in catalogue order. */
export function evaluateScamPatterns(input: {
  /** Null when the photo step failed. */
  duplicatePhotos: { otherListingCount: number } | null
  /** Null when extraction failed. */
  signals: ScamSignals | null
  priceCents: number | null
  stats: PriceStats | null
}): PatternResult[] {
  return scamPatterns.map((pattern) => resultOf(pattern, evidenceFor(pattern.code, input)))
}

/** The message check: patterns 2, 4, 5 and 6 on a pasted message. */
export function evaluateMessagePatterns(signals: ScamSignals): PatternResult[] {
  return scamPatterns.flatMap((pattern) =>
    pattern.code === 'duplicate_photo' || pattern.code === 'price_far_below_market'
      ? []
      : [resultOf(pattern, textEvidence(pattern.code, signals))],
  )
}

/** Rizik: any strong pattern, or two or more medium ones. */
export function isRisk(results: readonly PatternResult[]): boolean {
  const fired = results.filter((result) => result.status === 'fired')
  return (
    fired.some((result) => result.strength === 'strong') ||
    fired.filter((result) => result.strength === 'medium').length >= 2
  )
}

export function finalVerdict(price: Verdict, results: readonly PatternResult[]): Verdict {
  return isRisk(results) ? 'risk' : price
}
