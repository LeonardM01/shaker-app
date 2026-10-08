// What a finished check stores. Every score is a pure function of stored
// inputs and carries the ruleset that computed it (ADR 0005).

import type { JevAnswers, ListingQuality } from '#/features/check/scoring/listing-quality'
import type { OfferScore } from '#/features/check/scoring/offer-score'
import type { PriceStats, SuggestedOffer } from '#/features/check/scoring/price'
import type { PatternResult } from '#/features/check/scoring/scam'
import type { Verdict } from '#/lib/listing'

/** Bump when a weight, threshold or rule in `scoring/` changes. */
export const rulesetVersion = '2026-10-08.1'

export type CheckOutcome = {
  rulesetVersion: string
  priceCents: number | null
  /** Price against comparables alone. */
  priceVerdict: Verdict
  /** The badge: the price verdict, or `risk` per the scam rule. */
  verdict: Verdict
  /** Stats over every marketplace's comparables together. */
  market: PriceStats | null
  /** The storage/variant token was dropped to find enough comparables. */
  widened: boolean
  offer: SuggestedOffer | null
  offerScore: OfferScore
  quality: ListingQuality
  scam: PatternResult[]
  /** Jev's answers as received, so the quality score can be recomputed. */
  jev: JevAnswers
}

/** Report text from the final writer step (ADR 0009). Croatian. */
export type WrittenText = {
  /** Sažetak: two to three sentences. Never names the offer. */
  summary: string
  /** Što pitati prodavatelja?; `sourceKey` links a question to its missing fact or contradiction. */
  questions: { key: string; text: string; sourceKey: string | null }[]
  /** Provjeri prije plaćanja, for the listing's category. */
  checklist: { key: string; text: string }[]
  /** The offer message with a `{ponuda}` placeholder the server fills for signed-in users. */
  offerMessage: string
}

export const offerPlaceholder = '{ponuda}'
