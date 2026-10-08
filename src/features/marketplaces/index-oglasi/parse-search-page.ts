import { z } from 'zod'

import { findResponse, indexApi, indexPlace, readJson } from '#/features/marketplaces/index-oglasi/api-responses'
import type { CapturedResponse } from '#/features/marketplaces/index-oglasi/api-responses'
import { indexListingUrl } from '#/features/marketplaces/index-oglasi/index-urls'
import { searchResultSchema } from '#/features/marketplaces/marketplace-reader'
import type { SearchResult } from '#/features/marketplaces/marketplace-reader'
import { cleanLine, eurosToCents, isoDate, parseFailed, validated } from '#/features/marketplaces/parsing'

const resultSchema = z.object({
  code: z.number().int(),
  title: z.string(),
  smartLink: z.string(),
  /** English module and category names ("mobile-phones", "iphone"). */
  module: z.string(),
  category: z.string(),
  /** Euros; `priceTo` is set for "od … do …" ranges, which aren't one price. */
  price: z.number().nullish(),
  priceTo: z.number().nullish(),
  /** Unlike the listing page, search results report the last renewal here. */
  postedTime: z.string().nullish(),
  countyName: z.string().nullish(),
  cityName: z.string().nullish(),
  settlementName: z.string().nullish(),
})

const searchSchema = z.object({ data: z.array(resultSchema) })

const categoriesSchema = z.array(
  z.object({ name: z.string(), nameHr: z.string(), module: z.string(), moduleHr: z.string() }),
)

/** Reads an Index oglasi search page (`/oglasi/pretraga?searchQuery=…`) from the API responses it loaded. */
export function parseIndexSearchPage(responses: CapturedResponse[]): SearchResult[] {
  const searchResponse = findResponse(responses, indexApi.adSearch)
  const categoriesResponse = findResponse(responses, indexApi.categories)
  if (!searchResponse || !categoriesResponse) return parseFailed('Index oglasi search page loaded no results')
  const { data } = readJson(searchResponse, searchSchema, 'Index oglasi search results')
  const categories = new Map(
    readJson(categoriesResponse, categoriesSchema, 'Index oglasi categories').map((category) => [
      `${category.module}/${category.name}`,
      category,
    ]),
  )

  const results: SearchResult[] = []
  for (const result of data) {
    const priceCents = result.priceTo == null ? eurosToCents(result.price) : null
    if (priceCents === null) continue
    const category = categories.get(`${result.module}/${result.category}`)
    if (!category) return parseFailed(`Index oglasi category ${result.module}/${result.category} is unknown`)
    results.push(
      validated(
        searchResultSchema,
        {
          externalId: String(result.code),
          url: indexListingUrl({
            module: category.moduleHr,
            category: category.nameHr,
            smartLink: result.smartLink,
            code: result.code,
          }),
          title: cleanLine(result.title, 300),
          priceCents,
          city: cleanLine(indexPlace(result).city, 120),
          postedAt: isoDate(result.postedTime),
        },
        'Index oglasi search result',
      ),
    )
  }
  return results
}
