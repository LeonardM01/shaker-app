// What a signed-in user can do on a report. Every rule of ADR 0011 is
// enforced here or by a unique constraint, never by the UI alone.

import type { Extractor } from '#/features/check/check-ports'
import { evaluateMessagePatterns } from '#/features/check/scoring/scam'
import type { PatternResult } from '#/features/check/scoring/scam'
import type { ReportSession } from '#/features/report/load-report'
import type { ReportStore } from '#/features/report/report-store'

type Deps = { store: ReportStore }

function requireSession(session: ReportSession | null, action: string): ReportSession {
  if (!session) throw new Error(`Unauthenticated ${action}`)
  return session
}

export async function trackListing(deps: Deps, session: ReportSession | null, listingId: string) {
  await deps.store.track(requireSession(session, 'track').userId, listingId)
}

export async function untrackListing(deps: Deps, session: ReportSession | null, listingId: string) {
  await deps.store.untrack(requireSession(session, 'untrack').userId, listingId)
}

export type ClaimResult = { kind: 'claimed' } | { kind: 'already_claimed' } | { kind: 'no_seller' }

/** "Ovo je moj oglas": claims the listing's seller account. First claim wins (ADR 0008). */
export async function claimListing(
  deps: Deps,
  session: ReportSession | null,
  listingId: string,
): Promise<ClaimResult> {
  const { userId } = requireSession(session, 'claim')
  const listing = await deps.store.getListing(listingId)
  if (!listing?.sellerId) return { kind: 'no_seller' }
  const { claimedBy } = await deps.store.claimSeller(userId, listing.sellerId)
  return claimedBy === userId ? { kind: 'claimed' } : { kind: 'already_claimed' }
}

export type ReviewResult =
  | { kind: 'created' }
  | { kind: 'already_reviewed' }
  /** The user claimed this seller account: no self-reviews. */
  | { kind: 'own_seller' }
  | { kind: 'no_seller' }

/** One review per seller per user, about this listing. */
export async function writeReview(
  deps: Deps,
  session: ReportSession | null,
  input: { listingId: string; stars: number; text: string },
): Promise<ReviewResult> {
  const { userId } = requireSession(session, 'review')
  const listing = await deps.store.getListing(input.listingId)
  const seller = listing?.sellerId ? await deps.store.getSeller(listing.sellerId) : null
  if (!listing || !seller) return { kind: 'no_seller' }
  if (seller.claimedBy === userId) return { kind: 'own_seller' }
  const created = await deps.store.createReview({
    userId,
    sellerId: seller.id,
    listingId: listing.id,
    stars: input.stars,
    text: input.text,
  })
  return created ? { kind: 'created' } : { kind: 'already_reviewed' }
}

export type ReplyResult =
  | { kind: 'replied' }
  | { kind: 'already_replied' }
  /** Only the user who claimed the reviewed seller may reply. */
  | { kind: 'not_seller' }
  | { kind: 'not_found' }

export async function replyToReview(
  deps: Deps,
  session: ReportSession | null,
  input: { reviewId: string; text: string },
): Promise<ReplyResult> {
  const { userId } = requireSession(session, 'reply')
  const review = await deps.store.getReview(input.reviewId)
  if (!review) return { kind: 'not_found' }
  const seller = await deps.store.getSeller(review.sellerId)
  if (seller?.claimedBy !== userId) return { kind: 'not_seller' }
  const created = await deps.store.createReply({ reviewId: review.id, userId, text: input.text })
  return created ? { kind: 'replied' } : { kind: 'already_replied' }
}

/** "Korisno": once per user. */
export async function markReviewHelpful(deps: Deps, session: ReportSession | null, reviewId: string) {
  await deps.store.markHelpful(reviewId, requireSession(session, 'helpful').userId)
}

/** "Prijavi": stored only; there is no moderation tooling yet. */
export async function reportReview(
  deps: Deps,
  session: ReportSession | null,
  input: { reviewId: string; reason: string },
) {
  await deps.store.reportReview({ ...input, userId: requireSession(session, 'report').userId })
}

export async function setChecklistTick(
  deps: Deps,
  session: ReportSession | null,
  input: { listingId: string; itemKey: string; ticked: boolean },
) {
  await deps.store.setTick({ ...input, userId: requireSession(session, 'tick').userId })
}

/** "Provjeri poruku": patterns 2, 4, 5 and 6 on a pasted message. The message is never stored. */
export async function checkMessage(
  deps: { extractor: Pick<Extractor, 'extractMessage'> },
  message: string,
): Promise<PatternResult[]> {
  return evaluateMessagePatterns(await deps.extractor.extractMessage(message))
}
