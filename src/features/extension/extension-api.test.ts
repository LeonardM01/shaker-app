// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type { Extractor } from '#/features/check/check-ports'
import { createCheckStages } from '#/features/check/check-stages'
import { orchestrateCheck, runCheck } from '#/features/check/run-check'
import { fakeDeps, noScamSignals, scrapedPhone } from '#/features/check/testing/fake-ports'
import {
  getCheck,
  getSellerReviews,
  postCheck,
  postMessageCheck,
  postReview,
  preflight,
} from '#/features/extension/extension-api'
import { InMemoryReportStore } from '#/features/report/testing/in-memory-report-store'

const NOW = new Date('2026-10-08T12:00:00Z')
const URL = 'https://www.njuskalo.hr/mobiteli/iphone-13-pro-oglas-45123987'
const ANONYMOUS = 'user-anonimni'

function world() {
  const store = new InMemoryReportStore()
  const harness = fakeDeps(NOW, store)
  const started: Parameters<typeof orchestrateCheck>[1][] = []
  const extractor: Pick<Extractor, 'extractMessage'> = harness.deps.extractor
  const deps = {
    reportStore: store,
    checkStore: store,
    clock: () => NOW,
    signPhotoUrl: (key: string) => Promise.resolve(`https://signed.test/${key}`),
    startWorkflow: (check: Parameters<typeof orchestrateCheck>[1]) => {
      started.push(check)
      return Promise.resolve()
    },
    extractor,
    anonymousUserId: ANONYMOUS,
  }
  return { store, harness, deps, started }
}

/** A finished check of the iPhone listing with six comparables, so it has a market and an offer. */
async function checkedListing({ store, harness }: ReturnType<typeof world>) {
  for (const euros of [560, 575, 585, 605, 610, 620]) {
    store.addListing({
      marketplace: 'njuskalo',
      title: `iPhone 13 Pro 128GB ${String(euros)}`,
      category: 'phones',
      priceCents: euros * 100,
      seenAt: new Date(NOW.getTime() - 86_400_000),
    })
  }
  harness.reader.pages.set(URL, { kind: 'found', listing: scrapedPhone() })
  const { checkId } = await runCheck(harness.deps, URL)
  const listing = store.listingByUrl(URL)
  if (!listing) throw new Error('no listing')
  return { checkId, listing }
}

const post = (body: unknown, path = 'checks') =>
  new Request(`https://shaker.test/api/extension/v1/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('POST /checks', () => {
  it('starts a check of a listing nobody has checked and answers that it is running', async () => {
    const { deps, started } = world()

    const response = await postCheck(deps, post({ url: URL }))

    expect(response.status).toBe(202)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    const body = await response.json()
    expect(body).toMatchObject({ status: 'running', report: null, progress: { canonicalUrl: URL, listing: null } })
    expect(started).toEqual([expect.objectContaining({ checkId: body.checkId, canonicalUrl: URL })])
  })

  it('answers with the full report of a listing checked in the last 6 hours, without starting another check', async () => {
    const w = world()
    const { checkId, listing } = await checkedListing(w)

    const response = await postCheck(w.deps, post({ url: URL }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      checkId,
      status: 'completed',
      progress: { status: 'completed' },
      report: {
        listing: { id: listing.id, title: 'iPhone 13 Pro 128 GB, zeleni' },
        verdict: expect.any(String),
        offer: { kind: 'unlocked', offerCents: expect.any(Number) },
      },
    })
    expect(body.report.price.comparables).toHaveLength(6)
    expect(w.started).toEqual([])
  })

  it('leaves out everything about a signed-in viewer', async () => {
    const w = world()
    await checkedListing(w)

    const { report } = await (await postCheck(w.deps, post({ url: URL }))).json()

    for (const key of ['viewer', 'viewerCanReview', 'ticks', 'tracked']) expect(report).not.toHaveProperty(key)
    expect(report.seller).not.toHaveProperty('claimedByViewer')
    expect(report.seller).not.toHaveProperty('claimable')
  })

  it('refuses a link that is not a listing on a supported marketplace', async () => {
    const { deps, started } = world()

    const response = await postCheck(deps, post({ url: 'https://www.vinted.hr/items/123-jakna' }))

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ error: 'not_a_listing' })
    expect(started).toEqual([])
  })

  it('refuses a body without a URL', async () => {
    const { deps } = world()

    const response = await postCheck(deps, post({ link: URL }))

    expect(response.status).toBe(400)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(await response.json()).toEqual({ error: 'invalid_request' })
  })

  it('marks a check whose workflow never started as failed, so the next open tries again', async () => {
    const w = world()
    w.deps.startWorkflow = () => Promise.reject(new Error('workflow down'))

    const response = await postCheck(w.deps, post({ url: URL }))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'internal' })
    expect([...w.store.checks.values()].map((check) => check.status)).toEqual(['failed'])
  })
})

describe('GET /checks/{checkId}', () => {
  it('reports a running check without a report, then the full report once it completed', async () => {
    const w = world()
    const { checkId } = await (await postCheck(w.deps, post({ url: URL }))).json()

    expect(await (await getCheck(w.deps, checkId)).json()).toMatchObject({ checkId, status: 'running', report: null })

    // What the durable workflow does with the check it was handed.
    w.harness.reader.pages.set(URL, { kind: 'found', listing: scrapedPhone() })
    await orchestrateCheck(createCheckStages(w.harness.deps), w.started[0]!)
    const later = await getCheck(w.deps, checkId)

    expect(later.status).toBe(200)
    expect(await later.json()).toMatchObject({
      checkId,
      status: 'completed',
      report: { listing: { title: 'iPhone 13 Pro 128 GB, zeleni' } },
    })
  })

  it('answers 404 for a check that does not exist', async () => {
    const response = await getCheck(world().deps, 'check-nope')

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'not_found' })
  })
})

describe('OPTIONS (preflight)', () => {
  it('lets any origin call the API with a JSON body', () => {
    const response = preflight()

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(response.headers.get('access-control-allow-methods')).toBe('GET, POST, OPTIONS')
    expect(response.headers.get('access-control-allow-headers')).toBe('content-type')
  })
})

describe('POST /reviews', () => {
  const INSTALL_A = '3f0c9d52-0a51-4c55-9a51-6f2f1f1e0a01'
  const INSTALL_B = '3f0c9d52-0a51-4c55-9a51-6f2f1f1e0a02'
  const review = (listingId: string, installId: string, stars = 4) =>
    post({ listingId, installId, stars, text: 'Sve kako je opisano.' }, 'reviews')

  it('posts as Anonimni korisnik, once per seller per install, and every one counts toward the seller rating', async () => {
    const w = world()
    w.store.userNames.set(ANONYMOUS, 'Anonimni korisnik')
    const { listing } = await checkedListing(w)

    expect((await postReview(w.deps, review(listing.id, INSTALL_A, 5))).status).toBe(201)
    const again = await postReview(w.deps, review(listing.id, INSTALL_A, 1))
    expect(again.status).toBe(409)
    expect(await again.json()).toEqual({ error: 'already_reviewed' })
    expect((await postReview(w.deps, review(listing.id, INSTALL_B, 3))).status).toBe(201)

    const { report } = await (await postCheck(w.deps, post({ url: URL }))).json()
    expect(report.seller).toMatchObject({ reviewCount: 2, averageStars: 4 })
    expect(report.reviews).toMatchObject([
      { reviewerName: 'Anonimni korisnik', stars: expect.any(Number) },
      { reviewerName: 'Anonimni korisnik', stars: expect.any(Number) },
    ])
  })

  it('answers 404 when the listing has no known seller', async () => {
    const w = world()
    const orphan = w.store.addListing({ marketplace: 'njuskalo', title: 'Bez prodavača' })

    const response = await postReview(w.deps, review(orphan.id, INSTALL_A))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'no_seller' })
  })

  it('refuses stars outside 1–5, empty text and a missing install ID', async () => {
    const w = world()
    const { listing } = await checkedListing(w)
    const bad = [
      { listingId: listing.id, installId: INSTALL_A, stars: 6, text: 'Super.' },
      { listingId: listing.id, installId: INSTALL_A, stars: 4, text: '   ' },
      { listingId: listing.id, stars: 4, text: 'Super.' },
    ]

    for (const body of bad) expect((await postReview(w.deps, post(body, 'reviews'))).status).toBe(400)
    expect(w.store.reviews).toEqual([])
  })
})

describe('GET /sellers/{sellerId}/reviews', () => {
  const get = (deps: ReturnType<typeof world>['deps'], sellerId: string, cursor?: string | null) =>
    getSellerReviews(
      deps,
      sellerId,
      new Request(`https://shaker.test/api/extension/v1/sellers/${sellerId}/reviews${cursor ? `?cursor=${cursor}` : ''}`),
    )

  it('pages through real reviews newest first, 20 at a time, without demo reviews', async () => {
    const w = world()
    const seller = w.store.addSeller({ marketplace: 'njuskalo', externalId: 'ivana' })
    const day = (n: number) => new Date(Date.UTC(2026, 8, n))
    for (let n = 1; n <= 23; n++) w.store.addReview({ sellerId: seller.id, stars: 4, text: `Recenzija ${String(n)}`, createdAt: day(n) })
    w.store.addReview({ sellerId: seller.id, stars: 5, isDemo: true, text: 'Primjer.', createdAt: day(30) })

    const first = await get(w.deps, seller.id)
    expect(first.status).toBe(200)
    const page1 = await first.json()
    expect(page1.reviews).toHaveLength(20)
    expect(page1.reviews[0]).toMatchObject({ text: 'Recenzija 23', stars: 4, isDemo: false })
    expect(page1.reviews[0]).not.toHaveProperty('markedHelpfulByViewer')
    expect(page1.nextCursor).toEqual(expect.any(String))

    const page2 = await (await get(w.deps, seller.id, page1.nextCursor)).json()
    expect(page2.reviews.map((review: { text: string }) => review.text)).toEqual([
      'Recenzija 3',
      'Recenzija 2',
      'Recenzija 1',
    ])
    expect(page2.nextCursor).toBeNull()
  })

  it('answers 404 for a seller we do not know and 400 for a cursor we did not issue', async () => {
    const w = world()
    const seller = w.store.addSeller({ marketplace: 'njuskalo', externalId: 'ivana' })

    expect((await get(w.deps, crypto.randomUUID())).status).toBe(404)
    expect((await get(w.deps, 'nope')).status).toBe(404)
    expect((await get(w.deps, seller.id, 'garbage')).status).toBe(400)
  })
})

describe('POST /message-checks', () => {
  it("runs Provjeri poruku on the seller's message and shows which patterns fired", async () => {
    const w = world()
    const seen: string[] = []
    w.deps.extractor = {
      extractMessage: (message) => {
        seen.push(message)
        return Promise.resolve({ ...noScamSignals, advancePaymentOnly: { present: true, evidence: 'uplata unaprijed' } })
      },
    }

    const response = await postMessageCheck(w.deps, post({ message: 'Pošalji uplatu unaprijed.' }, 'message-checks'))

    expect(response.status).toBe(200)
    const { patterns } = await response.json()
    expect(seen).toEqual(['Pošalji uplatu unaprijed.'])
    expect(patterns).toContainEqual(expect.objectContaining({ code: 'advance_payment_only', status: 'fired' }))
    expect(patterns.filter((pattern: { status: string }) => pattern.status === 'fired')).toHaveLength(1)
  })

  it('refuses an empty message without calling the model', async () => {
    const w = world()
    w.deps.extractor = { extractMessage: () => Promise.reject(new Error('should not run')) }

    expect((await postMessageCheck(w.deps, post({ message: '  ' }, 'message-checks'))).status).toBe(400)
  })
})
