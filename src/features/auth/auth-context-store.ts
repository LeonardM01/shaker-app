import type { Verdict } from '#/lib/listing'

export type ListingWithLatestCheck = {
  title: string
  photoKey: string | null
  /** The newest check, or `null` when the listing has none yet. */
  latestCheck: { priceCents: number; verdict: Verdict } | null
}

/**
 * Read access to the one listing an auth screen was opened from. Postgres in
 * production (prisma-auth-context-store.server.ts), in memory in tests.
 */
export type AuthContextStore = {
  /** `null` when no listing has this ID. */
  getListingWithLatestCheck: (listingId: string) => Promise<ListingWithLatestCheck | null>
}
