import type { AuthContextStore } from '#/features/auth/auth-context-store'
import type { Verdict } from '#/lib/listing'

type StoredListing = { id: string; title: string; photoKey: string | null }
type StoredCheck = { listingId: string; checkedAt: Date; priceCents: number; verdict: Verdict }

export type ListingSeed = { id: string; title?: string; photoKey?: string | null }
export type CheckSeed = { checkedAt: Date; priceCents: number; verdict?: Verdict }

/** Mirrors the listing and listing_check tables in memory. */
export class InMemoryAuthContextStore implements AuthContextStore {
  readonly listings = new Map<string, StoredListing>()
  readonly checks: StoredCheck[] = []
  failing = false

  addListing(seed: ListingSeed, checks: CheckSeed[] = []): this {
    this.listings.set(seed.id, {
      id: seed.id,
      title: seed.title ?? `Oglas ${seed.id}`,
      photoKey: seed.photoKey ?? null,
    })
    for (const check of checks) {
      this.checks.push({
        listingId: seed.id,
        checkedAt: check.checkedAt,
        priceCents: check.priceCents,
        verdict: check.verdict ?? 'fair_price',
      })
    }
    return this
  }

  getListingWithLatestCheck = (listingId: string) => {
    if (this.failing) throw new Error('store unavailable')
    const listing = this.listings.get(listingId)
    if (!listing) return Promise.resolve(null)
    const [latest] = this.checks
      .filter((check) => check.listingId === listingId)
      .sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime())
    return Promise.resolve({
      title: listing.title,
      photoKey: listing.photoKey,
      latestCheck: latest ? { priceCents: latest.priceCents, verdict: latest.verdict } : null,
    })
  }
}
