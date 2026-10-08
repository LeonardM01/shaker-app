// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { ReaderError } from '#/features/marketplaces/marketplace-reader'
import { parseNjuskaloListingPage } from '#/features/marketplaces/njuskalo/parse-listing-page'

// Real pages saved 2026-10-08, seller data redacted (see docs/research/marketplace-pages.md).
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

describe('parseNjuskaloListingPage', () => {
  it('reads an active listing', () => {
    const result = parseNjuskaloListingPage(fixture('listing-page.html'))
    if (result.kind !== 'found') throw new Error(`expected found, got ${result.kind}`)
    const { listing } = result

    expect(listing.externalId).toBe('51499769')
    expect(listing.canonicalUrl).toBe(
      'https://www.njuskalo.hr/iphone-13-pro/iphone-13-pro-128-gb-odlicno-ocuvan-sve-originalno-oglas-51499769',
    )
    expect(listing.title).toBe('iPhone 13 Pro 128 GB – odlično očuvan – sve originalno')
    expect(listing.priceCents).toBe(28_000)
    expect(listing.city).toBe('Zabok')
    expect(listing.neighbourhood).toBeNull()
    expect(listing.postedAt).toEqual(new Date('2026-09-10T12:07:31.000Z'))
    expect(listing.photoUrls).toHaveLength(5)
    expect(listing.photoUrls[0]).toBe(
      'https://www.njuskalo.hr/image-xlsize/iphone-13-pro/iphone-13-pro-128-gb-odlicno-ocuvan-sve-originalno-slika-285158951.jpg',
    )
    expect(listing.seller).toEqual({
      externalId: '209828',
      displayName: 'prodavac-test',
      profileUrl: 'https://www.njuskalo.hr/korisnik/prodavac-test',
    })
  })

  it('turns the description HTML into plain text', () => {
    const result = parseNjuskaloListingPage(fixture('listing-page.html'))
    if (result.kind !== 'found') throw new Error(`expected found, got ${result.kind}`)

    expect(result.listing.description).toMatch(/^Prodajem Apple iPhone 13 Pro 128 GB Graphite\.\nMobitel je/)
    expect(result.listing.description).toContain('Cijena: 280 €')
    expect(result.listing.description).not.toMatch(/<br|&nbsp;/)
  })

  it('reports an inactive listing as removed', () => {
    expect(parseNjuskaloListingPage(fixture('listing-page-inactive.html'))).toEqual({ kind: 'removed' })
  })

  it('reports an unknown listing ID (404 page) as removed', () => {
    expect(parseNjuskaloListingPage(fixture('listing-page-not-found.html'))).toEqual({ kind: 'removed' })
  })

  it('fails with parse_failed on a page that is not a Njuškalo listing', () => {
    expect(() => parseNjuskaloListingPage('<html><body><h1>Hello</h1></body></html>')).toThrow(
      expect.objectContaining({ name: 'ReaderError', code: 'parse_failed' }),
    )
    expect(() => parseNjuskaloListingPage(fixture('search-page.html'))).toThrow(ReaderError)
  })
})
