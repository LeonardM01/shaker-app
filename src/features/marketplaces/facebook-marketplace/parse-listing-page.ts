import { z } from 'zod'

import { forEachObject, readFacebookPage } from '#/features/marketplaces/facebook-marketplace/embedded-json'
import { facebookItemId, facebookItemUrl } from '#/features/marketplaces/facebook-marketplace/facebook-urls'
import { ReaderError, scrapedListingSchema } from '#/features/marketplaces/marketplace-reader'
import type { ListingPageResult } from '#/features/marketplaces/marketplace-reader'
import {
  cleanLine,
  cleanText,
  eurosToCents,
  parseFailed,
  unixDate,
  validated,
} from '#/features/marketplaces/parsing'

// Facebook spreads one item over several Relay records with the same ID;
// these are the fields we read once they're merged.
const itemSchema = z.object({
  marketplace_listing_title: z.string(),
  redacted_description: z.object({ text: z.string() }).nullish(),
  listing_price: z.object({ amount: z.string(), currency: z.string().nullish() }).nullish(),
  /** "Zagreb, Grad Zagreb" */
  location_text: z.object({ text: z.string() }).nullish(),
  /** Unix seconds. */
  creation_time: z.number().nullish(),
  listing_photos: z.array(z.object({ image: z.object({ uri: z.string() }) })).nullish(),
  is_live: z.boolean().nullish(),
  is_sold: z.boolean().nullish(),
})

function mergedItem(data: unknown[], itemId: string): Record<string, unknown> | null {
  const merged: Record<string, unknown> = {}
  let found = false
  forEachObject(data, (object) => {
    if (object['__typename'] !== 'GroupCommerceProductItem' || object['id'] !== itemId) return
    found = true
    for (const [key, value] of Object.entries(object)) {
      if (value != null && merged[key] == null) merged[key] = value
    }
  })
  return found ? merged : null
}

function priceCents(price: z.infer<typeof itemSchema>['listing_price']): number | null {
  if (!price) return null
  if (price.currency && price.currency !== 'EUR') {
    return parseFailed(`Facebook listing is priced in ${price.currency}, not EUR`)
  }
  return eurosToCents(Number(price.amount))
}

/**
 * Reads a Facebook Marketplace item page (`/marketplace/item/<id>/`) as a
 * logged-out visitor sees it. Facebook doesn't show who sells an item to
 * logged-out visitors, so `seller` is always null.
 */
export function parseFacebookListingPage(html: string, canonicalUrl: string): ListingPageResult {
  const itemId = facebookItemId(canonicalUrl)
  if (!itemId) return parseFailed(`${canonicalUrl} is not a Facebook Marketplace item URL`)
  const page = readFacebookPage(html)
  const merged = mergedItem(page.data, itemId)
  if (!merged || typeof merged['marketplace_listing_title'] !== 'string') {
    if (page.isUnavailable) return { kind: 'removed' }
    if (page.isLoginWall) throw new ReaderError('blocked', 'Facebook showed a login wall instead of the item')
    return parseFailed('Facebook item page has no listing data')
  }

  const item = validated(itemSchema, merged, 'Facebook item')
  if (item.is_sold === true || item.is_live === false) return { kind: 'removed' }

  return {
    kind: 'found',
    listing: validated(
      scrapedListingSchema,
      {
        externalId: itemId,
        canonicalUrl: facebookItemUrl(itemId),
        title: cleanLine(item.marketplace_listing_title, 300),
        description: cleanText(item.redacted_description?.text, 20_000),
        priceCents: priceCents(item.listing_price),
        city: cleanLine(item.location_text?.text.split(',')[0], 120),
        neighbourhood: null,
        postedAt: unixDate(item.creation_time),
        photoUrls: (item.listing_photos ?? []).map((photo) => photo.image.uri).slice(0, 40),
        seller: null,
      },
      'Facebook listing',
    ),
  }
}
