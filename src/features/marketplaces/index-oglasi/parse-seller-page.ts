import { z } from 'zod'

import { findResponse, indexApi, indexPlace, readJson } from '#/features/marketplaces/index-oglasi/api-responses'
import type { CapturedResponse } from '#/features/marketplaces/index-oglasi/api-responses'
import { indexSellerUrl } from '#/features/marketplaces/index-oglasi/index-urls'
import { sellerProfileSchema } from '#/features/marketplaces/marketplace-reader'
import type { SellerFact, SellerProfile } from '#/features/marketplaces/marketplace-reader'
import { cleanLine, isoDate, parseFailed, validated } from '#/features/marketplaces/parsing'

const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  registrationDate: z.string().nullish(),
  /** Shown as "Verificiran broj telefona". */
  isVerified: z.boolean().nullish(),
  /** 1 private person ("Fizička osoba"), 2 legal entity ("Pravna osoba"). */
  legalEntity: z.number().int().nullish(),
  countyName: z.string().nullish(),
  cityName: z.string().nullish(),
})

/** Stars out of 5; `averageRating` is null until someone rates. */
const ratingSchema = z.object({ totalCount: z.number().int().nonnegative(), averageRating: z.number().nullish() })

const sellerAdsSchema = z.object({ count: z.number().int().nonnegative() })

const legalEntityType = { 1: 'private', 2: 'business' } as const

/**
 * Reads an Index oglasi seller page (`/oglasi/korisnik/<username>`) from the
 * API responses it loaded. Returns null when Index has no such user.
 */
export function parseIndexSellerPage(responses: CapturedResponse[]): SellerProfile | null {
  const userResponse = findResponse(responses, indexApi.user)
  if (!userResponse) return parseFailed('Index oglasi seller page loaded no user')
  if (userResponse.status === 404) return null
  const user = readJson(userResponse, userSchema, 'Index oglasi user')

  const facts: SellerFact[] = []
  const adsResponse = findResponse(responses, indexApi.sellerAds)
  if (adsResponse?.url.includes(user.id)) {
    facts.push({ kind: 'active_listing_count', count: readJson(adsResponse, sellerAdsSchema, 'Index oglasi seller listings').count })
  }
  if (user.isVerified) facts.push({ kind: 'phone_verified' })
  const ratingResponse = findResponse(responses, indexApi.userRating)
  if (ratingResponse?.url.endsWith(user.id)) {
    const rating = readJson(ratingResponse, ratingSchema, 'Index oglasi seller rating')
    if (rating.totalCount > 0 && rating.averageRating != null) {
      facts.push({ kind: 'marketplace_rating', average: rating.averageRating, scale: 5, count: rating.totalCount })
    }
  }
  const type = user.legalEntity === 1 || user.legalEntity === 2 ? legalEntityType[user.legalEntity] : null
  if (type) facts.push({ kind: 'seller_type', type })

  return validated(
    sellerProfileSchema,
    {
      externalId: user.id,
      displayName: cleanLine(user.username, 200),
      profileUrl: indexSellerUrl(user.username),
      memberSince: isoDate(user.registrationDate),
      city: cleanLine(indexPlace(user).city, 120),
      facts,
    },
    'Index oglasi seller profile',
  )
}
