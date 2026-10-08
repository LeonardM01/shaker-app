// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { noScamSignals } from '#/features/check/testing/fake-ports'
import {
  checkMessage,
  claimListing,
  markReviewHelpful,
  replyToReview,
  setChecklistTick,
  writeReview,
} from '#/features/report/report-actions'
import { InMemoryReportStore } from '#/features/report/testing/in-memory-report-store'

const ana = { userId: 'user-ana' }
const ivan = { userId: 'user-ivan' }
const marko = { userId: 'user-marko' }

function world() {
  const store = new InMemoryReportStore()
  const seller = store.addSeller({ marketplace: 'njuskalo', externalId: 'ivana' })
  const listing = store.addListing({ marketplace: 'njuskalo', title: 'iPhone 13 Pro', kind: 'checked', sellerId: seller.id })
  return { store, deps: { store }, seller, listing }
}

describe('claimListing', () => {
  it("claims the listing's seller account; the first claim wins", async () => {
    const { deps, store, listing, seller } = world()

    expect(await claimListing(deps, ana, listing.id)).toEqual({ kind: 'claimed' })
    expect(await claimListing(deps, ana, listing.id)).toEqual({ kind: 'claimed' })
    expect(await claimListing(deps, ivan, listing.id)).toEqual({ kind: 'already_claimed' })
    expect((await store.getSeller(seller.id))?.claimedBy).toBe(ana.userId)
  })

  it('refuses a guest', async () => {
    const { deps, listing } = world()
    await expect(claimListing(deps, null, listing.id)).rejects.toThrow(/Unauthenticated/)
  })
})

describe('writeReview', () => {
  const review = (listingId: string) => ({ listingId, stars: 4, text: 'Sve kako je opisano.' })

  it('lets a buyer review a seller once', async () => {
    const { deps, store, listing } = world()

    expect(await writeReview(deps, ivan, review(listing.id))).toEqual({ kind: 'created' })
    expect(await writeReview(deps, ivan, review(listing.id))).toEqual({ kind: 'already_reviewed' })
    expect(store.reviews.filter((stored) => stored.userId === ivan.userId)).toMatchObject([
      { stars: 4, verifiedPurchase: false, isDemo: false },
    ])
  })

  it('refuses a review of a seller account the user claimed', async () => {
    const { deps, listing } = world()
    await claimListing(deps, ana, listing.id)

    expect(await writeReview(deps, ana, review(listing.id))).toEqual({ kind: 'own_seller' })
  })
})

describe('replyToReview', () => {
  it('lets only the claiming seller reply, and only once', async () => {
    const { deps, store, listing } = world()
    await writeReview(deps, ivan, { listingId: listing.id, stars: 2, text: 'Kasnio je.' })
    const reviewId = store.reviews[0]?.id ?? ''

    expect(await replyToReview(deps, marko, { reviewId, text: 'Nije istina.' })).toEqual({ kind: 'not_seller' })
    await claimListing(deps, ana, listing.id)
    expect(await replyToReview(deps, ana, { reviewId, text: 'Ispričavam se.' })).toEqual({ kind: 'replied' })
    expect(await replyToReview(deps, ana, { reviewId, text: 'Opet.' })).toEqual({ kind: 'already_replied' })
    expect(store.replies.map((reply) => reply.text)).toEqual(['Ispričavam se.'])
  })
})

describe('markReviewHelpful', () => {
  it('counts each user once', async () => {
    const { deps, store, listing } = world()
    await writeReview(deps, ivan, { listingId: listing.id, stars: 5, text: 'Super.' })
    const reviewId = store.reviews[0]?.id ?? ''

    await markReviewHelpful(deps, marko, reviewId)
    await markReviewHelpful(deps, marko, reviewId)
    await markReviewHelpful(deps, ana, reviewId)

    expect(store.helpful).toHaveLength(2)
  })
})

describe('setChecklistTick', () => {
  it("stores ticks for the signed-in user's own list only", async () => {
    const { deps, store, listing } = world()

    await setChecklistTick(deps, ana, { listingId: listing.id, itemKey: 'imei', ticked: true })
    await setChecklistTick(deps, ana, { listingId: listing.id, itemKey: 'face_id', ticked: true })
    await setChecklistTick(deps, ana, { listingId: listing.id, itemKey: 'imei', ticked: false })

    expect(await store.listTicks(ana.userId, listing.id)).toEqual(['face_id'])
    expect(await store.listTicks(ivan.userId, listing.id)).toEqual([])
  })
})

describe('checkMessage', () => {
  it('returns the four text patterns with their evidence', async () => {
    const extractor = {
      extractListing: () => Promise.reject(new Error('unused')),
      extractMessage: () =>
        Promise.resolve({
          ...noScamSignals,
          offPlatformPaymentLink: { present: true, evidence: 'platite na dostava-hr.com' },
        }),
    }

    const results = await checkMessage({ extractor }, 'Platite na dostava-hr.com pa šaljem.')

    expect(results.map(({ code, status }) => [code, status])).toEqual([
      ['off_platform_payment_link', 'fired'],
      ['off_platform_contact', 'clear'],
      ['advance_payment_only', 'clear'],
      ['urgency_pressure', 'clear'],
    ])
  })
})
