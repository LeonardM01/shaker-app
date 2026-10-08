import { parse } from 'node-html-parser'
import { z } from 'zod'

import { scrapedListingSchema } from '#/features/marketplaces/marketplace-reader'
import type { ListingPageResult } from '#/features/marketplaces/marketplace-reader'
import { readInitialState } from '#/features/marketplaces/njuskalo/initial-state'
import { listingPlace } from '#/features/marketplaces/njuskalo/location'
import { njuskaloSellerUrl } from '#/features/marketplaces/njuskalo/njuskalo-urls'
import {
  cleanLine,
  cleanText,
  eurosToCents,
  htmlToText,
  isoDate,
  parseFailed,
  validated,
} from '#/features/marketplaces/parsing'

// Only the parts of Njuškalo's listing state we read. Unknown keys are ignored.
const ownerSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  userName: z.string().nullish(),
  profileName: z.string().nullish(),
  profileUrl: z.string().nullish(),
})

const listingSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  createdAt: z.string().nullish(),
  /** "ACTIVE" while it can be bought; "INACTIVE" and others once it's gone. */
  state: z.string(),
  price: z.number().nullish(),
  owner: ownerSchema.nullish(),
})

const pageDataSchema = z.object({
  canonicalUrl: z.string(),
  listing: listingSchema,
  boxes: z.object({
    detailDescriptionBox: z.object({ text: z.string().nullish() }).nullish(),
    basicDetailsBox: z
      .object({ items: z.array(z.object({ fieldName: z.string().nullish(), definition: z.unknown() })) })
      .nullish(),
  }),
  media: z.object({ photos: z.array(z.object({ type: z.string(), fullUrl: z.string() })) }).nullish(),
})

const stateSchema = z.object({
  main: z.object({ error: z.object({ code: z.number() }).nullish() }),
  listingDetailStore: z.object({ pageData: pageDataSchema.nullable() }).optional(),
})

/** Njuškalo answers 404 for unknown IDs and 410 for listings that were taken down. */
const goneStatusCodes = new Set([404, 410])

/** Reads a Njuškalo listing page (`/<category>/<slug>-oglas-<id>`). */
export function parseNjuskaloListingPage(html: string): ListingPageResult {
  const state = validated(stateSchema, readInitialState(parse(html)), 'Njuškalo listing state')
  const pageData = state.listingDetailStore?.pageData
  if (!pageData) {
    if (state.main.error && goneStatusCodes.has(state.main.error.code)) return { kind: 'removed' }
    return parseFailed('Njuškalo listing page has no listing data')
  }

  const { listing, boxes, media } = pageData
  if (listing.state !== 'ACTIVE') return { kind: 'removed' }

  const location = boxes.basicDetailsBox?.items.find((item) => item.fieldName === 'location')
  const place = listingPlace(typeof location?.definition === 'string' ? location.definition : null)
  const sellerName = cleanLine(listing.owner?.profileName ?? listing.owner?.userName, 200)
  const description = boxes.detailDescriptionBox?.text

  return {
    kind: 'found',
    listing: validated(
      scrapedListingSchema,
      {
        externalId: String(listing.id),
        canonicalUrl: pageData.canonicalUrl,
        title: cleanLine(listing.title, 300),
        description: cleanText(description ? htmlToText(description) : '', 20_000),
        priceCents: eurosToCents(listing.price),
        city: place.city,
        neighbourhood: place.neighbourhood,
        postedAt: isoDate(listing.createdAt),
        photoUrls: (media?.photos ?? [])
          .filter((photo) => photo.type === 'PHOTO')
          .map((photo) => photo.fullUrl)
          .slice(0, 40),
        seller:
          listing.owner && sellerName
            ? {
                externalId: listing.owner.id,
                displayName: sellerName,
                profileUrl: listing.owner.profileUrl ? njuskaloSellerUrl(listing.owner.profileUrl) : null,
              }
            : null,
      },
      'Njuškalo listing',
    ),
  }
}
