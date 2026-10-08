import { describe, expect, it } from 'vitest'

import { unknownNumbers } from '#/features/check/scoring/number-guard'

describe('unknownNumbers', () => {
  const inputs = {
    facts: { searchKey: 'iPhone 13 Pro 128 GB', battery: '91 %' },
    reasons: [{ code: 'price_vs_market', percent: 8 }],
  }

  it('accepts text whose numbers all appear in the inputs', () => {
    expect(
      unknownNumbers('iPhone 13 Pro sa 128 GB, baterija 91 %. Cijena je 8 % iznad prosjeka.', inputs),
    ).toEqual([])
  })

  it('returns numbers the inputs never mention, such as a leaked offer', () => {
    expect(unknownNumbers('Ponudi 590 € umjesto 640 €.', inputs)).toEqual(['590', '640'])
  })

  it('reads Croatian thousands and decimal separators as one number', () => {
    expect(unknownNumbers('Cijena 1.200 € ili 4,6 zvjezdica.', { price: 1200, stars: 4.6 })).toEqual(
      [],
    )
    expect(unknownNumbers('Cijena 1.250 €.', { price: 1200 })).toEqual(['1250'])
  })

  it('ignores the {ponuda} placeholder', () => {
    expect(unknownNumbers('Nudim {ponuda}, može?', {})).toEqual([])
  })
})
