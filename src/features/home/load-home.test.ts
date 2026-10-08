import { describe, expect, it, vi } from 'vitest'

import type { HomeResult } from '#/features/home/home-result'
import { loadHome, untrackListing } from '#/features/home/load-home'
import type { HomeSessionUser } from '#/features/home/load-home'
import { InMemoryHomeStore } from '#/features/home/testing/in-memory-home-store'

const NOW = new Date('2026-10-08T12:00:00Z')
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)

const ana: HomeSessionUser = { userId: 'user-ana', name: 'Ana Horvat', email: 'ana@example.hr' }
const ivan: HomeSessionUser = { userId: 'user-ivan', name: 'Ivan', email: 'ivan@example.hr' }

function deps(store: InMemoryHomeStore) {
  return {
    store,
    now: () => NOW,
    signPhotoUrl: vi.fn((key: string) => Promise.resolve(`https://signed.test/${key}`)),
  }
}

async function signedIn(store: InMemoryHomeStore, session: HomeSessionUser = ana) {
  const result = await loadHome(deps(store), session)
  if (result.kind !== 'signed_in') throw new Error(`expected signed_in, got ${result.kind}`)
  return result
}

const ids = (rows: { listingId: string }[]) => rows.map((row) => row.listingId)

describe('loadHome', () => {
  it('returns only the guest marker when there is no session', async () => {
    const store = new InMemoryHomeStore()
      .addListing({ id: 'ps5', title: 'PlayStation 5' }, [
        { checkedAt: minutesAgo(20), priceCents: 34_000 },
      ])
      .track(ana.userId, 'ps5')

    const result = await loadHome(deps(store), null)

    expect(JSON.stringify(result)).toBe(JSON.stringify({ kind: 'guest' } satisfies HomeResult))
  })

  it("never returns another user's tracked listings", async () => {
    const store = new InMemoryHomeStore()
      .addListing({ id: 'anas' }, [{ checkedAt: minutesAgo(5), priceCents: 10_000 }])
      .addListing({ id: 'ivans' }, [{ checkedAt: minutesAgo(5), priceCents: 20_000 }])
      .track(ana.userId, 'anas')
      .track(ivan.userId, 'ivans')

    const result = await signedIn(store, ana)

    expect([...ids(result.changed), ...ids(result.unchanged)]).toEqual(['anas'])
    expect(result.totalCount).toBe(1)
  })

  it("returns the viewer's initials", async () => {
    expect((await signedIn(new InMemoryHomeStore(), ana)).viewer).toEqual({ initials: 'AH' })
    expect((await signedIn(new InMemoryHomeStore(), ivan)).viewer).toEqual({ initials: 'I' })
    const nameless = { ...ana, name: '' }
    expect((await signedIn(new InMemoryHomeStore(), nameless)).viewer).toEqual({ initials: 'A' })
  })

  describe('change detection', () => {
    const before = minutesAgo(60 * 24)
    const after = minutesAgo(30)

    it.each([
      [
        'the price differs',
        { checkedAt: before, priceCents: 38_000 },
        { checkedAt: after, priceCents: 34_000 },
        {},
      ],
      [
        'the verdict differs',
        { checkedAt: before, priceCents: 34_000, verdict: 'fair_price' as const },
        { checkedAt: after, priceCents: 34_000, verdict: 'great_price' as const },
        {},
      ],
      [
        'risk evidence is new',
        { checkedAt: before, priceCents: 9_500 },
        {
          checkedAt: after,
          priceCents: 9_500,
          riskEvidence: { kind: 'duplicate_photo' as const, count: 3 },
        },
        {},
      ],
      [
        'the listing became removed',
        { checkedAt: before, priceCents: 52_000 },
        { checkedAt: after, priceCents: 52_000 },
        { status: 'removed' as const, removedAt: minutesAgo(60) },
      ],
    ])('counts a listing as changed when %s', async (_, previous, latest, listing) => {
      const store = new InMemoryHomeStore()
        .addListing({ id: 'x', ...listing }, [previous, latest])
        .track(ana.userId, 'x')

      const result = await signedIn(store)

      expect(ids(result.changed)).toEqual(['x'])
      expect(result.unchanged).toEqual([])
    })

    it('counts a listing with a single check as unchanged', async () => {
      const store = new InMemoryHomeStore()
        .addListing({ id: 'x' }, [{ checkedAt: after, priceCents: 34_000 }])
        .track(ana.userId, 'x')

      const result = await signedIn(store)

      expect(result.changed).toEqual([])
      expect(ids(result.unchanged)).toEqual(['x'])
    })

    it('counts a listing whose risk evidence was already there as unchanged', async () => {
      const evidence = { kind: 'duplicate_photo' as const, count: 3 }
      const store = new InMemoryHomeStore()
        .addListing({ id: 'x' }, [
          { checkedAt: before, priceCents: 9_500, verdict: 'risk', riskEvidence: evidence },
          { checkedAt: after, priceCents: 9_500, verdict: 'risk', riskEvidence: evidence },
        ])
        .track(ana.userId, 'x')

      const result = await signedIn(store)

      expect(ids(result.unchanged)).toEqual(['x'])
    })
  })

  describe('row line', () => {
    const before = minutesAgo(60 * 24)
    const after = minutesAgo(30)
    const evidence = { kind: 'duplicate_photo' as const, count: 3 }

    async function lineOf(store: InMemoryHomeStore) {
      const result = await signedIn(store.track(ana.userId, 'x'))
      const [row] = [...result.changed, ...result.unchanged]
      return row?.line
    }

    it('says the listing was removed before anything else, with its last price', async () => {
      const removedAt = minutesAgo(60 * 48)
      const store = new InMemoryHomeStore().addListing({ id: 'x', status: 'removed', removedAt }, [
        { checkedAt: before, priceCents: 60_000 },
        { checkedAt: after, priceCents: 52_000, riskEvidence: evidence, comparableCount: 2 },
      ])

      const result = await signedIn(store.track(ana.userId, 'x'))

      expect(result.changed[0]).toMatchObject({
        priceCents: 52_000,
        line: { kind: 'removed', removedAt: removedAt.toISOString() },
      })
    })

    it('shows new risk evidence before a price change', async () => {
      const store = new InMemoryHomeStore().addListing({ id: 'x' }, [
        { checkedAt: before, priceCents: 10_000 },
        { checkedAt: after, priceCents: 9_500, riskEvidence: evidence },
      ])

      expect(await lineOf(store)).toEqual({ kind: 'risk_evidence', evidence })
    })

    it('shows a risk verdict that carries no evidence as no data', async () => {
      const store = new InMemoryHomeStore()
        .addListing({ id: 'x' }, [{ checkedAt: after, priceCents: 9_500, verdict: 'risk' }])
        .track(ana.userId, 'x')

      const result = await signedIn(store)

      expect(result.unchanged[0]?.verdict).toBe('no_data')
    })

    it('keeps the evidence next to a risk verdict even when it is not new', async () => {
      const store = new InMemoryHomeStore().addListing({ id: 'x' }, [
        { checkedAt: before, priceCents: 10_000, verdict: 'risk', riskEvidence: evidence },
        { checkedAt: after, priceCents: 9_500, verdict: 'risk', riskEvidence: evidence },
      ])

      expect(await lineOf(store)).toEqual({ kind: 'risk_evidence', evidence })
    })

    it('shows a signed price delta before too few comparables', async () => {
      const dropped = new InMemoryHomeStore().addListing({ id: 'x' }, [
        { checkedAt: before, priceCents: 38_000 },
        { checkedAt: after, priceCents: 34_000, comparableCount: 2 },
      ])
      const rose = new InMemoryHomeStore().addListing({ id: 'x' }, [
        { checkedAt: before, priceCents: 34_000 },
        { checkedAt: after, priceCents: 35_500 },
      ])

      expect(await lineOf(dropped)).toEqual({ kind: 'price_change', deltaCents: -4_000 })
      expect(await lineOf(rose)).toEqual({ kind: 'price_change', deltaCents: 1_500 })
    })

    it('says there are too few comparables below 5, before "unchanged"', async () => {
      const four = new InMemoryHomeStore().addListing({ id: 'x' }, [
        { checkedAt: after, priceCents: 15_000, verdict: 'no_data', comparableCount: 4 },
      ])
      const five = new InMemoryHomeStore().addListing({ id: 'x' }, [
        { checkedAt: after, priceCents: 15_000, comparableCount: 5 },
      ])

      expect(await lineOf(four)).toEqual({ kind: 'too_few_comparables' })
      expect(await lineOf(five)).toEqual({ kind: 'unchanged' })
    })

    it('carries the display details of the listing', async () => {
      const store = new InMemoryHomeStore()
        .addListing(
          {
            id: 'x',
            title: 'Scott Scale 970, veličina M',
            marketplace: 'index_oglasi',
            city: 'Rijeka',
            photoKey: 'listings/x.jpg',
          },
          [{ checkedAt: after, priceCents: 52_000, verdict: 'fair_price' }],
        )
        .track(ana.userId, 'x')

      const result = await signedIn(store)

      expect(result.unchanged[0]).toEqual({
        listingId: 'x',
        title: 'Scott Scale 970, veličina M',
        marketplace: 'index_oglasi',
        city: 'Rijeka',
        photoUrl: 'https://signed.test/listings/x.jpg',
        verdict: 'fair_price',
        priceCents: 52_000,
        line: { kind: 'unchanged' },
      })
    })
  })

  describe('grouping', () => {
    function seed(store: InMemoryHomeStore, id: string, minutes: number, changed: boolean) {
      const checks = changed
        ? [
            { checkedAt: minutesAgo(minutes + 600), priceCents: 11_000 },
            { checkedAt: minutesAgo(minutes), priceCents: 10_000 },
          ]
        : [{ checkedAt: minutesAgo(minutes), priceCents: 10_000 }]
      store.addListing({ id }, checks).track(ana.userId, id)
    }

    it('puts changed rows first and orders each group newest check first', async () => {
      const store = new InMemoryHomeStore()
      seed(store, 'old-same', 300, false)
      seed(store, 'old-changed', 200, true)
      seed(store, 'new-same', 10, false)
      seed(store, 'new-changed', 20, true)

      const result = await signedIn(store)

      expect(ids(result.changed)).toEqual(['new-changed', 'old-changed'])
      expect(ids(result.unchanged)).toEqual(['new-same', 'old-same'])
    })

    it('shows at most 5 rows, filling from the changed group, and counts every tracked listing', async () => {
      const store = new InMemoryHomeStore()
      for (let index = 0; index < 4; index++) seed(store, `changed-${index}`, index, true)
      for (let index = 0; index < 8; index++) seed(store, `same-${index}`, index, false)

      const result = await signedIn(store)

      expect(ids(result.changed)).toEqual(['changed-0', 'changed-1', 'changed-2', 'changed-3'])
      expect(ids(result.unchanged)).toEqual(['same-0'])
      expect(result.totalCount).toBe(12)
    })

    it('can fill all 5 rows with changed listings', async () => {
      const store = new InMemoryHomeStore()
      for (let index = 0; index < 7; index++) seed(store, `changed-${index}`, index, true)
      seed(store, 'same', 0, false)

      const result = await signedIn(store)

      expect(result.changed).toHaveLength(5)
      expect(result.unchanged).toEqual([])
      expect(result.totalCount).toBe(8)
    })

    it('signs photo URLs for the visible rows only', async () => {
      const store = new InMemoryHomeStore()
      for (let index = 0; index < 7; index++) {
        store
          .addListing({ id: `l${index}`, photoKey: `p${index}.jpg` }, [
            { checkedAt: minutesAgo(index), priceCents: 10_000 },
          ])
          .track(ana.userId, `l${index}`)
      }
      const homeDeps = deps(store)

      await loadHome(homeDeps, ana)

      expect(homeDeps.signPhotoUrl.mock.calls.map(([key]) => key).sort()).toEqual([
        'p0.jpg',
        'p1.jpg',
        'p2.jpg',
        'p3.jpg',
        'p4.jpg',
      ])
    })

    it('returns empty groups when nothing is tracked', async () => {
      const result = await signedIn(new InMemoryHomeStore())

      expect(result).toMatchObject({ banner: null, changed: [], unchanged: [], totalCount: 0 })
    })
  })

  describe('update banner', () => {
    const before = minutesAgo(60 * 24)

    function drop(
      store: InMemoryHomeStore,
      id: string,
      from: number,
      to: number,
      at = minutesAgo(20),
      extra: { marketAverageCents?: number; comparableCount?: number } = {},
    ) {
      store
        .addListing({ id, title: `Naslov ${id}` }, [
          { checkedAt: before, priceCents: from },
          { checkedAt: at, priceCents: to, ...extra },
        ])
        .track(ana.userId, id)
    }

    it('picks the largest price drop', async () => {
      const store = new InMemoryHomeStore()
      drop(store, 'small', 10_000, 9_000)
      drop(store, 'large', 38_000, 34_000)
      drop(store, 'rise', 10_000, 20_000)

      const { banner } = await signedIn(store)

      expect(banner).toEqual({
        listingId: 'large',
        title: 'Naslov large',
        dropCents: 4_000,
        priceCents: 34_000,
        marketAverageCents: null,
        checkedAt: minutesAgo(20).toISOString(),
      })
    })

    it('breaks a tie by the most recent check', async () => {
      const store = new InMemoryHomeStore()
      drop(store, 'older', 10_000, 6_000, minutesAgo(90))
      drop(store, 'newer', 10_000, 6_000, minutesAgo(15))

      expect((await signedIn(store)).banner?.listingId).toBe('newer')
    })

    it('is absent when no price dropped', async () => {
      const store = new InMemoryHomeStore()
      drop(store, 'rise', 10_000, 12_000)
      store.addListing({ id: 'single' }, [{ checkedAt: before, priceCents: 5_000 }])
      store.track(ana.userId, 'single')

      expect((await signedIn(store)).banner).toBeNull()
    })

    it('ignores drops on removed listings', async () => {
      const store = new InMemoryHomeStore()
        .addListing({ id: 'gone', status: 'removed', removedAt: minutesAgo(10) }, [
          { checkedAt: before, priceCents: 10_000 },
          { checkedAt: minutesAgo(20), priceCents: 5_000 },
        ])
        .track(ana.userId, 'gone')

      expect((await signedIn(store)).banner).toBeNull()
    })

    it('can come from a listing outside the visible rows', async () => {
      const store = new InMemoryHomeStore()
      for (let index = 0; index < 5; index++) drop(store, `recent-${index}`, 10_000, 9_900, minutesAgo(index))
      drop(store, 'biggest', 50_000, 30_000, minutesAgo(600))

      const result = await signedIn(store)

      expect(ids(result.changed)).not.toContain('biggest')
      expect(result.banner).toMatchObject({ listingId: 'biggest', title: 'Naslov biggest' })
    })

    it.each([
      ['below average with 5 comparables', 39_500, 5, 39_500],
      ['below average with 4 comparables', 39_500, 4, null],
      ['equal to the average', 34_000, 12, null],
      ['above the average', 30_000, 12, null],
    ])('includes the market average only when the price is %s', async (_, average, comparables, expected) => {
      const store = new InMemoryHomeStore()
      drop(store, 'ps5', 38_000, 34_000, minutesAgo(20), {
        marketAverageCents: average,
        comparableCount: comparables,
      })

      expect((await signedIn(store)).banner?.marketAverageCents).toBe(expected)
    })
  })

  it('returns unavailable, keeping the viewer, when the store fails', async () => {
    const store = new InMemoryHomeStore()
    store.failing = true
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const result = await loadHome(deps(store), ana)

    expect(result).toEqual({ kind: 'unavailable', viewer: { initials: 'AH' } })
    error.mockRestore()
  })
})

describe('untrackListing', () => {
  it("removes only the caller's link and keeps the listing", async () => {
    const store = new InMemoryHomeStore()
      .addListing({ id: 'x' }, [{ checkedAt: minutesAgo(5), priceCents: 10_000 }])
      .track(ana.userId, 'x')
      .track(ivan.userId, 'x')

    await untrackListing({ store }, ana, 'x')

    expect(store.tracked).toEqual([{ userId: ivan.userId, listingId: 'x' }])
    expect(store.listings.has('x')).toBe(true)
  })

  it('rejects a caller without a session', async () => {
    const store = new InMemoryHomeStore()
      .addListing({ id: 'x' }, [{ checkedAt: minutesAgo(5), priceCents: 10_000 }])
      .track(ana.userId, 'x')

    await expect(untrackListing({ store }, null, 'x')).rejects.toThrow()
    expect(store.tracked).toHaveLength(1)
  })
})
