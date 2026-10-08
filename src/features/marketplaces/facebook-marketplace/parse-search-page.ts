import { z } from 'zod'

import { forEachObject, readFacebookPage } from '#/features/marketplaces/facebook-marketplace/embedded-json'
import { facebookItemUrl } from '#/features/marketplaces/facebook-marketplace/facebook-urls'
import { ReaderError, searchResultSchema } from '#/features/marketplaces/marketplace-reader'
import type { SearchResult } from '#/features/marketplaces/marketplace-reader'
import { cleanLine, eurosToCents, parseFailed, unixDate, validated } from '#/features/marketplaces/parsing'

const listingSchema = z.object({
  __typename: z.literal('GroupCommerceProductItem'),
  id: z.string(),
  marketplace_listing_title: z.string(),
  /** Search results carry no currency code, only the formatted amount ("€269"). */
  listing_price: z.object({ amount: z.string(), formatted_amount: z.string() }).nullish(),
  location: z.object({ reverse_geocode: z.object({ city: z.string().nullish() }).nullish() }).nullish(),
  creation_time: z.number().nullish(),
  is_live: z.boolean().nullish(),
  is_sold: z.boolean().nullish(),
  is_hidden: z.boolean().nullish(),
})

// Each result is a feed story wrapping a listing. Other story types (ads,
// shelves) don't have this shape and are skipped.
const edgeSchema = z.object({
  node: z.object({ __typename: z.literal('MarketplaceFeedListingStoryObject'), listing: listingSchema }),
})

const feedSchema = z.object({ feed_units: z.object({ edges: z.array(z.unknown()) }) })

function toSearchResult(listing: z.infer<typeof listingSchema>): SearchResult | null {
  if (listing.is_hidden || listing.is_sold || listing.is_live === false || !listing.listing_price) return null
  if (!listing.listing_price.formatted_amount.includes('€')) return null
  const priceCents = eurosToCents(Number(listing.listing_price.amount))
  if (priceCents === null) return null
  return validated(
    searchResultSchema,
    {
      externalId: listing.id,
      url: facebookItemUrl(listing.id),
      title: cleanLine(listing.marketplace_listing_title, 300),
      priceCents,
      city: cleanLine(listing.location?.reverse_geocode?.city, 120),
      postedAt: unixDate(listing.creation_time),
    },
    'Facebook search result',
  )
}

/** Reads a logged-out Facebook Marketplace search page (`/marketplace/<city>/search/?query=…`). */
export function parseFacebookSearchPage(html: string): SearchResult[] {
  const page = readFacebookPage(html)
  const edges: unknown[] = []
  let hasFeed = false
  forEachObject(page.data, (object) => {
    const feed = feedSchema.safeParse(object['marketplace_search'])
    if (!feed.success) return
    hasFeed = true
    edges.push(...feed.data.feed_units.edges)
  })
  if (!hasFeed) {
    if (page.isLoginWall) throw new ReaderError('blocked', 'Facebook showed a login wall instead of search results')
    return parseFailed('Facebook search page has no results feed')
  }

  const seen = new Set<string>()
  const results: SearchResult[] = []
  for (const edge of edges) {
    const parsed = edgeSchema.safeParse(edge)
    if (!parsed.success) continue
    const result = toSearchResult(parsed.data.node.listing)
    if (!result || seen.has(result.externalId)) continue
    seen.add(result.externalId)
    results.push(result)
  }
  return results
}
