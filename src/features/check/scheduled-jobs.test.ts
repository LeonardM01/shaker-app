// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { orchestrateCheck, runCheck } from '#/features/check/run-check'
import { createCheckStages } from '#/features/check/check-stages'
import { recheckTrackedListings } from '#/features/check/scheduled-jobs'
import { fakeDeps, scrapedPhone } from '#/features/check/testing/fake-ports'
import { InMemoryReportStore } from '#/features/report/testing/in-memory-report-store'

const NOW = new Date('2026-10-08T12:00:00Z')
const TOMORROW = new Date(NOW.getTime() + 86_400_000)
const PHONE = 'https://www.njuskalo.hr/mobiteli/iphone-13-pro-oglas-45123987'
const BIKE = 'https://www.index.hr/oglasi/sport/bicikli/oglas/scott-scale/5550001'

describe('recheckTrackedListings', () => {
  it('checks every tracked listing again, once, and marks a vanished one removed', async () => {
    const store = new InMemoryReportStore()
    const today = fakeDeps(NOW, store)
    today.reader.pages.set(PHONE, { kind: 'found', listing: scrapedPhone() })
    today.reader.pages.set(BIKE, {
      kind: 'found',
      listing: scrapedPhone({ externalId: '5550001', canonicalUrl: BIKE, title: 'Scott Scale 970' }),
    })
    await runCheck(today.deps, PHONE)
    await runCheck(today.deps, BIKE)
    const phone = store.listingByUrl(PHONE)?.id ?? ''
    const bike = store.listingByUrl(BIKE)?.id ?? ''
    await store.track('user-ana', phone)
    await store.track('user-ivan', phone)
    await store.track('user-ivan', bike)

    const tomorrow = fakeDeps(TOMORROW, store)
    tomorrow.reader.pages.set(PHONE, { kind: 'found', listing: scrapedPhone({ priceCents: 60000 }) })
    tomorrow.reader.pages.set(BIKE, { kind: 'removed' })
    const result = await recheckTrackedListings(
      { store, clock: () => TOMORROW },
      (check) => orchestrateCheck(createCheckStages(tomorrow.deps), check),
    )

    expect(result).toEqual({ started: 2, failed: 0 })
    expect(store.listings.get(bike)).toMatchObject({ status: 'removed', removedAt: TOMORROW })
    const phoneChecks = [...store.checks.values()].filter((check) => check.listingId === phone)
    expect(phoneChecks.map((check) => check.outcome?.priceCents)).toEqual([64000, 60000])
  })

  it("doesn't launch a second run of a check that is already running", async () => {
    const store = new InMemoryReportStore()
    const today = fakeDeps(NOW, store)
    today.reader.pages.set(PHONE, { kind: 'found', listing: scrapedPhone() })
    await runCheck(today.deps, PHONE)
    const listing = store.listingByUrl(PHONE)
    await store.track('user-ana', listing?.id ?? '')
    const { startCheck } = await import('#/features/check/run-check')
    await startCheck({ store, clock: () => TOMORROW }, PHONE, { force: true })
    const launched: string[] = []

    const result = await recheckTrackedListings({ store, clock: () => TOMORROW }, (check) => {
      launched.push(check.checkId)
      return Promise.resolve()
    })

    expect(launched).toEqual([])
    expect(result).toEqual({ started: 0, failed: 0 })
  })

  it("doesn't check a listing that is already removed", async () => {
    const store = new InMemoryReportStore()
    const today = fakeDeps(NOW, store)
    today.reader.pages.set(PHONE, { kind: 'found', listing: scrapedPhone() })
    await runCheck(today.deps, PHONE)
    const listing = store.listingByUrl(PHONE)
    if (!listing) throw new Error('no listing')
    listing.status = 'removed'
    await store.track('user-ana', listing.id)

    const result = await recheckTrackedListings({ store, clock: () => TOMORROW }, () => Promise.resolve())

    expect(result).toEqual({ started: 0, failed: 0 })
  })
})
