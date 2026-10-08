// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { runCheck, startCheck } from '#/features/check/run-check'
import { fakeDeps, scrapedPhone } from '#/features/check/testing/fake-ports'
import { ReaderError } from '#/features/marketplaces/marketplace-reader'
import { loadCheckProgress } from '#/features/report/load-report'
import { InMemoryReportStore } from '#/features/report/testing/in-memory-report-store'

const NOW = new Date('2026-10-08T12:00:00Z')
const URL = 'https://www.njuskalo.hr/mobiteli/iphone-13-pro-oglas-45123987'
const deps = (store: InMemoryReportStore) => ({
  store,
  signPhotoUrl: (key: string) => Promise.resolve(`https://signed.test/${key}`),
})

describe('loadCheckProgress', () => {
  it('shows every row queued and no listing before anything ran', async () => {
    const store = new InMemoryReportStore()
    const { checkId } = await startCheck({ store, clock: () => NOW }, URL)

    const progress = await loadCheckProgress(deps(store), checkId)

    expect(progress?.listing).toBeNull()
    expect(progress?.rows.map((row) => row.status)).toEqual(Array(7).fill('queued'))
  })

  it('shows the listing card and per-marketplace counts once the steps ran', async () => {
    const store = new InMemoryReportStore()
    const harness = fakeDeps(NOW, store)
    harness.reader.pages.set(URL, { kind: 'found', listing: scrapedPhone() })
    harness.reader.searches.set('index_oglasi', new ReaderError('timeout', 'slow'))
    const { checkId } = await runCheck(harness.deps, URL)

    const progress = await loadCheckProgress(deps(store), checkId)

    expect(progress).toMatchObject({
      status: 'completed',
      listing: { title: 'iPhone 13 Pro 128 GB, zeleni', photoCount: 2, priceCents: 64000, city: 'Zagreb' },
    })
    expect(progress?.listing?.photoUrl).toMatch(/^https:\/\/signed\.test\/.*0\.webp$/)
    expect(progress?.rows).toMatchObject([
      { key: 'read', status: 'done' },
      { key: 'comparables', marketplace: 'njuskalo', status: 'done', comparableCount: 0 },
      { key: 'comparables', marketplace: 'facebook_marketplace', status: 'done' },
      { key: 'comparables', marketplace: 'index_oglasi', status: 'failed', errorCode: 'timeout' },
      { key: 'scam', status: 'done' },
      { key: 'seller', status: 'done' },
      { key: 'questions', status: 'done' },
    ])
  })

  it('returns null for an unknown check', async () => {
    expect(await loadCheckProgress(deps(new InMemoryReportStore()), 'nope')).toBeNull()
  })
})
