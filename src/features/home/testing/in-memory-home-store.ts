import type { RiskEvidence } from '#/features/home/home-result'
import type { Marketplace, Verdict } from '#/lib/listing'
import type { CheckSnapshot, HomeStore, ListingDetails } from '#/features/home/home-store'

type StoredListing = ListingDetails & { status: 'active' | 'removed'; removedAt: Date | null }
type StoredCheck = CheckSnapshot & { listingId: string }

export type ListingSeed = {
  id: string
  title?: string
  marketplace?: Marketplace
  city?: string | null
  photoKey?: string | null
  status?: 'active' | 'removed'
  removedAt?: Date | null
}

export type CheckSeed = {
  checkedAt: Date
  priceCents: number
  verdict?: Verdict
  marketAverageCents?: number | null
  comparableCount?: number
  riskEvidence?: RiskEvidence | null
}

/** Mirrors the listing, listing_check and tracked_listing tables in memory. */
export class InMemoryHomeStore implements HomeStore {
  readonly listings = new Map<string, StoredListing>()
  readonly checks: StoredCheck[] = []
  tracked: { userId: string; listingId: string }[] = []
  failing = false

  addListing(seed: ListingSeed, checks: CheckSeed[] = []): this {
    this.listings.set(seed.id, {
      id: seed.id,
      title: seed.title ?? `Oglas ${seed.id}`,
      marketplace: seed.marketplace ?? 'njuskalo',
      city: seed.city ?? 'Zagreb',
      photoKey: seed.photoKey ?? null,
      status: seed.status ?? 'active',
      removedAt: seed.removedAt ?? null,
    })
    for (const check of checks) {
      this.checks.push({
        listingId: seed.id,
        checkedAt: check.checkedAt,
        priceCents: check.priceCents,
        verdict: check.verdict ?? 'fair_price',
        marketAverageCents: check.marketAverageCents ?? null,
        comparableCount: check.comparableCount ?? 10,
        riskEvidence: check.riskEvidence ?? null,
      })
    }
    return this
  }

  track(userId: string, ...listingIds: string[]): this {
    for (const listingId of listingIds) this.tracked.push({ userId, listingId })
    return this
  }

  listTrackedStates = (userId: string) => {
    this.assertUp()
    return Promise.resolve(
      this.tracked
        .filter((link) => link.userId === userId)
        .flatMap((link) => {
          const listing = this.listings.get(link.listingId)
          const [latest, previous] = this.checks
            .filter((check) => check.listingId === link.listingId)
            .sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime())
            .map(({ listingId: _, ...snapshot }) => snapshot)
          if (!listing || !latest) return []
          return [
            {
              listingId: listing.id,
              status: listing.status,
              removedAt: listing.removedAt,
              latest,
              previous: previous ?? null,
            },
          ]
        }),
    )
  }

  getListingDetails = (listingIds: readonly string[]) => {
    this.assertUp()
    return Promise.resolve(
      listingIds.flatMap((id) => {
        const listing = this.listings.get(id)
        if (!listing) return []
        const { status: _, removedAt: __, ...details } = listing
        return [details]
      }),
    )
  }

  untrack = (userId: string, listingId: string) => {
    this.assertUp()
    this.tracked = this.tracked.filter(
      (link) => !(link.userId === userId && link.listingId === listingId),
    )
    return Promise.resolve()
  }

  private assertUp() {
    if (this.failing) throw new Error('store unavailable')
  }
}
