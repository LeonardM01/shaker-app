// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { njuskaloSearchUrl } from '#/features/marketplaces/njuskalo/njuskalo-urls'
import { parseNjuskaloSearchPage } from '#/features/marketplaces/njuskalo/parse-search-page'

// Search for "iPhone 13 Pro 128 GB", saved 2026-10-08.
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

describe('parseNjuskaloSearchPage', () => {
  const results = parseNjuskaloSearchPage(fixture('search-page.html'))

  it('reads promoted and regular results once each, without the sidebar', () => {
    // 5 promoted + 25 regular, one listing is in both; "Posljednji oglasi" is ignored.
    expect(results).toHaveLength(29)
    expect(new Set(results.map((result) => result.externalId)).size).toBe(29)
    expect(results.map((result) => result.externalId)).not.toContain('51776888')
  })

  it('reads the fields of a result', () => {
    expect(results.find((result) => result.externalId === '51499769')).toEqual({
      externalId: '51499769',
      url: 'https://www.njuskalo.hr/iphone-13-pro/iphone-13-pro-128-gb-odlicno-ocuvan-sve-originalno-oglas-51499769',
      title: 'iPhone 13 Pro 128 GB – odlično očuvan – sve originalno',
      priceCents: 28_000,
      city: 'Zabok',
      postedAt: new Date('2026-09-10T12:07:31.000Z'),
    })
  })

  it('reads decimal prices and maps Zagreb districts to Zagreb', () => {
    const remade = results.find((result) => result.externalId === '51195369')
    expect(remade?.priceCents).toBe(60_043)
    expect(remade?.city).toBe('Čakovec')

    // "Voltino - Trešnjevka - Sjever"
    expect(results.find((result) => result.externalId === '51724574')?.city).toBe('Zagreb')
  })

  it('fails with parse_failed on a page that is not a search page', () => {
    expect(() => parseNjuskaloSearchPage('<html><body>Nema ničega</body></html>')).toThrow(
      expect.objectContaining({ name: 'ReaderError', code: 'parse_failed' }),
    )
  })
})

describe('njuskaloSearchUrl', () => {
  it('puts the query in the keywords parameter', () => {
    expect(njuskaloSearchUrl(' iPhone 13 Pro 128 GB ')).toBe(
      'https://www.njuskalo.hr/search/?keywords=iPhone+13+Pro+128+GB',
    )
  })
})
