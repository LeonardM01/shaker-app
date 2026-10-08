import { describe, expect, it } from 'vitest'

import type { PatternResult } from '#/features/check/scoring/scam'
import type { Report } from '#/features/report/report-result'
import { trustStatus } from '#/features/report/trust-status'

const clear = (code: PatternResult['code'], strength: PatternResult['strength']): PatternResult => ({
  code,
  strength,
  status: 'clear',
})
const fired = (code: PatternResult['code'], strength: PatternResult['strength']): PatternResult => ({
  code,
  strength,
  status: 'fired',
  evidence: { kind: 'quote', quote: null },
})
const unknown = (code: PatternResult['code'], strength: PatternResult['strength']): PatternResult => ({
  code,
  strength,
  status: 'unknown',
})

const cleanScam: PatternResult[] = [
  clear('duplicate_photo', 'strong'),
  clear('off_platform_payment_link', 'strong'),
  clear('price_far_below_market', 'medium'),
  clear('off_platform_contact', 'weak'),
  clear('advance_payment_only', 'medium'),
  clear('urgency_pressure', 'weak'),
]

const goodQuality: Report['quality'] = {
  kind: 'score',
  value: 82,
  photos: 'good',
  description: 'good',
  defects: 'stated',
  missingCount: 0,
  contradictionCount: 0,
}

const input = (overrides: Partial<Pick<Report, 'scam' | 'quality' | 'offerScore'>> = {}) => ({
  scam: cleanScam,
  quality: goodQuality,
  offerScore: { kind: 'no_data' } as Report['offerScore'],
  ...overrides,
})

describe('trustStatus', () => {
  it('is Provjereno when no pattern fired and the listing reads well', () => {
    expect(trustStatus(input())).toEqual({ kind: 'checked', qualityValue: 82, offerScoreValue: null })
  })

  it('carries Ocjena ponude when there is one', () => {
    const offerScore: Report['offerScore'] = {
      kind: 'score',
      value: 74,
      basis: 'reviews_only',
      reviews: { count: 6, averageStars: 4.5 },
    }
    expect(trustStatus(input({ offerScore }))).toEqual({ kind: 'checked', qualityValue: 82, offerScoreValue: 74 })
  })

  it('is Sumnjivo only with Rizik evidence', () => {
    const scam = cleanScam.map((result) =>
      result.code === 'off_platform_payment_link' ? fired(result.code, result.strength) : result,
    )
    expect(trustStatus(input({ scam }))).toEqual({ kind: 'suspicious', scamSignalCount: 1 })
  })

  it('asks for care, never accuses, on a lone weak signal', () => {
    const scam = cleanScam.map((result) =>
      result.code === 'off_platform_contact' ? fired(result.code, result.strength) : result,
    )
    expect(trustStatus(input({ scam }))).toEqual({ kind: 'caution', reasons: ['scam_signals'], scamSignalCount: 1 })
  })

  it('asks for care on contradictions, poor quality and a low Ocjena ponude', () => {
    const quality: Report['quality'] = { ...goodQuality, value: 30, contradictionCount: 1 }
    const offerScore: Report['offerScore'] = {
      kind: 'score',
      value: 25,
      basis: 'reviews_only',
      reviews: { count: 5, averageStars: 1.5 },
    }
    expect(trustStatus(input({ quality, offerScore }))).toEqual({
      kind: 'caution',
      reasons: ['contradictions', 'low_quality', 'low_offer_score'],
      scamSignalCount: 0,
    })
  })

  it('is unknown, not suspicious, when nothing could be checked', () => {
    const scam = cleanScam.map((result) => unknown(result.code, result.strength))
    expect(trustStatus(input({ scam }))).toEqual({ kind: 'unknown' })
    expect(trustStatus(input({ quality: { kind: 'no_data' } }))).toEqual({ kind: 'unknown' })
  })
})
