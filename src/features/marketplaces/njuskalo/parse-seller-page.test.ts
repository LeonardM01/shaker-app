// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { njuskaloSellerUrl } from '#/features/marketplaces/njuskalo/njuskalo-urls'
import { parseNjuskaloSellerPage } from '#/features/marketplaces/njuskalo/parse-seller-page'

// Profiles saved 2026-10-08; names, e-mails and logos redacted.
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

describe('parseNjuskaloSellerPage', () => {
  it('reads a private seller profile', () => {
    expect(parseNjuskaloSellerPage(fixture('seller-page.html'))).toEqual({
      externalId: '209828',
      displayName: 'prodavac-test',
      profileUrl: 'https://www.njuskalo.hr/korisnik/prodavac-test',
      // 11.12.2007. in Croatia (CET)
      memberSince: new Date('2007-12-10T23:00:00.000Z'),
      city: 'Bedekovčina',
      facts: [
        { kind: 'active_listing_count', count: 4 },
        { kind: 'phone_verified' },
        { kind: 'seller_type', type: 'private' },
      ],
    })
  })

  it('reads a store profile with PayProtect ratings', () => {
    const profile = parseNjuskaloSellerPage(fixture('seller-page-store.html'))

    expect(profile?.externalId).toBe('3451797')
    expect(profile?.profileUrl).toMatch(/^https:\/\/www\.njuskalo\.hr\/trgovina\//)
    // 25.04.2025. in Croatia (CEST)
    expect(profile?.memberSince).toEqual(new Date('2025-04-24T22:00:00.000Z'))
    expect(profile?.city).toBe('Zagreb')
    expect(profile?.facts).toEqual([
      { kind: 'active_listing_count', count: 253 },
      { kind: 'marketplace_rating', average: 5, scale: 5, count: 11 },
      { kind: 'seller_type', type: 'business' },
    ])
  })

  it('returns null for a profile that does not exist', () => {
    expect(parseNjuskaloSellerPage(fixture('seller-page-not-found.html'))).toBeNull()
  })

  it('fails with parse_failed on a page that is not a profile', () => {
    expect(() => parseNjuskaloSellerPage('<html><body><p>Nešto drugo</p></body></html>')).toThrow(
      expect.objectContaining({ name: 'ReaderError', code: 'parse_failed' }),
    )
  })
})

describe('njuskaloSellerUrl', () => {
  it('makes profile paths absolute and rejects anything else', () => {
    expect(njuskaloSellerUrl('/korisnik/prodavac-test')).toBe('https://www.njuskalo.hr/korisnik/prodavac-test')
    expect(njuskaloSellerUrl('https://njuskalo.hr/trgovina/Primjer/')).toBe('https://www.njuskalo.hr/trgovina/Primjer')
    expect(njuskaloSellerUrl('https://example.com/korisnik/x')).toBeNull()
    expect(njuskaloSellerUrl('/iphone-13-pro/x-oglas-1')).toBeNull()
  })
})
