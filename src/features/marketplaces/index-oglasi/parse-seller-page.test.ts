// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import type { CapturedResponse } from '#/features/marketplaces/index-oglasi/api-responses'
import { parseIndexSellerPage } from '#/features/marketplaces/index-oglasi/parse-seller-page'

const responses = (name: string) =>
  (JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')) as { responses: CapturedResponse[] })
    .responses

const sellerId = '961641eb-b1bd-4ba5-a5f5-b91874272961'

describe('parseIndexSellerPage', () => {
  it('reads a seller profile', () => {
    expect(parseIndexSellerPage(responses('seller-page.json'))).toEqual({
      externalId: sellerId,
      displayName: '-TestShop-',
      profileUrl: 'https://www.index.hr/oglasi/korisnik/-TestShop-',
      memberSince: new Date('2022-02-01T22:21:00.160Z'),
      city: 'Vrgorac',
      // No ratings yet, so no rating fact.
      facts: [
        { kind: 'active_listing_count', count: 306 },
        { kind: 'phone_verified' },
        { kind: 'seller_type', type: 'business' },
      ],
    })
  })

  it('reads a rating once there is one', () => {
    const rated = responses('seller-page.json').map((response) =>
      response.url.includes('/user-rating/overall-count/')
        ? { ...response, body: '{"totalCount":7,"averageRating":4.6}' }
        : response,
    )

    expect(parseIndexSellerPage(rated)?.facts).toContainEqual({
      kind: 'marketplace_rating',
      average: 4.6,
      scale: 5,
      count: 7,
    })
  })

  it('returns null when Index has no such user', () => {
    expect(
      parseIndexSellerPage([{ url: 'https://www.index.hr/oglasi/api/user/nepostojeci', status: 404, body: '' }]),
    ).toBeNull()
  })

  it('fails with parse_failed when the user response is missing or malformed', () => {
    expect(() => parseIndexSellerPage([])).toThrow(expect.objectContaining({ name: 'ReaderError', code: 'parse_failed' }))
    expect(() =>
      parseIndexSellerPage([{ url: 'https://www.index.hr/oglasi/api/user/x', status: 200, body: '{"name":1}' }]),
    ).toThrow(expect.objectContaining({ code: 'parse_failed' }))
  })
})
