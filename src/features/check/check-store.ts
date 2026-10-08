// Persistence for the check pipeline. Postgres in production
// (prisma-check-store.server.ts), in memory in tests.

import type { ListingFacts, Category } from '#/features/check/listing-facts'
import type { CheckOutcome, WrittenText } from '#/features/check/check-outcome'
import type { ReviewStats } from '#/features/check/scoring/offer-score'
import type { PriceStats } from '#/features/check/scoring/price'
import type { ScrapedListing, SearchResult, SellerProfile } from '#/features/marketplaces/marketplace-reader'
import type { Marketplace } from '#/lib/listing'

/** The stages of a check, each with its own status row. */
export const stepNames = [
  'read',
  'photos',
  'extract',
  'comparables_njuskalo',
  'comparables_facebook_marketplace',
  'comparables_index_oglasi',
  'seller',
  'scam',
  'score',
  'write',
] as const
export type StepName = (typeof stepNames)[number]

export const comparablesStep = (marketplace: Marketplace) =>
  `comparables_${marketplace}` as const satisfies StepName

export type StepSummary = { comparableCount?: number; photoCount?: number }

export type StepUpdate =
  | { status: 'running'; at: Date }
  | { status: 'done'; at: Date; summary?: StepSummary }
  | { status: 'failed'; at: Date; errorCode: string }
  /** Not run because a step it needs failed. Neutral, not a failure of its own. */
  | { status: 'skipped'; at: Date }

export type CheckStatus = 'running' | 'completed' | 'failed' | 'removed'

/** A photo copied into the private bucket (ADR 0007). */
export type StoredPhoto = { position: number; objectKey: string; phash: string }

/** A comparable as the finder returns it: a checked listing or an observation. */
export type ComparableRow = {
  listingId: string
  marketplace: Marketplace
  title: string
  priceCents: number
  city: string | null
  url: string
  seenAt: Date
}

export type ComparableQuery = {
  marketplace: Marketplace
  category: Category
  /** Every token must be in the normalized title. */
  tokens: readonly string[]
  /** None of these may be. */
  exclusions: readonly string[]
  seenSince: Date
  /** The checked listing itself never compares with itself. */
  excludeListingId: string
}

export type ComparableSnapshot = {
  byMarketplace: Record<Marketplace, { comparables: ComparableRow[]; stats: PriceStats | null }>
  widened: boolean
}

export type CheckStore = {
  /**
   * The newest check of this URL to reuse: a completed one started at or
   * after `since.completed`, or a running one started at or after
   * `since.running`. An older running check is presumed stuck.
   */
  findReusableCheck: (canonicalUrl: string, since: { completed: Date; running: Date }) => Promise<string | null>
  createCheck: (input: {
    canonicalUrl: string
    marketplace: Marketplace
    startedAt: Date
  }) => Promise<string>
  setStep: (checkId: string, step: StepName, update: StepUpdate) => Promise<void>

  /**
   * Upserts the checked listing and its seller account (as far as the listing
   * page shows it), links the check to it and returns the listing ID.
   */
  saveListing: (checkId: string, marketplace: Marketplace, listing: ScrapedListing, seenAt: Date) => Promise<{ listingId: string; sellerId: string | null }>
  /** The listing is gone: marks it removed (if we knew it) and ends the check. */
  markRemoved: (checkId: string, at: Date) => Promise<void>
  /** Replaces the listing's photos; returns the object keys no photo uses any more. */
  savePhotos: (listingId: string, photos: StoredPhoto[]) => Promise<string[]>
  /** Other listings, of other sellers, that have a photo matching one of `phashes`. */
  countDuplicatePhotoListings: (input: { listingId: string; sellerId: string | null; phashes: string[] }) => Promise<number>
  saveFacts: (checkId: string, listingId: string, facts: ListingFacts) => Promise<void>

  findComparables: (query: ComparableQuery) => Promise<ComparableRow[]>
  /** Saves search results as comparable observations (no photos, no extraction). */
  saveObservations: (input: {
    marketplace: Marketplace
    category: Category
    results: SearchResult[]
    seenAt: Date
  }) => Promise<void>

  saveSellerProfile: (sellerId: string, profile: SellerProfile, scrapedAt: Date) => Promise<void>
  /** Real reviews of the seller; demo reviews never count. */
  reviewStats: (sellerId: string) => Promise<ReviewStats>
  /** Mean stars over every real review, the Bayesian prior. */
  platformAverageStars: () => Promise<number>

  saveOutcome: (checkId: string, outcome: CheckOutcome, comparables: ComparableSnapshot) => Promise<void>
  saveText: (checkId: string, text: WrittenText) => Promise<void>
  finishCheck: (checkId: string, status: Exclude<CheckStatus, 'running' | 'removed'>, at: Date) => Promise<void>
}
