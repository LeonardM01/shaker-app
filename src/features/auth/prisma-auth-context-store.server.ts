import type { AuthContextStore } from '#/features/auth/auth-context-store'
import type { PrismaClient } from '#/generated/prisma/client'

export function createPrismaAuthContextStore(db: PrismaClient): AuthContextStore {
  return {
    async getListingWithLatestCheck(listingId) {
      // The newest check comes through the (listing_id, checked_at DESC) index.
      const listing = await db.listing.findUnique({
        where: { id: listingId },
        select: {
          title: true,
          photoKey: true,
          checks: {
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
        latestCheck: listing.checks[0] ?? null,
      }
    },
  }
}
