// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import type { CapturedResponse } from '#/features/marketplaces/index-oglasi/api-responses'
import { parseIndexListingPage } from '#/features/marketplaces/index-oglasi/parse-listing-page'

// API responses the real pages loaded on 2026-10-08 (see fixtures/README.md).
const responses = (name: string) =>
  (JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')) as { responses: CapturedResponse[] })
    .responses

describe('parseIndexListingPage', () => {
  it('reads an active listing', () => {
    const result = parseIndexListingPage(responses('listing-page.json'))
    if (result.kind !== 'found') throw new Error(`expected found, got ${result.kind}`)
    const { listing } = result

    expect(listing.externalId).toBe('6053031')
    expect(listing.canonicalUrl).toBe(
      'https://www.index.hr/oglasi/mobiteli/iphone/oglas/apple-iphone-13-pro-128gb-kao-novogarancijarazne-boje-moguca-zamjena-za-razno-128-gb/6053031',
    )
    expect(listing.title).toBe(
      'APPLE IPHONE 13 PRO 128GB ◆ KAO NOVO◆GARANCIJA◆RAZNE BOJE◆ ◆Moguća zamjena za razno◆ 128 GB',
    )
    expect(listing.priceCents).toBe(46_400)
    expect(listing.city).toBe('Vrgorac')
    expect(listing.neighbourhood).toBe('Veliki Prolog')
    expect(listing.postedAt).toEqual(new Date('2024-05-01T21:24:10.877Z'))
    expect(listing.description).toMatch(/^►Sve na jednom mjestu TestShop◄\n\n\*\*Prodaju se APPLE IPHONE 13 PRO/)
    // All photos, not just the five the gallery renders.
    expect(listing.photoUrls).toHaveLength(14)
    expect(listing.photoUrls[0]).toBe(
      'https://www.index.hr/oglasi/api/image/direct/961641eb-b1bd-4ba5-a5f5-b91874272961/bcf6459f-74c7-4b59-b446-6b23725e805f.jpg',
    )
    expect(listing.seller).toEqual({
      externalId: '961641eb-b1bd-4ba5-a5f5-b91874272961',
      displayName: '-TestShop-',
      profileUrl: 'https://www.index.hr/oglasi/korisnik/-TestShop-',
    })
  })

  it('reports a listing that is gone (HTTP 404 from the API) as removed', () => {
    expect(parseIndexListingPage(responses('listing-page-removed.json'))).toEqual({ kind: 'removed' })
  })

  it('reports an inactive listing as removed', () => {
    const [singleAd, ...rest] = responses('listing-page.json')
    if (!singleAd) throw new Error('fixture has no responses')
    const sold = { ...singleAd, body: singleAd.body.replace('"status":1,', '"status":3,') }

    expect(parseIndexListingPage([sold, ...rest])).toEqual({ kind: 'removed' })
  })

  it('fails with parse_failed when the listing response is missing or malformed', () => {
    expect(() => parseIndexListingPage([])).toThrow(expect.objectContaining({ name: 'ReaderError', code: 'parse_failed' }))
    expect(() =>
      parseIndexListingPage([
        { url: 'https://www.index.hr/oglasi/api/aditem/single-ad?code=1&format=1', status: 200, body: '<html></html>' },
      ]),
    ).toThrow(expect.objectContaining({ code: 'parse_failed' }))
  })
})
