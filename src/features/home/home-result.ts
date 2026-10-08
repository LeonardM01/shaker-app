// What the home query returns to the client. Plain serialisable data: dates
// are ISO strings, money is integer cents.

import type { Marketplace, Verdict } from '#/lib/listing'

export type RiskEvidence = { kind: 'duplicate_photo'; count: number }

/** The one secondary line under a row's price, in priority order. */
export type RowLine =
  | { kind: 'removed'; removedAt: string }
  | { kind: 'risk_evidence'; evidence: RiskEvidence }
  | { kind: 'price_change'; deltaCents: number }
  | { kind: 'too_few_comparables' }
  | { kind: 'unchanged' }

export type WatchlistRow = {
  listingId: string
  title: string
  marketplace: Marketplace
  city: string | null
  photoUrl: string | null
  verdict: Verdict
  /** The latest price; for a removed listing, its last known price. */
  priceCents: number
  line: RowLine
}

export type UpdateBanner = {
  listingId: string
  title: string
  dropCents: number
  priceCents: number
  /** Only set when the price is below it and enough comparables exist. */
  marketAverageCents: number | null
  checkedAt: string
}

export type Viewer = { initials: string }

export type HomeResult =
  /** Signed out. Carries nothing else, so no tracked-listing data reaches a guest. */
  | { kind: 'guest' }
  | {
      kind: 'signed_in'
      /** Server clock, so relative times render the same on server and client. */
      now: string
      viewer: Viewer
      banner: UpdateBanner | null
      changed: WatchlistRow[]
      unchanged: WatchlistRow[]
      totalCount: number
    }
  /** The watchlist failed to load. The paste field keeps working. */
  | { kind: 'unavailable'; viewer: Viewer | null }
