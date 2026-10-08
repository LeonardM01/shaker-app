// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { parseFacebookListingPage } from '#/features/marketplaces/facebook-marketplace/parse-listing-page'

// Logged-out pages saved through Steel on 2026-10-08.
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const itemUrl = 'https://www.facebook.com/marketplace/item/1838276653964413/'

describe('parseFacebookListingPage', () => {
  it('reads an item page as a logged-out visitor sees it', () => {
    const result = parseFacebookListingPage(fixture('listing-page.html'), itemUrl)
    if (result.kind !== 'found') throw new Error(`expected found, got ${result.kind}`)
    const { listing } = result

    expect(listing.externalId).toBe('1838276653964413')
    expect(listing.canonicalUrl).toBe(itemUrl)
    expect(listing.title).toBe('iPhone 13 pro Alpine green')
    expect(listing.priceCents).toBe(26_900)
    expect(listing.city).toBe('Zagreb')
    expect(listing.neighbourhood).toBeNull()
    expect(listing.postedAt).toEqual(new Date('2026-09-30T10:33:25.000Z'))
    expect(listing.description).toMatch(/^Prodajem potpuno uščuvani iPhone 13 pro 128g\./)
    expect(listing.description.split('\n')).toHaveLength(4)
    expect(listing.photoUrls).toHaveLength(6)
    expect(listing.photoUrls.every((url) => url.startsWith('https://scontent.'))).toBe(true)
    // Facebook doesn't name the seller to logged-out visitors.
    expect(listing.seller).toBeNull()
  })

  it('reports an item Facebook says is unavailable as removed', () => {
    expect(
      parseFacebookListingPage(
        fixture('listing-page-unavailable.html'),
        'https://www.facebook.com/marketplace/item/1000000000000001/',
      ),
    ).toEqual({ kind: 'removed' })
  })

  it('reports a login wall as blocked', () => {
    expect(() => parseFacebookListingPage(fixture('login-wall.html'), itemUrl)).toThrow(
      expect.objectContaining({ name: 'ReaderError', code: 'blocked' }),
    )
  })

  it('fails with parse_failed on a page that is not an item page', () => {
    expect(() => parseFacebookListingPage('<html><body>Nešto</body></html>', itemUrl)).toThrow(
      expect.objectContaining({ name: 'ReaderError', code: 'parse_failed' }),
    )
    // The search page is a Marketplace route, but not this item's.
    expect(() =>
      parseFacebookListingPage(fixture('search-page.html'), 'https://www.facebook.com/marketplace/item/1/'),
    ).toThrow(expect.objectContaining({ code: 'parse_failed' }))
  })
})
