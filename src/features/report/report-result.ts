// What the report and progress queries return to the client. Plain
// serialisable data: dates are ISO strings, money is integer cents. A guest's
// result never carries a locked value, not even in another field.

import type { ListingQuality } from '#/features/check/scoring/listing-quality'
import type { OfferScore } from '#/features/check/scoring/offer-score'
import type { PriceStats } from '#/features/check/scoring/price'
import type { PatternResult } from '#/features/check/scoring/scam'
import type { SellerFact } from '#/features/marketplaces/marketplace-reader'
import type { Marketplace, Verdict } from '#/lib/listing'

export type ListingCard = {
  listingId: string
  title: string
  marketplace: Marketplace
  city: string | null
  photoUrl: string | null
  photoCount: number
  priceCents: number | null
}

export type StepStatus = 'queued' | 'running' | 'done' | 'failed' | 'skipped'

/** One row of "Provjera u tijeku". */
export type ProgressRow =
  | { key: 'read' | 'scam' | 'seller' | 'questions'; status: StepStatus; errorCode: string | null; finishedAt: string | null }
  | {
      key: 'comparables'
      marketplace: Marketplace
      status: StepStatus
      errorCode: string | null
      finishedAt: string | null
      comparableCount: number | null
    }

export type CheckProgress = {
  checkId: string
  canonicalUrl: string
  marketplace: Marketplace
  status: 'running' | 'completed' | 'failed' | 'removed'
  /** Shown as soon as the listing is read. */
  listing: ListingCard | null
  rows: ProgressRow[]
}

export type ComparableItem = {
  listingId: string
  title: string
  marketplace: Marketplace
  city: string | null
  seenAt: string
  priceCents: number
  url: string
}

export type ReviewItem = {
  id: string
  reviewerName: string
  createdAt: string
  marketplace: Marketplace
  stars: number
  listingTitle: string
  text: string
  /** Only ever true on labelled demo reviews until purchases can be proven. */
  verifiedPurchase: boolean
  isDemo: boolean
  helpfulCount: number
  markedHelpfulByViewer: boolean
  reply: { text: string; createdAt: string } | null
  /** The viewer claimed this seller and hasn't replied yet. */
  viewerCanReply: boolean
}

export type SellerSection = {
  sellerId: string
  displayName: string
  initials: string
  marketplace: Marketplace
  profileUrl: string | null
  memberSince: string | null
  city: string | null
  facts: SellerFact[]
  reviewCount: number
  /** Null below one review. */
  averageStars: number | null
  /** Other marketplaces where the same claiming user owns an account. */
  sameOwnerOn: Marketplace[]
  claimedByViewer: boolean
  /** Unclaimed, so the viewer may claim it. */
  claimable: boolean
}

export type OfferSection =
  /** Fewer than 5 comparables: Vrijedi.Ly doesn't make up a number. */
  | { kind: 'none' }
  /** Guest: the saving, rounded, and nothing else. */
  | { kind: 'locked'; approxSavingCents: number }
  | { kind: 'unlocked'; offerCents: number; savingCents: number; savingPercent: number; message: string | null }

export type PriceSection = {
  /** Null with fewer than 5 comparables: the Insufficient state. */
  market: PriceStats | null
  comparableCount: number
  priceDiffPercent: number | null
  widened: boolean
  byMarketplace: { marketplace: Marketplace; count: number; medianCents: number | null }[]
  /** Every comparable price, for the dots on the range bar. */
  dots: number[]
  /** Guests get the first one only. */
  comparables: ComparableItem[]
}

export type Report = {
  /** Server clock, so relative times render the same on server and client. */
  now: string
  viewer: { signedIn: boolean }
  listing: {
    id: string
    title: string
    marketplace: Marketplace
    url: string
    city: string | null
    neighbourhood: string | null
    postedAt: string | null
    photoUrls: string[]
    priceCents: number | null
    removed: boolean
    isDemo: boolean
  }
  checkedAt: string
  verdict: Verdict
  summary: string | null
  offerScore: OfferScore
  quality: ListingQuality
  findings: {
    missing: { key: string; label: string; whyItMatters: string }[]
    contradictions: {
      key: string
      label: string
      textValue: string
      photoValue: string
      photoIndex: number
      photoDescription: string
    }[]
    confirmed: { key: string; label: string }[]
  } | null
  price: PriceSection
  scam: PatternResult[]
  seller: SellerSection | null
  reviews: ReviewItem[]
  /** The viewer may write a review of this seller. */
  viewerCanReview: boolean
  questions: { key: string; text: string; sourceKey: string | null }[]
  checklist: { key: string; text: string }[]
  /** The signed-in viewer's ticks; empty for guests. */
  ticks: string[]
  offer: OfferSection
  /** Null for guests. */
  tracked: boolean | null
}
