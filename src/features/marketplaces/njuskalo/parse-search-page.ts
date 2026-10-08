import { parse } from 'node-html-parser'
import { z } from 'zod'

import { searchResultSchema } from '#/features/marketplaces/marketplace-reader'
import type { SearchResult } from '#/features/marketplaces/marketplace-reader'
import { readInitialState } from '#/features/marketplaces/njuskalo/initial-state'
import { searchResultPlace } from '#/features/marketplaces/njuskalo/location'
import { njuskaloListingUrl } from '#/features/marketplaces/njuskalo/njuskalo-urls'
import { cleanLine, euroTextToCents, isoDate, validated } from '#/features/marketplaces/parsing'

const resultSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  createdAt: z.string().nullish(),
  /** Only a formatted string ("600,43 €") is published per result. */
  priceFormatted: z.string().nullish(),
  /** Set for "od … do …" price ranges, which aren't one price. */
  priceMinFormatted: z.string().nullish(),
  isPriceOnRequest: z.boolean().nullish(),
  hidePrice: z.boolean().nullish(),
  location: z.string().nullish(),
  categorySlug: z.string(),
  titleSlug: z.string(),
})

const stateSchema = z.object({
  searchPage: z.object({
    pageData: z.object({
      // Paid "Istaknuto" placements are real listings matching the query, so they count too.
      promotedListings: z.array(resultSchema).nullish(),
      regularListings: z.array(resultSchema),
    }),
  }),
})

type Result = z.infer<typeof resultSchema>

function toSearchResult(result: Result): SearchResult | null {
  if (result.isPriceOnRequest || result.hidePrice || result.priceMinFormatted) return null
  const priceCents = euroTextToCents(result.priceFormatted)
  if (priceCents === null) return null
  return validated(
    searchResultSchema,
    {
      externalId: String(result.id),
      url: njuskaloListingUrl(result.categorySlug, result.titleSlug, result.id),
      title: cleanLine(result.title, 300),
      priceCents,
      city: searchResultPlace(result.location).city,
      postedAt: isoDate(result.createdAt),
    },
    'Njuškalo search result',
  )
}

/**
 * Reads a Njuškalo search results page (`/search/?keywords=…`). Results
 * without a single numeric price are skipped; the "Posljednji oglasi"
 * sidebar is not part of the results.
 */
export function parseNjuskaloSearchPage(html: string): SearchResult[] {
  const { pageData } = validated(stateSchema, readInitialState(parse(html)), 'Njuškalo search state').searchPage
  const seen = new Set<string>()
  const results: SearchResult[] = []
  for (const raw of [...(pageData.promotedListings ?? []), ...pageData.regularListings]) {
    const result = toSearchResult(raw)
    if (!result || seen.has(result.externalId)) continue
    seen.add(result.externalId)
    results.push(result)
  }
  return results
}
