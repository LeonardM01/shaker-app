import { describe, expect, it } from 'vitest'

import type { ScamSignals } from '#/features/check/listing-facts'
import { priceStats } from '#/features/check/scoring/price'
import { evaluateScamPatterns, finalVerdict, isRisk } from '#/features/check/scoring/scam'

const clear = { present: false, evidence: null }
const noSignals: ScamSignals = {
  offPlatformPaymentLink: clear,
  offPlatformContact: clear,
  advancePaymentOnly: clear,
  urgency: clear,
}
const market = priceStats([60000, 60000, 60000, 60000, 60000, 60000])

const statusOf = (results: ReturnType<typeof evaluateScamPatterns>, code: string) =>
  results.find((result) => result.code === code)?.status

describe('evaluateScamPatterns', () => {
  it('checks all six patterns and finds nothing on a clean listing', () => {
    const results = evaluateScamPatterns({
      duplicatePhotos: { otherListingCount: 0 },
      signals: noSignals,
      priceCents: 58000,
      stats: market,
    })
    expect(results.map(({ code, status }) => [code, status])).toEqual([
      ['duplicate_photo', 'clear'],
      ['off_platform_payment_link', 'clear'],
      ['price_far_below_market', 'clear'],
      ['off_platform_contact', 'clear'],
      ['advance_payment_only', 'clear'],
      ['urgency_pressure', 'clear'],
    ])
    expect(isRisk(results)).toBe(false)
  })

  it('carries the evidence next to a reused photo', () => {
    const results = evaluateScamPatterns({
      duplicatePhotos: { otherListingCount: 3 },
      signals: noSignals,
      priceCents: 58000,
      stats: market,
    })
    expect(results[0]).toEqual({
      code: 'duplicate_photo',
      strength: 'strong',
      status: 'fired',
      evidence: { kind: 'duplicate_photo', otherListingCount: 3 },
    })
  })

  it('flags a price under half the median only with at least 5 comparables', () => {
    const cheap = { duplicatePhotos: null, signals: noSignals, priceCents: 25000 }
    expect(
      evaluateScamPatterns({ ...cheap, stats: market }).find(
        (result) => result.code === 'price_far_below_market',
      ),
    ).toMatchObject({
      status: 'fired',
      evidence: { kind: 'price_far_below_market', priceCents: 25000, medianCents: 60000 },
    })
    expect(
      statusOf(
        evaluateScamPatterns({ ...cheap, stats: priceStats([60000, 60000]) }),
        'price_far_below_market',
      ),
    ).toBe('unknown')
  })

  it('quotes the text for each signal the extractor found', () => {
    const results = evaluateScamPatterns({
      duplicatePhotos: { otherListingCount: 0 },
      signals: { ...noSignals, offPlatformContact: { present: true, evidence: 'javi se na WhatsApp' } },
      priceCents: 58000,
      stats: market,
    })
    expect(results.find((result) => result.code === 'off_platform_contact')).toEqual({
      code: 'off_platform_contact',
      strength: 'weak',
      status: 'fired',
      evidence: { kind: 'quote', quote: 'javi se na WhatsApp' },
    })
  })

  it('marks patterns unknown when their input is missing, never suspicious', () => {
    const results = evaluateScamPatterns({
      duplicatePhotos: null,
      signals: null,
      priceCents: null,
      stats: null,
    })
    expect(results.every((result) => result.status === 'unknown')).toBe(true)
    expect(isRisk(results)).toBe(false)
  })
})

describe('the Rizik rule', () => {
  const evaluate = (signals: Partial<ScamSignals>, otherListingCount = 0, priceCents = 58000) =>
    evaluateScamPatterns({
      duplicatePhotos: { otherListingCount },
      signals: { ...noSignals, ...signals },
      priceCents,
      stats: market,
    })
  const fired = { present: true, evidence: 'x' }

  it('is risk with any strong pattern', () => {
    expect(isRisk(evaluate({}, 2))).toBe(true)
    expect(isRisk(evaluate({ offPlatformPaymentLink: fired }))).toBe(true)
  })

  it('is risk with two medium patterns but not with one', () => {
    expect(isRisk(evaluate({ advancePaymentOnly: fired }))).toBe(false)
    expect(isRisk(evaluate({ advancePaymentOnly: fired }, 0, 20000))).toBe(true)
  })

  it('is not risk with weak patterns alone', () => {
    expect(isRisk(evaluate({ offPlatformContact: fired, urgency: fired }))).toBe(false)
  })

  it('replaces the price verdict, even a great price', () => {
    expect(finalVerdict('great_price', evaluate({ offPlatformPaymentLink: fired }))).toBe('risk')
    expect(finalVerdict('great_price', evaluate({ urgency: fired }))).toBe('great_price')
  })
})
