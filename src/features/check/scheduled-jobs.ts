// Daily jobs (ADR 0006, ADR 0007): re-check tracked listings so Početna shows
// real changes, and delete listing photos nobody needs any more.

import { startCheck } from '#/features/check/run-check'
import type { CheckStore } from '#/features/check/check-store'
import type { Marketplace } from '#/lib/listing'

export type RecheckStore = Pick<CheckStore, 'findReusableCheck' | 'createCheck'> & {
  /** Active tracked listings, each with the link its checks were started for. */
  listTrackedForRecheck: () => Promise<{ listingId: string; canonicalUrl: string }[]>
}

type CheckToRun = { checkId: string; marketplace: Marketplace; canonicalUrl: string }

/**
 * Starts a fresh check of every active tracked listing. `launch` runs it (a
 * durable workflow in production). A listing that vanished ends up `removed`
 * through the check itself.
 */
export async function recheckTrackedListings(
  deps: { store: RecheckStore; clock: () => Date },
  launch: (check: CheckToRun) => Promise<void>,
): Promise<{ started: number; failed: number }> {
  const listings = await deps.store.listTrackedForRecheck()
  let started = 0
  let failed = 0
  for (const listing of listings) {
    try {
      const check = await startCheck(deps, listing.canonicalUrl, { force: true })
      // A check of this listing is already running; it will finish on its own.
      if (check.reused) continue
      await launch({ checkId: check.checkId, marketplace: check.marketplace, canonicalUrl: check.canonicalUrl })
      started++
    } catch (error) {
      failed++
      console.error('[recheck] could not start', { listingId: listing.listingId, error })
    }
  }
  return { started, failed }
}

/** Photos are kept this long after a listing's last check, unless someone tracks it. */
export const photoRetentionDays = 90

export type PhotoRetentionStore = {
  /** Stored photos of untracked listings whose last check started before `before`. */
  listExpiredPhotos: (before: Date, limit: number) => Promise<{ id: string; objectKey: string }[]>
  /** Keeps the rows and their pHashes; only the file is gone. */
  markPhotosDeleted: (ids: readonly string[], at: Date) => Promise<void>
}

const sweepBatch = 500

/** Deletes expired photo files in batches. pHashes stay for the duplicate-photo pattern. */
export async function sweepListingPhotos(deps: {
  store: PhotoRetentionStore
  deleteObjects: (keys: readonly string[]) => Promise<void>
  clock: () => Date
}): Promise<{ deleted: number }> {
  const now = deps.clock()
  const before = new Date(now.getTime() - photoRetentionDays * 86_400_000)
  let deleted = 0
  for (;;) {
    const photos = await deps.store.listExpiredPhotos(before, sweepBatch)
    if (photos.length === 0) break
    await deps.deleteObjects(photos.map((photo) => photo.objectKey))
    await deps.store.markPhotosDeleted(
      photos.map((photo) => photo.id),
      now,
    )
    deleted += photos.length
    if (photos.length < sweepBatch) break
  }
  return { deleted }
}
