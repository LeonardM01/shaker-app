// Read and write access for the report. Postgres in production
// (prisma-report-store.server.ts), in memory in tests.

import type { CheckOutcome, WrittenText } from '#/features/check/check-outcome'
import type { StepName, StepSummary } from '#/features/check/check-store'
import type { ListingFacts } from '#/features/check/listing-facts'
import type { PriceStats } from '#/features/check/scoring/price'
import type { SellerFact } from '#/features/marketplaces/marketplace-reader'
import type { Marketplace } from '#/lib/listing'
import type { StepStatus } from '#/features/report/report-result'

export type ReportListing = {
  id: string
  marketplace: Marketplace
  title: string
  canonicalUrl: string
  city: string | null
  neighbourhood: string | null
  postedAt: Date | null
  status: 'active' | 'removed'
  isDemo: boolean
  sellerId: string | null
  photoKeys: string[]
}

export type ReportCheck = {
  id: string
  checkedAt: Date
  priceCents: number | null
  outcome: CheckOutcome
  statsByMarketplace: Record<Marketplace, PriceStats | null>
  facts: ListingFacts | null
  text: WrittenText | null
}

export type StoredComparable = {
  listingId: string
  title: string
  marketplace: Marketplace
  city: string | null
  seenAt: Date
  priceCents: number
  url: string
}

export type ReportSeller = {
  id: string
  marketplace: Marketplace
  displayName: string
  profileUrl: string | null
  memberSince: Date | null
  city: string | null
  facts: SellerFact[]
  /** `neon_auth.user.id` of the claiming user, if any. */
  claimedBy: string | null
}

export type StoredReviewView = {
  id: string
  userId: string
  reviewerName: string
  createdAt: Date
  stars: number
  text: string
  verifiedPurchase: boolean
  isDemo: boolean
  listingTitle: string
  helpfulUserIds: string[]
  reply: { text: string; createdAt: Date } | null
}

/** Where a page of reviews ended: the last review's time and ID. */
export type ReviewCursor = { createdAt: Date; id: string }

export type ProgressSnapshot = {
  checkId: string
  canonicalUrl: string
  marketplace: Marketplace
  status: 'running' | 'completed' | 'failed' | 'removed'
  listing: {
    id: string
    title: string
    marketplace: Marketplace
    city: string | null
    photoKey: string | null
    photoCount: number
    priceCents: number | null
  } | null
  steps: Record<
    StepName,
    { status: StepStatus; errorCode: string | null; finishedAt: Date | null; summary: StepSummary | null }
  >
}

export type ReportStore = {
  getProgress: (checkId: string) => Promise<ProgressSnapshot | null>
  getListing: (listingId: string) => Promise<ReportListing | null>
  /** The newest completed check of the listing. */
  getLatestCheck: (listingId: string) => Promise<ReportCheck | null>
  /** The check's comparables, closest in price to `priceCents` first. */
  listComparables: (checkId: string, priceCents: number | null, limit: number) => Promise<StoredComparable[]>
  getSeller: (sellerId: string) => Promise<ReportSeller | null>
  /** Other sellers claimed by the same user. */
  listSellersClaimedBy: (userId: string) => Promise<{ id: string; marketplace: Marketplace }[]>
  /**
   * Real reviews only, unless `includeDemo` (labelled demo listings). Newest
   * first, by `createdAt` to the millisecond and then `id`; `before` continues
   * after that review.
   */
  listReviews: (
    sellerId: string,
    options: { includeDemo: boolean; limit: number; before?: ReviewCursor },
  ) => Promise<StoredReviewView[]>
  /** Real reviews of the seller; demo reviews never count. */
  reviewStats: (sellerId: string) => Promise<{ count: number; averageStars: number }>
  hasReviewed: (userId: string, sellerId: string) => Promise<boolean>
  isTracked: (userId: string, listingId: string) => Promise<boolean>
  listTicks: (userId: string, listingId: string) => Promise<string[]>

  track: (userId: string, listingId: string) => Promise<void>
  untrack: (userId: string, listingId: string) => Promise<void>
  /** Creates the claim unless the seller has one. Returns the claiming user. */
  claimSeller: (userId: string, sellerId: string) => Promise<{ claimedBy: string }>
  /**
   * Null when this user already reviewed this seller. Extension reviews all
   * belong to the anonymous user and carry an install ID, so the rule is one
   * per seller per install for them (ADR 0014).
   */
  createReview: (review: {
    userId: string
    sellerId: string
    listingId: string
    stars: number
    text: string
    installId?: string
  }) => Promise<{ id: string } | null>
  getReview: (reviewId: string) => Promise<{ id: string; sellerId: string; userId: string; hasReply: boolean } | null>
  /** False when the review already has a reply. */
  createReply: (reply: { reviewId: string; userId: string; text: string }) => Promise<boolean>
  markHelpful: (reviewId: string, userId: string) => Promise<void>
  reportReview: (report: { reviewId: string; userId: string; reason: string }) => Promise<void>
  setTick: (tick: { userId: string; listingId: string; itemKey: string; ticked: boolean }) => Promise<void>
}
