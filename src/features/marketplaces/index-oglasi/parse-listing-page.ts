import { z } from 'zod'

import { findResponse, indexApi, indexPlace, readJson } from '#/features/marketplaces/index-oglasi/api-responses'
import type { CapturedResponse } from '#/features/marketplaces/index-oglasi/api-responses'
import { indexListingUrl, indexPhotoUrl, indexSellerUrl } from '#/features/marketplaces/index-oglasi/index-urls'
import { scrapedListingSchema } from '#/features/marketplaces/marketplace-reader'
import type { ListingPageResult } from '#/features/marketplaces/marketplace-reader'
import {
  cleanLine,
  cleanText,
  eurosToCents,
  isoDate,
  parseFailed,
  validated,
} from '#/features/marketplaces/parsing'

/** Index's ad statuses: 1 active, 2 paused, 3 sold, 4 deleted, 5 blocked, 6 expired. */
const activeStatus = 1

const adSchema = z.object({
  code: z.number().int(),
  status: z.number().int(),
  creatorId: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  smartLink: z.string(),
  /** Euros. */
  price: z.number().nullish(),
  priceCurrency: z.string().nullish(),
  /** "Objavljen"; renewals only move `renewalTime`. */
  postedTime: z.string().nullish(),
  images: z.array(z.string()).nullish(),
  countyName: z.string().nullish(),
  cityName: z.string().nullish(),
  settlementName: z.string().nullish(),
})

const singleAdSchema = z.object({
  data: z.array(adSchema),
  /** The Croatian path segments the page itself redirects to. */
  redirectData: z.object({ module: z.string(), category: z.string() }),
})

const userSchema = z.object({ id: z.string(), username: z.string() })

function sellerOf(responses: CapturedResponse[], creatorId: string) {
  const response = findResponse(responses, indexApi.user)
  if (!response || response.status !== 200) return null
  const user = readJson(response, userSchema, 'Index oglasi seller')
  const displayName = cleanLine(user.username, 200)
  if (user.id !== creatorId || !displayName) return null
  return { externalId: user.id, displayName, profileUrl: indexSellerUrl(user.username) }
}

/** Reads an Index oglasi listing page from the API responses it loaded. */
export function parseIndexListingPage(responses: CapturedResponse[]): ListingPageResult {
  const response = findResponse(responses, indexApi.singleAd)
  if (!response) return parseFailed('Index oglasi listing page loaded no listing')
  // A listing that's gone answers 404 with a pointer to its old category.
  if (response.status === 404) return { kind: 'removed' }
  const { data, redirectData } = readJson(response, singleAdSchema, 'Index oglasi listing')
  const ad = data[0]
  if (!ad || ad.status !== activeStatus) return { kind: 'removed' }
  if (ad.priceCurrency && ad.priceCurrency !== 'EUR') {
    return parseFailed(`Index oglasi listing is priced in ${ad.priceCurrency}, not EUR`)
  }

  const place = indexPlace(ad)
  return {
    kind: 'found',
    listing: validated(
      scrapedListingSchema,
      {
        externalId: String(ad.code),
        canonicalUrl: indexListingUrl({ ...redirectData, smartLink: ad.smartLink, code: ad.code }),
        title: cleanLine(ad.title, 300),
        description: cleanText(ad.description, 20_000),
        priceCents: eurosToCents(ad.price),
        city: cleanLine(place.city, 120),
        neighbourhood: cleanLine(place.neighbourhood, 120),
        postedAt: isoDate(ad.postedTime),
        photoUrls: (ad.images ?? [])
          .map(indexPhotoUrl)
          .filter((url) => url !== null)
          .slice(0, 40),
        seller: sellerOf(responses, ad.creatorId),
      },
      'Index oglasi listing',
    ),
  }
}
