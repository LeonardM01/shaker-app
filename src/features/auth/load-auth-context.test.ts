import { describe, expect, it, vi } from 'vitest'

import type { AuthContext } from '#/features/auth/auth-context'
import { loadAuthContext } from '#/features/auth/load-auth-context'
import { InMemoryAuthContextStore } from '#/features/auth/testing/in-memory-auth-context-store'

const NOW = new Date('2026-10-08T12:00:00Z')
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)

const LISTING_ID = '6f1c2a4e-8b1d-4c3a-9e7f-2d5b8a1c0e93'

function deps(store: InMemoryAuthContextStore) {
  return {
    store,
    signPhotoUrl: vi.fn((key: string) => Promise.resolve(`https://signed.test/${key}`)),
  }
}

const generic: AuthContext = { kind: 'generic' }

describe('loadAuthContext', () => {
  it('is generic without a listing ID', async () => {
    const store = new InMemoryAuthContextStore().addListing({ id: LISTING_ID }, [
      { checkedAt: minutesAgo(5), priceCents: 64_000 },
    ])

    expect(await loadAuthContext(deps(store), undefined)).toEqual(generic)
  })

  it('is generic for an unknown listing', async () => {
    expect(await loadAuthContext(deps(new InMemoryAuthContextStore()), LISTING_ID)).toEqual(generic)
  })

  it('is generic for a listing that has no check yet', async () => {
    const store = new InMemoryAuthContextStore().addListing({ id: LISTING_ID })

    expect(await loadAuthContext(deps(store), LISTING_ID)).toEqual(generic)
  })

  it("carries the latest check's price and verdict, and the signed photo URL", async () => {
    const store = new InMemoryAuthContextStore().addListing(
      { id: LISTING_ID, title: 'iPhone 13 Pro, 128 GB, zeleni', photoKey: 'listings/iphone.jpg' },
      [
        { checkedAt: minutesAgo(60 * 24), priceCents: 70_000, verdict: 'fair_price' },
        { checkedAt: minutesAgo(20), priceCents: 64_000, verdict: 'room_to_haggle' },
        { checkedAt: minutesAgo(60), priceCents: 68_000, verdict: 'great_price' },
      ],
    )

    expect(await loadAuthContext(deps(store), LISTING_ID)).toEqual({
      kind: 'listing',
      listing: {
        title: 'iPhone 13 Pro, 128 GB, zeleni',
        photoUrl: 'https://signed.test/listings/iphone.jpg',
        verdict: 'room_to_haggle',
        priceCents: 64_000,
      },
    })
  })

  it('has no photo URL, and signs nothing, without a photo key', async () => {
    const store = new InMemoryAuthContextStore().addListing({ id: LISTING_ID }, [
      { checkedAt: minutesAgo(5), priceCents: 64_000 },
    ])
    const authDeps = deps(store)

    const result = await loadAuthContext(authDeps, LISTING_ID)

    expect(result).toMatchObject({ kind: 'listing', listing: { photoUrl: null } })
    expect(authDeps.signPhotoUrl).not.toHaveBeenCalled()
  })

  it('drops a risk verdict, since its evidence is not on this screen', async () => {
    const store = new InMemoryAuthContextStore().addListing({ id: LISTING_ID }, [
      { checkedAt: minutesAgo(5), priceCents: 9_500, verdict: 'risk' },
    ])

    expect(await loadAuthContext(deps(store), LISTING_ID)).toMatchObject({
      kind: 'listing',
      listing: { verdict: null, priceCents: 9_500 },
    })
  })

  it('is generic, and logs the listing ID, when the store fails', async () => {
    const store = new InMemoryAuthContextStore()
    store.failing = true
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(await loadAuthContext(deps(store), LISTING_ID)).toEqual(generic)
    expect(error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ listingId: LISTING_ID }),
    )
    error.mockRestore()
  })

  it('serialises to the panel fields only: no offer, no IDs', async () => {
    const store = new InMemoryAuthContextStore().addListing(
      { id: LISTING_ID, title: 'Kauč', photoKey: 'k.jpg' },
      [{ checkedAt: minutesAgo(5), priceCents: 15_000, verdict: 'great_price' }],
    )

    const result = await loadAuthContext(deps(store), LISTING_ID)

    expect(JSON.parse(JSON.stringify(result))).toEqual({
      kind: 'listing',
      listing: {
        title: 'Kauč',
        photoUrl: 'https://signed.test/k.jpg',
        verdict: 'great_price',
        priceCents: 15_000,
      },
    })
  })
})
