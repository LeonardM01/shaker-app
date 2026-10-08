// The browser extension's API (ADR 0013): plain Request in, Response out, so
// the routes under src/routes/api/extension/v1 stay one line each. Anonymous
// and open to any origin; nothing here reads a session or a cookie.

import { z } from 'zod'

import type { Extractor } from '#/features/check/check-ports'
import type { CheckStore } from '#/features/check/check-store'
import { startCheck } from '#/features/check/run-check'
import { recognizeListingLink } from '#/features/home/link-recognition'
import type {
  ExtensionCheck,
  ExtensionError,
  ExtensionMessageCheck,
  ExtensionReviewPage,
} from '#/features/extension/extension-result'
import { toExtensionReport, toExtensionReview } from '#/features/extension/extension-result'
import { loadCheckProgress, loadReport } from '#/features/report/load-report'
import { checkMessage } from '#/features/report/report-actions'
import type { ReportStore, ReviewCursor } from '#/features/report/report-store'
import type { Marketplace } from '#/lib/listing'

export type ExtensionApiDeps = {
  reportStore: ReportStore
  checkStore: Pick<CheckStore, 'findReusableCheck' | 'createCheck' | 'finishCheck'>
  clock: () => Date
  signPhotoUrl: (photoKey: string) => Promise<string>
  /** Runs the check as a durable workflow (ADR 0006). */
  startWorkflow: (check: { checkId: string; marketplace: Marketplace; canonicalUrl: string }) => Promise<void>
  /**
   * `neon_auth.user.id` of "Anonimni korisnik" (ADR 0014). The extension reads
   * the report as this user, which is what unlocks the full report.
   */
  anonymousUserId: string
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders })
const fail = (error: ExtensionError['error'], status: number) => json({ error } satisfies ExtensionError, status)

const isUuid = (value: string) => z.uuid().safeParse(value).success

/** A JSON body that matches the schema, or null for anything else. */
async function readBody<T>(request: Request, schema: z.ZodType<T>): Promise<T | null> {
  try {
    const parsed = schema.safeParse(await request.json())
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

/**
 * Expected failures are answered by the handler; anything thrown is logged and
 * becomes a 500 that still carries the CORS headers, so the extension can read it.
 */
export async function handle(action: string, context: object, run: () => Promise<Response>): Promise<Response> {
  try {
    return await run()
  } catch (error) {
    console.error(`[extension] ${action} failed`, { ...context, error })
    return fail('internal', 500)
  }
}

/** What reading a check and its report needs. */
type ReadDeps = Pick<ExtensionApiDeps, 'reportStore' | 'clock' | 'signPhotoUrl' | 'anonymousUserId'>

/** The check as the extension sees it; the report once the check completed. */
async function extensionCheck(
  deps: ReadDeps,
  checkId: string,
): Promise<ExtensionCheck | null> {
  const reportDeps = { store: deps.reportStore, signPhotoUrl: deps.signPhotoUrl, now: deps.clock }
  const progress = await loadCheckProgress(reportDeps, checkId)
  if (!progress) return null
  const report =
    progress.status === 'completed' && progress.listing
      ? await loadReport(reportDeps, { userId: deps.anonymousUserId }, progress.listing.listingId)
      : null
  return { checkId, status: progress.status, progress, report: report && toExtensionReport(report) }
}

const checkInput = z.object({ url: z.string().max(2048) })

/** "Otvorio sam oglas": reuses a check from the last 6 hours, joins a running one, or starts one. */
export async function postCheck(deps: ExtensionApiDeps, request: Request): Promise<Response> {
  const input = await readBody(request, checkInput)
  if (!input) return fail('invalid_request', 400)
  if (recognizeListingLink(input.url).kind !== 'recognised') return fail('not_a_listing', 422)
  return handle('check', { url: input.url }, async () => {
    const started = await startCheck({ store: deps.checkStore, clock: deps.clock }, input.url)
    if (!started.reused) {
      try {
        await deps.startWorkflow(started)
      } catch (error) {
        // A check that never started must not block reuse for 6 hours.
        await deps.checkStore.finishCheck(started.checkId, 'failed', deps.clock())
        throw error
      }
    }
    const check = await extensionCheck(deps, started.checkId)
    if (!check) throw new Error(`Check ${started.checkId} vanished`)
    return json(check, check.status === 'running' ? 202 : 200)
  })
}

/** "Provjera u tijeku": polled by the extension until the check is no longer running. */
export function getCheck(deps: ReadDeps, checkId: string): Promise<Response> {
  if (!isUuid(checkId)) return Promise.resolve(fail('not_found', 404))
  return handle('check progress', { checkId }, async () => {
    const check = await extensionCheck(deps, checkId)
    return check ? json(check) : fail('not_found', 404)
  })
}

/** The CORS preflight for every route. */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders })
}

const reviewInput = z.object({
  listingId: z.uuid(),
  /** Generated once per installation and kept in `chrome.storage.local`. */
  installId: z.uuid(),
  stars: z.number().int().min(1).max(5),
  text: z.string().trim().min(1).max(2000),
})

/**
 * A review from the extension (ADR 0014): written as Anonimni korisnik, one per
 * seller per install, and counted like any other real review.
 */
export async function postReview(
  deps: Pick<ExtensionApiDeps, 'reportStore' | 'anonymousUserId'>,
  request: Request,
): Promise<Response> {
  const input = await readBody(request, reviewInput)
  if (!input) return fail('invalid_request', 400)
  return handle('review', { listingId: input.listingId }, async () => {
    const store = deps.reportStore
    const listing = await store.getListing(input.listingId)
    const seller = listing?.sellerId ? await store.getSeller(listing.sellerId) : null
    if (!listing || !seller) return fail('no_seller', 404)
    const created = await store.createReview({
      userId: deps.anonymousUserId,
      installId: input.installId,
      sellerId: seller.id,
      listingId: listing.id,
      stars: input.stars,
      text: input.text,
    })
    return created ? json({ reviewId: created.id }, 201) : fail('already_reviewed', 409)
  })
}

const reviewPageSize = 20

const cursorSchema = z.object({ createdAt: z.iso.datetime(), id: z.uuid() })

const encodeCursor = ({ createdAt, id }: ReviewCursor) =>
  Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id })).toString('base64url')

function decodeCursor(cursor: string): ReviewCursor | null {
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')))
    return parsed.success ? { createdAt: new Date(parsed.data.createdAt), id: parsed.data.id } : null
  } catch {
    return null
  }
}

/** A seller's real reviews, newest first, 20 per page. */
export async function getSellerReviews(
  deps: Pick<ExtensionApiDeps, 'reportStore'>,
  sellerId: string,
  request: Request,
): Promise<Response> {
  if (!isUuid(sellerId)) return fail('not_found', 404)
  const cursor = new URL(request.url).searchParams.get('cursor')
  const before = cursor === null ? undefined : decodeCursor(cursor)
  if (before === null) return fail('invalid_request', 400)
  return handle('reviews', { sellerId }, async () => {
    const seller = await deps.reportStore.getSeller(sellerId)
    if (!seller) return fail('not_found', 404)
    // One extra row says whether there is another page.
    const rows = await deps.reportStore.listReviews(sellerId, {
      includeDemo: false,
      limit: reviewPageSize + 1,
      ...(before && { before }),
    })
    const page = rows.slice(0, reviewPageSize)
    const last = page.at(-1)
    const body: ExtensionReviewPage = {
      reviews: page.map((review) =>
        toExtensionReview({
          id: review.id,
          reviewerName: review.reviewerName,
          createdAt: review.createdAt.toISOString(),
          marketplace: seller.marketplace,
          stars: review.stars,
          listingTitle: review.listingTitle,
          text: review.text,
          verifiedPurchase: false,
          isDemo: false,
          helpfulCount: review.helpfulUserIds.length,
          markedHelpfulByViewer: false,
          reply: review.reply && { text: review.reply.text, createdAt: review.reply.createdAt.toISOString() },
          viewerCanReply: false,
        }),
      ),
      nextCursor: rows.length > reviewPageSize && last ? encodeCursor(last) : null,
    }
    return json(body)
  })
}

const messageInput = z.object({ message: z.string().trim().min(1).max(4000) })

/** "Provjeri poruku": the message goes to the extractor and nowhere else. Never stored or logged. */
export async function postMessageCheck(
  deps: { extractor: Pick<Extractor, 'extractMessage'> },
  request: Request,
): Promise<Response> {
  const input = await readBody(request, messageInput)
  if (!input) return fail('invalid_request', 400)
  return handle('message check', {}, async () => {
    const body: ExtensionMessageCheck = { patterns: await checkMessage(deps, input.message) }
    return json(body)
  })
}
