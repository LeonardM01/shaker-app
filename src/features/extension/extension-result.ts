// What the extension API returns. The web report's data in the web report's
// terms (ADR 0013), minus everything about a signed-in viewer: the extension
// has no viewer, and anything the web app doesn't compute isn't here either.

import type { PatternResult } from '#/features/check/scoring/scam'
import type { CheckProgress, Report, ReviewItem, SellerSection } from '#/features/report/report-result'

export type ExtensionReview = Omit<ReviewItem, 'markedHelpfulByViewer' | 'viewerCanReply'>

export type ExtensionSeller = Omit<SellerSection, 'claimedByViewer' | 'claimable'>

export type ExtensionReport = Omit<
  Report,
  'viewer' | 'viewerCanReview' | 'ticks' | 'tracked' | 'seller' | 'reviews'
> & {
  seller: ExtensionSeller | null
  /** The newest 20; `GET /sellers/{sellerId}/reviews` pages through the rest. */
  reviews: ExtensionReview[]
}

export type ExtensionCheck = {
  checkId: string
  status: CheckProgress['status']
  progress: CheckProgress
  /** Only once the check completed. */
  report: ExtensionReport | null
}

export type ExtensionReviewPage = {
  reviews: ExtensionReview[]
  /** Pass back as `?cursor=` for the next page; null on the last one. */
  nextCursor: string | null
}

export type ExtensionMessageCheck = { patterns: PatternResult[] }

export type ExtensionError = {
  error: 'invalid_request' | 'not_a_listing' | 'not_found' | 'no_seller' | 'already_reviewed' | 'internal'
}

export function toExtensionReview({
  markedHelpfulByViewer: _helpful,
  viewerCanReply: _reply,
  ...review
}: ReviewItem): ExtensionReview {
  return review
}

export function toExtensionReport({
  viewer: _viewer,
  viewerCanReview: _canReview,
  ticks: _ticks,
  tracked: _tracked,
  seller,
  reviews,
  ...report
}: Report): ExtensionReport {
  return {
    ...report,
    seller: seller && (({ claimedByViewer: _claimed, claimable: _claimable, ...rest }) => rest)(seller),
    reviews: reviews.map(toExtensionReview),
  }
}
