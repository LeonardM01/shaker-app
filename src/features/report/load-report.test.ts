// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { runCheck } from '#/features/check/run-check'
import { fakeDeps, scrapedPhone } from '#/features/check/testing/fake-ports'
import { loadReport } from '#/features/report/load-report'
import type { ReportSession } from '#/features/report/load-report'
import { InMemoryReportStore } from '#/features/report/testing/in-memory-report-store'
import type { Marketplace } from '#/lib/listing'

const NOW = new Date('2026-10-08T12:00:00Z')
const URL = 'https://www.njuskalo.hr/mobiteli/iphone-13-pro-oglas-45123987'
const ana: ReportSession = { userId: 'user-ana' }
const ivan: ReportSession = { userId: 'user-ivan' }

function seedComparables(store: InMemoryReportStore, marketplace: Marketplace, euros: number[]) {
  for (const price of euros) {
    store.addListing({
      marketplace,
      title: `iPhone 13 Pro 128GB ${String(price)}`,
      category: 'phones',
      priceCents: price * 100,
      seenAt: new Date(NOW.getTime() - 86_400_000),
    })
  }
}

/** A finished check of the iPhone listing; returns its listing ID. */
async function checkedListing(store: InMemoryReportStore, comparables = [560, 575, 585, 605, 610, 620]) {
  seedComparables(store, 'njuskalo', comparables)
  const harness = fakeDeps(NOW, store)
  harness.reader.pages.set(URL, { kind: 'found', listing: scrapedPhone() })
  await runCheck(harness.deps, URL)
  const listing = store.listingByUrl(URL)
  if (!listing) throw new Error('no listing')
  return listing
}

function deps(store: InMemoryReportStore) {
  return {
    store,
    now: () => NOW,
    signPhotoUrl: (key: string) => Promise.resolve(`https://signed.test/${key}`),
  }
}

async function report(store: InMemoryReportStore, session: ReportSession | null, listingId: string) {
  const result = await loadReport(deps(store), session, listingId)
  if (!result) throw new Error('no report')
  return result
}

describe('loadReport', () => {
  it('returns null for a listing without a finished check', async () => {
    expect(await loadReport(deps(new InMemoryReportStore()), null, 'nope')).toBeNull()
  })

  it('gives a signed-in buyer the offer, its message and every comparable', async () => {
    const store = new InMemoryReportStore()
    const listing = await checkedListing(store)

    const result = await report(store, ana, listing.id)

    expect(result.verdict).toBe('room_to_haggle')
    expect(result.offer).toEqual({
      kind: 'unlocked',
      offerCents: 59000,
      savingCents: 5000,
      savingPercent: 8,
      message: 'Pozdrav! Nudim 590 €, može li?',
    })
    expect(result.price.comparables).toHaveLength(6)
    expect(result.price).toMatchObject({ comparableCount: 6, priceDiffPercent: 8, market: { medianCents: 59500 } })
    expect(result.tracked).toBe(false)
  })

  it('never sends a guest the offer amount, the message or more than one comparable', async () => {
    const store = new InMemoryReportStore()
    const listing = await checkedListing(store)

    const result = await report(store, null, listing.id)

    expect(result.offer).toEqual({ kind: 'locked', approxSavingCents: 5000 })
    expect(result.price.comparables).toHaveLength(1)
    expect(result.price.comparableCount).toBe(6)
    expect(result.tracked).toBeNull()
    const sent = JSON.stringify(result)
    expect(sent).not.toContain('59000')
    expect(sent).not.toContain('Nudim')
    expect(sent).not.toContain('{ponuda}')
  })

  it('shows the Insufficient state and no offer with fewer than 5 comparables', async () => {
    const store = new InMemoryReportStore()
    const listing = await checkedListing(store, [560, 580, 600])

    const result = await report(store, ana, listing.id)

    expect(result.verdict).toBe('no_data')
    expect(result.offer).toEqual({ kind: 'none' })
    expect(result.price).toMatchObject({ market: null, comparableCount: 3, priceDiffPercent: null })
    expect(result.price.byMarketplace).toEqual([
      { marketplace: 'njuskalo', count: 3, medianCents: null },
      { marketplace: 'facebook_marketplace', count: 0, medianCents: null },
      { marketplace: 'index_oglasi', count: 0, medianCents: null },
    ])
  })

  it('shows only real reviews on a real listing, and demo reviews only on a demo listing', async () => {
    const store = new InMemoryReportStore()
    const listing = await checkedListing(store)
    const sellerId = listing.sellerId ?? ''
    store.userNames.set('user-marko', 'Marko')
    store.addReview({ sellerId, stars: 5, userId: 'user-marko', listingId: listing.id, text: 'Sve odlično.' })
    store.addReview({ sellerId, stars: 5, isDemo: true, verifiedPurchase: true, text: 'Primjer recenzije.' })

    const real = await report(store, ana, listing.id)
    expect(real.reviews.map((review) => review.text)).toEqual(['Sve odlično.'])
    expect(real.seller).toMatchObject({ reviewCount: 1, averageStars: 5 })

    listing.isDemo = true
    const demo = await report(store, ana, listing.id)
    expect(demo.reviews.map((review) => review.text)).toContain('Primjer recenzije.')
  })

  it('links seller accounts across marketplaces only when one user claimed both', async () => {
    const store = new InMemoryReportStore()
    const listing = await checkedListing(store)
    const facebook = store.addSeller({ marketplace: 'facebook_marketplace', externalId: 'fb-ivana' })

    const unclaimed = await report(store, ivan, listing.id)
    expect(unclaimed.seller).toMatchObject({ sameOwnerOn: [], claimable: true, claimedByViewer: false })

    await store.claimSeller(ana.userId, listing.sellerId ?? '')
    await store.claimSeller(ana.userId, facebook.id)
    const claimed = await report(store, ivan, listing.id)
    expect(claimed.seller).toMatchObject({ sameOwnerOn: ['facebook_marketplace'], claimable: false })
    expect((await report(store, ana, listing.id)).seller?.claimedByViewer).toBe(true)
  })

  it("takes the seller's initials from letters only", async () => {
    const store = new InMemoryReportStore()
    const listing = await checkedListing(store)
    const seller = store.sellers.get(listing.sellerId ?? '')
    if (seller) seller.displayName = '-MixSHOP- d.o.o.'

    expect((await report(store, null, listing.id)).seller?.initials).toBe('MD')
  })

  it("returns only the viewer's own checklist ticks", async () => {
    const store = new InMemoryReportStore()
    const listing = await checkedListing(store)
    await store.setTick({ userId: ana.userId, listingId: listing.id, itemKey: 'imei', ticked: true })

    expect((await report(store, ana, listing.id)).ticks).toEqual(['imei'])
    expect((await report(store, ivan, listing.id)).ticks).toEqual([])
    expect((await report(store, null, listing.id)).ticks).toEqual([])
  })

  it('signs the stored photos and carries the written text', async () => {
    const store = new InMemoryReportStore()
    const listing = await checkedListing(store)

    const result = await report(store, null, listing.id)

    expect(result.listing.photoUrls).toEqual([
      `https://signed.test/listings/${listing.id}/0.webp`,
      `https://signed.test/listings/${listing.id}/1.webp`,
    ])
    expect(result.summary).toContain('račun')
    expect(result.questions[0]).toMatchObject({ sourceKey: 'receipt_or_warranty' })
    expect(result.findings?.missing[0]?.label).toBe('račun ili jamstvo')
  })
})
