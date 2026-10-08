// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { facebookItemId, facebookSearchUrl } from '#/features/marketplaces/facebook-marketplace/facebook-urls'
import { parseFacebookSearchPage } from '#/features/marketplaces/facebook-marketplace/parse-search-page'

// Logged-out search for "iPhone 13 Pro 128 GB" around Zagreb, saved 2026-10-08.
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

describe('parseFacebookSearchPage', () => {
  const results = parseFacebookSearchPage(fixture('search-page.html'))

  it('reads every listing in the first page of results', () => {
    expect(results).toHaveLength(24)
  })

  it('reads the fields of a result', () => {
    expect(results[0]).toEqual({
      externalId: '1838276653964413',
      url: 'https://www.facebook.com/marketplace/item/1838276653964413/',
      title: 'iPhone 13 pro Alpine green',
      priceCents: 26_900,
      city: 'Zagreb',
      postedAt: new Date('2026-09-30T10:33:25.000Z'),
    })
    expect(results.find((result) => result.externalId === '977288584675638')).toMatchObject({
      title: 'Iphone 13 Pro',
      priceCents: 13_000,
      postedAt: new Date('2026-10-04T10:18:46.000Z'),
    })
    expect(results.find((result) => result.externalId === '2567915467054274')?.city).toBe('Kumrovec')
  })

  it('reports a login wall as blocked', () => {
    expect(() => parseFacebookSearchPage(fixture('login-wall.html'))).toThrow(
      expect.objectContaining({ name: 'ReaderError', code: 'blocked' }),
    )
  })

  it('fails with parse_failed on a page that is not a search page', () => {
    expect(() => parseFacebookSearchPage('<html><body>Nešto</body></html>')).toThrow(
      expect.objectContaining({ name: 'ReaderError', code: 'parse_failed' }),
    )
    expect(() => parseFacebookSearchPage(fixture('listing-page.html'))).toThrow(
      expect.objectContaining({ code: 'parse_failed' }),
    )
  })
})

describe('facebook URLs', () => {
  it('builds a Zagreb search URL', () => {
    expect(facebookSearchUrl('iPhone 13 Pro 128 GB')).toBe(
      'https://www.facebook.com/marketplace/zagreb/search/?query=iPhone+13+Pro+128+GB',
    )
  })

  it('reads the item ID from a canonical item URL', () => {
    expect(facebookItemId('https://www.facebook.com/marketplace/item/1838276653964413/')).toBe('1838276653964413')
    expect(facebookItemId('https://www.facebook.com/marketplace/zagreb/')).toBeNull()
  })
})
