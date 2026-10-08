// The one port every marketplace read goes through (ADR 0003). The rest of the
// app sees these shapes only, never which site or parser produced them.

import { z } from 'zod'

import type { Marketplace } from '#/lib/listing'

const text = (max: number) => z.string().trim().min(1).max(max)

/** Scraped links end up in `href`s: https only, never `javascript:` or `data:`. */
const httpsUrl = (max: number) => z.url({ protocol: /^https$/ }).max(max)

/** A listing page read into the shared shape. Validated before it leaves the parser. */
export const scrapedListingSchema = z.object({
  externalId: text(64),
  canonicalUrl: httpsUrl(2048),
  title: text(300),
  description: z.string().max(20_000),
  /** Integer euro cents; null when the listing shows no price ("Po dogovoru"). */
  priceCents: z.number().int().nonnegative().nullable(),
  city: text(120).nullable(),
  neighbourhood: text(120).nullable(),
  postedAt: z.date().nullable(),
  /** Full-size photo URLs in the listing's order. */
  photoUrls: z.array(httpsUrl(4096)).max(40),
  seller: z
    .object({
      externalId: text(128),
      displayName: text(200),
      profileUrl: httpsUrl(2048).nullable(),
    })
    .nullable(),
})
export type ScrapedListing = z.infer<typeof scrapedListingSchema>

export type ListingPageResult =
  | { kind: 'found'; listing: ScrapedListing }
  /** The marketplace says the listing is gone (404, "oglas nije aktivan"). */
  | { kind: 'removed' }

/** One result of a marketplace search page: a future comparable observation. */
export const searchResultSchema = z.object({
  externalId: text(64),
  url: httpsUrl(2048),
  title: text(300),
  priceCents: z.number().int().nonnegative(),
  city: text(120).nullable(),
  postedAt: z.date().nullable(),
})
export type SearchResult = z.infer<typeof searchResultSchema>

/**
 * A fact a marketplace publishes on a seller's profile. Only kinds a
 * marketplace actually shows are ever filled in (ADR 0008).
 */
export const sellerFactSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('active_listing_count'), count: z.number().int().nonnegative() }),
  z.object({ kind: z.literal('phone_verified') }),
  z.object({ kind: z.literal('email_verified') }),
  z.object({
    kind: z.literal('marketplace_rating'),
    /** The marketplace's own average, on its own scale. */
    average: z.number().nonnegative(),
    scale: z.number().positive(),
    count: z.number().int().nonnegative(),
  }),
  /**
   * Whether the marketplace labels the account a business (trgovac, pravna
   * osoba) or a private person. EU consumer rights only apply to businesses.
   */
  z.object({ kind: z.literal('seller_type'), type: z.enum(['private', 'business']) }),
])
export type SellerFact = z.infer<typeof sellerFactSchema>

export const sellerProfileSchema = z.object({
  externalId: text(128),
  displayName: text(200),
  profileUrl: httpsUrl(2048).nullable(),
  memberSince: z.date().nullable(),
  city: text(120).nullable(),
  facts: z.array(sellerFactSchema).max(20),
})
export type SellerProfile = z.infer<typeof sellerProfileSchema>

/** Why a read failed. Shown as the check step's error code, never swallowed. */
export type ReaderErrorCode =
  /** The page loaded but didn't have the shape the parser expects. */
  | 'parse_failed'
  /** Bot protection or a login wall we couldn't get past. */
  | 'blocked'
  | 'timeout'
  /** The browser session or network failed. */
  | 'session_failed'

export class ReaderError extends Error {
  readonly code: ReaderErrorCode

  constructor(code: ReaderErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ReaderError'
    this.code = code
  }
}

/**
 * Reads marketplace pages through logged-out browser sessions. Every method
 * throws `ReaderError` on failure; an empty search is `[]`, not an error.
 */
export type MarketplaceReader = {
  readListing: (marketplace: Marketplace, canonicalUrl: string) => Promise<ListingPageResult>
  search: (marketplace: Marketplace, query: string) => Promise<SearchResult[]>
  readSeller: (marketplace: Marketplace, seller: { externalId: string; profileUrl: string | null }) => Promise<SellerProfile | null>
}
