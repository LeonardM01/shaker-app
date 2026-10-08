import type { AuthContextStore } from '#/features/auth/auth-context-store'
import type { PrismaClient } from '#/generated/prisma/client'
import type { Verdict } from '#/lib/listing'

export function createPrismaAuthContextStore(db: PrismaClient): AuthContextStore {
  return {
    async getListingWithLatestCheck(listingId) {
      // The newest finished check comes through the (listing_id, checked_at DESC) index.
      const listing = await db.listing.findUnique({
        where: { id: listingId },
        select: {
          title: true,
          photoKey: true,
          checks: {
            where: { status: 'completed', priceCents: { not: null } },
            orderBy: { checkedAt: 'desc' },
            take: 1,
            select: { priceCents: true, verdict: true },
          },
        },
      })
      if (!listing) return null
      return {
        title: listing.title,
        photoKey: listing.photoKey,
        latestCheck: latestOf(listing.checks),
      }
    },
  }
}

/** Completed checks always have a price; the filter just can't narrow the type. */
function latestOf(checks: { priceCents: number | null; verdict: Verdict }[]) {
  const latest = checks[0]
  return latest?.priceCents == null ? null : { priceCents: latest.priceCents, verdict: latest.verdict }
}
