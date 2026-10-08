import { describe, expect, it } from 'vitest'

import {
  isComparableTitle,
  normalizeTitle,
  searchKeyTokens,
  widenSearchKey,
} from '#/features/check/scoring/comparables'

describe('normalizeTitle', () => {
  it('lowercases, folds diacritics and splits numbers from units', () => {
    expect(normalizeTitle('iPhone 13 Pro 128GB, Zelena boja!')).toBe(
      ' iphone 13 pro 128 gb zelena boja ',
    )
    expect(normalizeTitle('Kauč  na razvlačenje')).toBe(' kauc na razvlacenje ')
  })
})

describe('isComparableTitle', () => {
  const tokens = searchKeyTokens('iPhone 13 Pro 128 GB')

  it('matches a title that contains every search-key token', () => {
    expect(isComparableTitle('Prodajem iPhone 13 Pro 128GB zeleni, odličan', tokens)).toBe(true)
  })

  it('rejects a title missing a token', () => {
    expect(isComparableTitle('iPhone 13 128 GB', tokens)).toBe(false)
  })

  it('matches tokens as whole words only', () => {
    expect(isComparableTitle('iPhone 13 Pro 1128 GB', tokens)).toBe(false)
  })

  it('rejects other models, accessories, swaps and parts listings', () => {
    expect(isComparableTitle('iPhone 13 Pro Max 128 GB', tokens)).toBe(false)
    expect(isComparableTitle('Maska za iPhone 13 Pro 128 GB', tokens)).toBe(false)
    expect(isComparableTitle('iPhone 13 Pro 128 GB zamjena za Samsung', tokens)).toBe(false)
    expect(isComparableTitle('iPhone 13 Pro 128 GB za dijelove', tokens)).toBe(false)
    expect(isComparableTitle('iPhone 13 Pro 128 GB samo kutija', tokens)).toBe(false)
  })

  it("doesn't exclude a word the search key itself contains", () => {
    const maxTokens = searchKeyTokens('iPhone 13 Pro Max 256 GB')
    expect(isComparableTitle('iPhone 13 Pro Max 256GB plavi', maxTokens)).toBe(true)
  })
})

describe('widenSearchKey', () => {
  it('drops the storage token', () => {
    expect(widenSearchKey(searchKeyTokens('iPhone 13 Pro 128 GB'))).toEqual(['iphone', '13', 'pro'])
    expect(widenSearchKey(searchKeyTokens('MacBook Air M1 1 TB'))).toEqual(['macbook', 'air', 'm1'])
  })

  it('returns null when there is nothing to drop', () => {
    expect(widenSearchKey(searchKeyTokens('Scott Scale 970'))).toBeNull()
  })
})
