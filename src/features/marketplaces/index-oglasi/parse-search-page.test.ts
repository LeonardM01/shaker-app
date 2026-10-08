// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import type { CapturedResponse } from '#/features/marketplaces/index-oglasi/api-responses'
import { indexSearchUrl } from '#/features/marketplaces/index-oglasi/index-urls'
import { parseIndexSearchPage } from '#/features/marketplaces/index-oglasi/parse-search-page'

const responses = (name: string) =>
  (JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')) as { responses: CapturedResponse[] })
    .responses

describe('parseIndexSearchPage', () => {
  it('reads the results for "iPhone 13 Pro 128 GB"', () => {
    const results = parseIndexSearchPage(responses('search-page.json'))

    expect(results.map((result) => result.externalId)).toEqual(['6053031', '6053029'])
    expect(results[0]).toEqual({
      externalId: '6053031',
      url: 'https://www.index.hr/oglasi/mobiteli/iphone/oglas/apple-iphone-13-pro-128gb-kao-novogarancijarazne-boje-moguca-zamjena-za-razno-128-gb/6053031',
      title: 'APPLE IPHONE 13 PRO 128GB ◆ KAO NOVO◆GARANCIJA◆RAZNE BOJE◆ ◆Moguća zamjena za razno◆ 128 GB',
      priceCents: 46_400,
      city: 'Vrgorac',
      // The listing page says first published 2024-05-01; search reports the last renewal.
      postedAt: new Date('2026-09-23T22:08:40.430Z'),
    })
  })

  it('builds listing URLs from the Croatian category names and maps Zagreb districts', () => {
    const results = parseIndexSearchPage(responses('search-page-broad.json'))

    expect(results).toHaveLength(10)
    expect(results.find((result) => result.externalId === '6538623')?.url).toMatch(
      /^https:\/\/www\.index\.hr\/oglasi\/mobiteli\/oprema\/oglas\/[^/]+\/6538623$/,
    )
    expect(results.find((result) => result.externalId === '7624778')?.url).toMatch(
      /^https:\/\/www\.index\.hr\/oglasi\/informatika\/laptopi\/oglas\//,
    )
    // County "Grad Zagreb", city "Trnje"
    expect(results.find((result) => result.externalId === '7492321')?.city).toBe('Zagreb')
  })

  it('fails with parse_failed when the results response is missing or malformed', () => {
    expect(() => parseIndexSearchPage([])).toThrow(expect.objectContaining({ name: 'ReaderError', code: 'parse_failed' }))
    const [categories] = responses('search-page.json')
    if (!categories) throw new Error('fixture has no responses')
    expect(() =>
      parseIndexSearchPage([
        categories,
        { url: 'https://www.index.hr/oglasi/api/aditem?text=x&sortOption=7', status: 200, body: '{"data":"nope"}' },
      ]),
    ).toThrow(expect.objectContaining({ code: 'parse_failed' }))
  })
})

describe('indexSearchUrl', () => {
  it('encodes the query the way Index search box does', () => {
    expect(indexSearchUrl('iPhone 13 Pro 128 GB')).toBe(
      'https://www.index.hr/oglasi/pretraga?searchQuery=%257B%2522text%2522%253A%2522iPhone%252013%2520Pro%2520128%2520GB%2522%252C%2522sortOption%2522%253A7%257D',
    )
  })
})
