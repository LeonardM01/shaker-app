// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { runCheck, startCheck } from '#/features/check/run-check'
import { fakeDeps, scrapedPhone, writtenText } from '#/features/check/testing/fake-ports'
import type { InMemoryCheckStore } from '#/features/check/testing/in-memory-check-store'
import { ReaderError } from '#/features/marketplaces/marketplace-reader'
import type { Marketplace } from '#/lib/listing'

const NOW = new Date('2026-10-08T12:00:00Z')
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000)
const URL = 'https://www.njuskalo.hr/mobiteli/iphone-13-pro-oglas-45123987'

/** Comparable observations already in the database, seen yesterday. */
function seedComparables(
  store: InMemoryCheckStore,
  marketplace: Marketplace,
  euros: number[],
  title = 'iPhone 13 Pro 128GB',
) {
  for (const price of euros) {
    store.addListing({
      marketplace,
      title,
      category: 'phones',
      priceCents: price * 100,
      seenAt: daysAgo(1),
    })
  }
}

/** The same ports, with the clock moved on: forced re-checks need 10 minutes between them. */
const after = (deps: ReturnType<typeof setup>['deps'], minutes: number) => ({
  ...deps,
  clock: () => new Date(NOW.getTime() + minutes * 60_000),
})

function setup() {
  const harness = fakeDeps(NOW)
  harness.reader.pages.set(URL, { kind: 'found', listing: scrapedPhone() })
  return harness
}

describe('runCheck', () => {
  it('reads, scores and writes a listing, with every step done', async () => {
    const { deps, store } = setup()
    seedComparables(store, 'njuskalo', [560, 580, 590, 600, 610, 620])

    const { checkId } = await runCheck(deps, URL)

    const check = store.check(checkId)
    expect(check.status).toBe('completed')
    expect(Object.values(store.stepsOf(checkId)).map((step) => step.status)).toEqual(
      Array(10).fill('done'),
    )
    expect(check.outcome).toMatchObject({
      priceCents: 64000,
      verdict: 'room_to_haggle',
      market: { count: 6, medianCents: 59500 },
      offer: { offerCents: 59000, savingCents: 5000 },
    })
    expect(check.text?.summary).toContain('račun')
  })

  it('fails one marketplace step on its own while the other steps finish', async () => {
    const { deps, store, reader } = setup()
    reader.searches.set('facebook_marketplace', new ReaderError('blocked', 'login wall'))

    const { checkId } = await runCheck(deps, URL)

    const steps = store.stepsOf(checkId)
    expect(steps.comparables_facebook_marketplace).toMatchObject({ status: 'failed', errorCode: 'blocked' })
    expect(steps.comparables_njuskalo.status).toBe('done')
    expect(steps.write.status).toBe('done')
    expect(store.check(checkId).status).toBe('completed')
  })

  it('reuses a check of the same listing from the last 6 hours', async () => {
    const first = setup()
    const { checkId } = await runCheck(first.deps, URL)
    first.reader.pages.clear()

    const again = await runCheck(first.deps, `${URL}?utm_source=share`)

    expect(again).toEqual({ checkId, reused: true })
  })

  it('joins a check that is still running instead of starting a duplicate, even when forced', async () => {
    const { deps } = setup()
    const running = await startCheck(deps, URL)

    const forced = await startCheck(deps, URL, { force: true })

    expect(forced).toMatchObject({ checkId: running.checkId, reused: true })
  })

  it("doesn't reuse a check that has been running for more than 10 minutes", async () => {
    const { deps, store } = setup()
    const { checkId: stuck } = await startCheck(deps, URL)

    const later = { ...deps, clock: () => new Date(NOW.getTime() + 11 * 60_000) }
    const { checkId } = await runCheck(later, URL)

    expect(checkId).not.toBe(stuck)
    expect(store.check(checkId).status).toBe('completed')
  })

  it('starts a new check when forced 10 minutes after the last one, or after 6 hours', async () => {
    const { deps, store } = setup()
    const { checkId } = await runCheck(deps, URL)

    const tooSoon = await runCheck(after(deps, 5), URL, { force: true })
    expect(tooSoon).toEqual({ checkId, reused: true })

    const forced = await runCheck(after(deps, 11), URL, { force: true })
    expect(forced.reused).toBe(false)
    expect(forced.checkId).not.toBe(checkId)

    const later = { ...deps, clock: () => new Date(NOW.getTime() + 7 * 3_600_000) }
    const fresh = await runCheck(later, URL)
    expect(fresh.reused).toBe(false)
    expect(store.check(fresh.checkId).status).toBe('completed')
  })

  it('ends a removed listing as removed, with nothing else run', async () => {
    const { deps, store, reader } = setup()
    const { checkId: first } = await runCheck(deps, URL)
    reader.pages.set(URL, { kind: 'removed' })

    const { checkId } = await runCheck(after(deps, 33), URL, { force: true })

    expect(store.check(checkId).status).toBe('removed')
    expect(store.listingByUrl(URL)).toMatchObject({
      status: 'removed',
      removedAt: new Date(NOW.getTime() + 33 * 60_000),
    })
    expect(store.stepsOf(checkId).comparables_njuskalo.status).toBe('skipped')
    expect(store.check(first).status).toBe('completed')
  })

  it('searches live only on marketplaces with fewer than 5 comparables, and keeps what it saw', async () => {
    const { deps, store, reader } = setup()
    seedComparables(store, 'njuskalo', [560, 580, 590, 600, 610])
    seedComparables(store, 'facebook_marketplace', [550, 570])
    reader.searches.set('facebook_marketplace', [
      { externalId: 'fb-1', url: 'https://www.facebook.com/marketplace/item/1/', title: 'iPhone 13 Pro 128 GB', priceCents: 58000, city: 'Split', postedAt: null },
      { externalId: 'fb-2', url: 'https://www.facebook.com/marketplace/item/2/', title: 'iPhone 13 Pro Max 128 GB', priceCents: 70000, city: 'Split', postedAt: null },
    ])

    const { checkId } = await runCheck(deps, URL)

    expect(reader.searched.map((search) => search.marketplace)).toEqual(['facebook_marketplace', 'index_oglasi'])
    expect(reader.searched[0]?.query).toBe('iPhone 13 Pro 128 GB')
    const steps = store.stepsOf(checkId)
    expect(steps.comparables_njuskalo.summary).toEqual({ comparableCount: 5 })
    expect(steps.comparables_facebook_marketplace.summary).toEqual({ comparableCount: 3 })
    expect(steps.comparables_index_oglasi).toMatchObject({ status: 'done', summary: { comparableCount: 0 } })
    expect(store.listingByUrl('https://www.facebook.com/marketplace/item/2/')).toMatchObject({ kind: 'observation' })
    expect(store.check(checkId).outcome?.market?.count).toBe(8)
  })

  it('widens the match without the storage size when there are fewer than 5 in total, and says so', async () => {
    const { deps, store } = setup()
    seedComparables(store, 'njuskalo', [560, 580])
    seedComparables(store, 'index_oglasi', [600, 610, 620], 'iPhone 13 Pro 256 GB')

    const { checkId } = await runCheck(deps, URL)

    const check = store.check(checkId)
    expect(check.outcome).toMatchObject({ widened: true, market: { count: 5 } })
    expect(check.comparables?.byMarketplace.index_oglasi.comparables).toHaveLength(3)
    expect(store.stepsOf(checkId).comparables_index_oglasi.summary).toEqual({ comparableCount: 3 })
  })

  it('gives no verdict, offer or range with fewer than 5 comparables', async () => {
    const { deps, store } = setup()
    seedComparables(store, 'njuskalo', [560, 580, 600])

    const { checkId } = await runCheck(deps, URL)

    expect(store.check(checkId).outcome).toMatchObject({
      verdict: 'no_data',
      offer: null,
      widened: false,
      market: { count: 3 },
    })
  })

  it('copies the photos and turns a photo seen on another seller’s listing into Rizik with its evidence', async () => {
    const { deps, store, reader, photoHashes } = setup()
    seedComparables(store, 'njuskalo', [700, 720, 740, 760, 780])
    const other = store.addListing({ marketplace: 'facebook_marketplace', title: 'iPhone 13 Pro', sellerId: 'someone-else' })
    store.photos.push({ listingId: other.id, position: 0, objectKey: 'x', phash: 'f0f0f0f0f0f0f0f0', deletedAt: null })
    photoHashes.set('https://img.test/2.jpg', 'f0f0f0f0f0f0f0f1')
    reader.pages.set(URL, { kind: 'found', listing: scrapedPhone() })

    const { checkId } = await runCheck(deps, URL)

    const listing = store.listingByUrl(URL)
    expect(store.photos.filter((photo) => photo.listingId === listing?.id)).toHaveLength(2)
    expect(listing?.photoKey).toMatch(/0\.webp$/)
    expect(store.check(checkId).outcome).toMatchObject({
      priceVerdict: 'great_price',
      verdict: 'risk',
      scam: expect.arrayContaining([
        expect.objectContaining({
          code: 'duplicate_photo',
          status: 'fired',
          evidence: { kind: 'duplicate_photo', otherListingCount: 1 },
        }),
      ]) as unknown,
    })
  })

  it('deletes the copies of photos a listing no longer has when it is checked again', async () => {
    const { deps, reader, deletedPhotos } = setup()
    await runCheck(deps, URL)
    reader.pages.set(URL, { kind: 'found', listing: scrapedPhone({ photoUrls: ['https://img.test/1.jpg'] }) })

    await runCheck(after(deps, 11), URL, { force: true })

    expect(deletedPhotos).toEqual([expect.stringMatching(/\/1\.webp$/) as unknown])
  })

  it("doesn't count the seller's own other listings as duplicate photos", async () => {
    const { deps, store, photoHashes } = setup()
    await runCheck(deps, URL)
    const sellerId = store.listingByUrl(URL)?.sellerId ?? null
    const own = store.addListing({ marketplace: 'njuskalo', title: 'iPhone 13 Pro', sellerId })
    store.photos.push({ listingId: own.id, position: 0, objectKey: 'y', phash: 'abababababababab', deletedAt: null })
    photoHashes.set('https://img.test/1.jpg', 'abababababababab')

    const { checkId } = await runCheck(after(deps, 44), URL, { force: true })

    expect(store.check(checkId).outcome?.scam[0]?.status).toBe('clear')
  })

  it("scores Ocjena ponude from the seller's real reviews only", async () => {
    const { deps, store } = setup()
    await runCheck(deps, URL)
    const sellerId = store.listingByUrl(URL)?.sellerId ?? ''
    for (let i = 0; i < 6; i++) store.addReview({ sellerId, stars: 5, isDemo: true })

    const demoOnly = await runCheck(after(deps, 55), URL, { force: true })
    expect(store.check(demoOnly.checkId).outcome?.offerScore).toEqual({ kind: 'no_data' })

    for (let i = 0; i < 5; i++) store.addReview({ sellerId, stars: 5 })
    const real = await runCheck(after(deps, 66), URL, { force: true })
    expect(store.check(real.checkId).outcome?.offerScore).toMatchObject({
      kind: 'score',
      basis: 'reviews_only',
      reviews: { count: 5, averageStars: 5 },
    })
  })

  it('never gives the writer the offer amount or a price', async () => {
    const { deps, store, writerInputs } = setup()
    seedComparables(store, 'njuskalo', [560, 580, 590, 600, 610, 620])

    await runCheck(deps, URL)

    const sent = JSON.stringify(writerInputs)
    expect(sent).not.toContain('590')
    expect(sent).not.toContain('595')
    expect(sent).not.toContain('640')
    expect(writerInputs[0]?.reasons.priceDiffPercent).toBe(8)
  })

  it('rejects a draft with a number that is not in its inputs and keeps the next one', async () => {
    const { deps, store, fakes } = setup()
    fakes.drafts = [
      writtenText({ summary: 'Ponudi 590 € i uštedi.' }),
      writtenText({ summary: 'Cijena je malo iznad tržišta.' }),
    ]

    const { checkId } = await runCheck(deps, URL)

    expect(store.check(checkId).text?.summary).toBe('Cijena je malo iznad tržišta.')
    expect(store.stepsOf(checkId).write.status).toBe('done')
  })

  it('fails only the write step when every draft has an unknown number', async () => {
    const { deps, store, fakes } = setup()
    fakes.drafts = [writtenText({ offerMessage: 'Nudim 590 €, {ponuda}' })]

    const { checkId } = await runCheck(deps, URL)

    expect(store.stepsOf(checkId).write).toMatchObject({ status: 'failed', errorCode: 'write_failed' })
    expect(store.check(checkId)).toMatchObject({ status: 'completed', text: null })
  })

  it('degrades to no data, not failure, when extraction fails', async () => {
    const { deps, store, fakes } = setup()
    fakes.facts = new Error('model timeout')

    const { checkId } = await runCheck(deps, URL)

    const steps = store.stepsOf(checkId)
    expect(steps.extract).toMatchObject({ status: 'failed', errorCode: 'extract_failed' })
    expect(steps.comparables_njuskalo.status).toBe('skipped')
    expect(steps.seller.status).toBe('done')
    expect(store.check(checkId)).toMatchObject({
      status: 'completed',
      outcome: { verdict: 'no_data', quality: { kind: 'no_data' } },
    })
  })

  it('fails the whole check with the reader error code when the listing cannot be read', async () => {
    const { deps, store, reader } = setup()
    reader.pages.set(URL, new ReaderError('parse_failed', 'unexpected page'))

    const { checkId } = await runCheck(deps, URL)

    expect(store.check(checkId).status).toBe('failed')
    expect(store.stepsOf(checkId).read).toMatchObject({ status: 'failed', errorCode: 'parse_failed' })
    expect(store.stepsOf(checkId).write.status).toBe('skipped')
  })
})
