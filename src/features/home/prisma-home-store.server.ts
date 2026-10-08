import type { CheckSnapshot, HomeStore, TrackedListingState } from '#/features/home/home-store'
import type { RiskEvidence } from '#/features/home/home-result'
import type { PrismaClient } from '#/generated/prisma/client'

type StateRow = {
  listing_id: string
  status: TrackedListingState['status']
  removed_at: Date | null
  checked_at: Date
  price_cents: number
  verdict: CheckSnapshot['verdict']
  market_average_cents: number | null
  comparable_count: number
  risk_evidence_kind: RiskEvidence['kind'] | null
  risk_evidence_count: number | null
}

function toSnapshot(row: StateRow): CheckSnapshot {
  return {
    checkedAt: row.checked_at,
    priceCents: row.price_cents,
    verdict: row.verdict,
    marketAverageCents: row.market_average_cents,
    comparableCount: row.comparable_count,
    riskEvidence: riskEvidenceOf(row),
  }
}

function riskEvidenceOf(row: StateRow): RiskEvidence | null {
  const kind = row.risk_evidence_kind
  if (!kind) return null
  if (kind !== 'duplicate_photo') return { kind }
  return row.risk_evidence_count === null ? null : { kind, count: row.risk_evidence_count }
}

export function createPrismaHomeStore(db: PrismaClient): HomeStore {
  return {
    async listTrackedStates(userId) {
      // At most two rows per tracked listing (its latest two checks), read
      // through the (listing_id, checked_at DESC) index. Listings without a
      // finished check with a price yet drop out of the inner join.
      const rows = await db.$queryRaw<StateRow[]>`
        SELECT l.id AS listing_id, l.status::text AS status, l.removed_at,
               c.checked_at, c.price_cents, c.verdict::text AS verdict,
               c.market_average_cents, c.comparable_count,
               c.risk_evidence_kind::text AS risk_evidence_kind, c.risk_evidence_count
        FROM tracked_listing t
        JOIN listing l ON l.id = t.listing_id
        CROSS JOIN LATERAL (
          SELECT * FROM listing_check lc
          WHERE lc.listing_id = l.id
            AND lc.status = 'completed'
            AND lc.price_cents IS NOT NULL
          ORDER BY lc.checked_at DESC
          LIMIT 2
        ) c
        WHERE t.user_id = ${userId}
        ORDER BY l.id, c.checked_at DESC`

      const states = new Map<string, TrackedListingState>()
      for (const row of rows) {
        const state = states.get(row.listing_id)
        if (state) {
          state.previous = toSnapshot(row)
        } else {
          states.set(row.listing_id, {
            listingId: row.listing_id,
            status: row.status,
            removedAt: row.removed_at,
            latest: toSnapshot(row),
            previous: null,
          })
        }
      }
      return [...states.values()]
    },

    getListingDetails(listingIds) {
      if (listingIds.length === 0) return Promise.resolve([])
      return db.listing.findMany({
        where: { id: { in: [...listingIds] } },
        select: { id: true, marketplace: true, title: true, city: true, photoKey: true },
      })
    },

    async untrack(userId, listingId) {
      await db.trackedListing.deleteMany({ where: { userId, listingId } })
    },
  }
}
