import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { checkDeps } from '#/features/check/check-deps.server'
import type { PatternResult } from '#/features/check/scoring/scam'
import { loadReport } from '#/features/report/load-report'
import type { ReportDeps, ReportSession } from '#/features/report/load-report'
import { createPrismaReportStore } from '#/features/report/prisma-report-store.server'
import {
  checkMessage,
  claimListing,
  markReviewHelpful,
  replyToReview,
  reportReview,
  setChecklistTick,
  trackListing,
  untrackListing,
  writeReview,
} from '#/features/report/report-actions'
import type { Report } from '#/features/report/report-result'
import { getAuthServer } from '#/lib/auth/auth.server'
import { getDb } from '#/lib/db.server'
import { signListingPhotoUrl } from '#/lib/storage.server'

function reportDeps(): ReportDeps {
  return {
    store: createPrismaReportStore(getDb()),
    now: () => new Date(),
    signPhotoUrl: signListingPhotoUrl,
  }
}

async function readSession(): Promise<ReportSession | null> {
  const { data, error } = await getAuthServer().getSession()
  if (error) throw new Error(`Session lookup failed: ${error.message}`)
  return data?.user ? { userId: data.user.id } : null
}

/** Izvještaj oglasa. Reads the session itself; a guest's result carries nothing locked. */
export const getReport = createServerFn({ method: 'GET' })
  .validator(z.object({ listingId: z.uuid() }))
  .handler(async ({ data }): Promise<Report | null> => {
    const session = await readSession()
    return loadReport(reportDeps(), session, data.listingId)
  })

export const reportQueryOptions = (listingId: string) =>
  queryOptions({ queryKey: ['report', listingId], queryFn: () => getReport({ data: { listingId } }) })

const listingInput = z.object({ listingId: z.uuid() })
const reviewIdInput = z.object({ reviewId: z.uuid() })

/**
 * Reads the session (null for a guest) and runs the action with it, logging a
 * failure with enough context to debug. The action enforces sign-in itself.
 */
async function withSession<T>(action: string, context: object, run: (session: ReportSession | null) => Promise<T>) {
  const session = await readSession()
  try {
    return await run(session)
  } catch (error) {
    console.error(`[report] ${action} failed`, { userId: session?.userId, ...context, error })
    throw error
  }
}

export const setTrackedFn = createServerFn({ method: 'POST' })
  .validator(listingInput.extend({ tracked: z.boolean() }))
  .handler(({ data }) =>
    withSession('track', data, (session) =>
      data.tracked
        ? trackListing(reportDeps(), session, data.listingId)
        : untrackListing(reportDeps(), session, data.listingId),
    ),
  )

export const claimListingFn = createServerFn({ method: 'POST' })
  .validator(listingInput)
  .handler(({ data }) => withSession('claim', data, (session) => claimListing(reportDeps(), session, data.listingId)))

export const writeReviewFn = createServerFn({ method: 'POST' })
  .validator(
    listingInput.extend({
      stars: z.number().int().min(1).max(5),
      text: z.string().trim().min(1).max(2000),
    }),
  )
  .handler(({ data }) => withSession('review', { listingId: data.listingId }, (session) => writeReview(reportDeps(), session, data)))

export const replyToReviewFn = createServerFn({ method: 'POST' })
  .validator(reviewIdInput.extend({ text: z.string().trim().min(1).max(2000) }))
  .handler(({ data }) =>
    withSession('reply', { reviewId: data.reviewId }, (session) => replyToReview(reportDeps(), session, data)),
  )

export const markHelpfulFn = createServerFn({ method: 'POST' })
  .validator(reviewIdInput)
  .handler(({ data }) => withSession('helpful', data, (session) => markReviewHelpful(reportDeps(), session, data.reviewId)))

export const reportReviewFn = createServerFn({ method: 'POST' })
  .validator(reviewIdInput.extend({ reason: z.string().trim().min(1).max(500) }))
  .handler(({ data }) =>
    withSession('report review', { reviewId: data.reviewId }, (session) => reportReview(reportDeps(), session, data)),
  )

export const setTickFn = createServerFn({ method: 'POST' })
  .validator(listingInput.extend({ itemKey: z.string().min(1).max(48), ticked: z.boolean() }))
  .handler(({ data }) => withSession('tick', data, (session) => setChecklistTick(reportDeps(), session, data)))

/** "Provjeri poruku": the message goes to the extractor and nowhere else. Never stored or logged. */
export const checkMessageFn = createServerFn({ method: 'POST' })
  .validator(z.object({ message: z.string().trim().min(1).max(4000) }))
  .handler(async ({ data }): Promise<PatternResult[]> => {
    try {
      return await checkMessage(checkDeps(), data.message)
    } catch (error) {
      console.error('[report] message check failed', { error: error instanceof Error ? error.name : 'unknown' })
      throw error
    }
  })
