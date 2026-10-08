import { describe, expect, it } from 'vitest'

import type { ListingFacts } from '#/features/check/listing-facts'
import { listingQuality } from '#/features/check/scoring/listing-quality'

const clear = { present: false, evidence: null }

function factsWith(overrides: Partial<ListingFacts> = {}): ListingFacts {
  return {
    searchKey: 'iPhone 13 Pro 128 GB',
    category: 'phones',
    statedSpecs: [],
    missingFacts: [],
    contradictions: [],
    confirmedFacts: [],
    photos: [],
    conditionNotes: 'Like new, no scratches.',
    scamSignals: {
      offPlatformPaymentLink: clear,
      offPlatformContact: clear,
      advancePaymentOnly: clear,
      urgency: clear,
    },
    ...overrides,
  }
}

const twoMissingOneContradiction = factsWith({
  missingFacts: [
    { key: 'receipt_or_warranty', label: 'račun ili jamstvo', whyItMatters: 'Dokazuje porijeklo.' },
    { key: 'imei', label: 'IMEI', whyItMatters: 'Provjera krađe.' },
  ],
  contradictions: [
    {
      key: 'battery_health',
      label: 'Baterija',
      textValue: '91 %',
      photoValue: '86 %',
      photoIndex: 5,
      photoDescription: 'Snimka zaslona iz Postavki',
    },
  ],
})

const confident = (value: number) => ({ value, confidence: 0.9 })

describe('listingQuality', () => {
  it('combines Jev answers and extractor facts into a weighted score', () => {
    // 0.3·90 + 0.3·80 + 0.1·100 + 0.15·60 + 0.15·50 = 77.5
    expect(
      listingQuality({
        facts: twoMissingOneContradiction,
        photoCount: 6,
        jev: {
          photos_show_condition: confident(0.9),
          description_complete: confident(0.8),
          defects_stated: confident(1),
        },
      }),
    ).toEqual({
      kind: 'score',
      value: 78,
      photos: 'good',
      description: 'good',
      defects: 'stated',
      missingCount: 2,
      contradictionCount: 1,
    })
  })

  it('drops an answer below the confidence threshold and shows that part as unknown', () => {
    // (0.3·80 + 0.1·100 + 0.15·60 + 0.15·50) / 0.7 = 72.1
    expect(
      listingQuality({
        facts: twoMissingOneContradiction,
        photoCount: 6,
        jev: {
          photos_show_condition: { value: 0.9, confidence: 0.3 },
          description_complete: confident(0.8),
          defects_stated: confident(1),
        },
      }),
    ).toMatchObject({ kind: 'score', value: 72, photos: 'unknown' })
  })

  it('still scores from the extractor facts when Jev gave nothing', () => {
    // (0.15·100 + 0.15·100) / 0.3 = 100
    expect(listingQuality({ facts: factsWith(), photoCount: 3, jev: {} })).toEqual({
      kind: 'score',
      value: 100,
      photos: 'unknown',
      description: 'unknown',
      defects: 'unknown',
      missingCount: 0,
      contradictionCount: 0,
    })
  })

  it('scores the photos part as poor when the listing has no photos', () => {
    expect(
      listingQuality({
        facts: factsWith(),
        photoCount: 0,
        jev: { photos_show_condition: confident(0.9) },
      }),
    ).toMatchObject({ photos: 'poor' })
  })

  it('has no data without extracted facts', () => {
    expect(listingQuality({ facts: null, photoCount: 6, jev: {} })).toEqual({ kind: 'no_data' })
  })
})
