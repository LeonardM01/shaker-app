import type { RiskEvidence } from '#/features/home/home-result'
import type { Marketplace, Verdict } from '#/lib/listing'

export type CheckSnapshot = {
  checkedAt: Date
  priceCents: number
  verdict: Verdict
  marketAverageCents: number | null
  comparableCount: number
  riskEvidence: RiskEvidence | null
}

/** A tracked listing reduced to what change detection needs. */
export type TrackedListingState = {
  listingId: string
  status: 'active' | 'removed'
  removedAt: Date | null
  latest: CheckSnapshot
  previous: CheckSnapshot | null
}

export type ListingDetails = {
  id: string
  marketplace: Marketplace
  title: string
  city: string | null
  photoKey: string | null
}

/**
 * Read and write access to listings, checks and tracked listings. Postgres in
 * production (prisma-home-store.server.ts), in memory in tests.
 */
export type HomeStore = {
  /**
   * One narrow row per listing the user tracks that has at least one check:
   * its status and its latest two checks. No titles or photos.
   */
  listTrackedStates: (userId: string) => Promise<TrackedListingState[]>
  /** Display details for the given listings only. */
  getListingDetails: (listingIds: readonly string[]) => Promise<ListingDetails[]>
  /** Deletes the user's link to the listing. The listing and its checks stay. */
  untrack: (userId: string, listingId: string) => Promise<void>
}
