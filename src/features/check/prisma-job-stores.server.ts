import type { PhotoRetentionStore, RecheckStore } from '#/features/check/scheduled-jobs'
import { createPrismaCheckStore } from '#/features/check/prisma-check-store.server'
import type { PrismaClient } from '#/generated/prisma/client'

export function createPrismaRecheckStore(db: PrismaClient): RecheckStore {
  const checks = createPrismaCheckStore(db)
  return {
    findReusableCheck: checks.findReusableCheck,
    createCheck: checks.createCheck,
    async listTrackedForRecheck() {
      // The link of each listing's newest check, so a removal is recorded
      // against the same listing.
      return db.$queryRaw<{ listingId: string; canonicalUrl: string }[]>`
        SELECT DISTINCT ON (l.id) l.id AS "listingId", c.canonical_url AS "canonicalUrl"
        FROM listing l
        JOIN listing_check c ON c.listing_id = l.id
        WHERE l.status = 'active'
          AND EXISTS (SELECT 1 FROM tracked_listing t WHERE t.listing_id = l.id)
        ORDER BY l.id, c.started_at DESC`
    },
  }
}

export function createPrismaPhotoRetentionStore(db: PrismaClient): PhotoRetentionStore {
  return {
    listExpiredPhotos(before, limit) {
      return db.$queryRaw<{ id: string; objectKey: string }[]>`
        SELECT p.id, p.object_key AS "objectKey"
        FROM listing_photo p
        WHERE p.deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM tracked_listing t WHERE t.listing_id = p.listing_id)
          AND NOT EXISTS (
            SELECT 1 FROM listing_check c
            WHERE c.listing_id = p.listing_id AND c.started_at >= ${before}
          )
        LIMIT ${limit}`
    },
    async markPhotosDeleted(ids, at) {
      await db.listingPhoto.updateMany({ where: { id: { in: [...ids] } }, data: { deletedAt: at } })
    },
  }
}
