import { describe, expect, it } from 'vitest'

import { listingFactsSchema } from '#/features/check/listing-facts'
import { phoneFacts } from '#/features/check/testing/fake-ports'

describe('listingFactsSchema', () => {
  it('truncates over-long model text and lists instead of rejecting the whole extraction', () => {
    const long = 'Oglas koristi generičke promotivne slike Applea, a ne fotografije konkretnog uređaja koji se prodaje.'
    const facts = phoneFacts({
      contradictions: [
        {
          key: 'condition',
          label: 'Stanje uređaja',
          textValue: 'gotovo nekorišten',
          photoValue: 'promotivne fotografije',
          photoIndex: 1,
          photoDescription: long,
        },
      ],
      missingFacts: Array.from({ length: 12 }, (_, index) => ({
        key: `fact_${String(index)}`,
        label: `podatak ${String(index)}`,
        whyItMatters: 'Važno je.',
      })),
    })

    const parsed = listingFactsSchema.parse(facts)

    expect(parsed.contradictions[0]?.photoDescription).toBe(long.slice(0, 80))
    expect(parsed.missingFacts).toHaveLength(8)
  })

  it('still rejects a missing required field', () => {
    const { searchKey: _, ...withoutKey } = phoneFacts()
    expect(listingFactsSchema.safeParse(withoutKey).success).toBe(false)
  })
})
