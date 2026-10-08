import { offerPlaceholder } from '#/features/check/check-outcome'
import { marketOf } from '#/features/check/scoring/price'
import type {
  CheckProgress,
  OfferSection,
  PriceSection,
  ProgressRow,
  Report,
  ReviewItem,
  SellerSection,
} from '#/features/report/report-result'
import type { ReportCheck, ReportListing, ReportStore, ProgressSnapshot } from '#/features/report/report-store'
import { formatPrice } from '#/lib/format'
import { initialsOf } from '#/lib/initials'
import { marketplaces } from '#/lib/listing'

/** The signed-in user as the server read it from the session; null for a guest. */
export type ReportSession = { userId: string }

export type ReportDeps = {
  store: ReportStore
  now: () => Date
  /** A short-lived URL for a private listing photo. */
  signPhotoUrl: (photoKey: string) => Promise<string>
}

/**
 * Every comparable price feeds the range bar's dots, for guests too: the
 * guest design shows the full bar. What the lock withholds is each
 * comparable's title, place and link, and the offer.
 */
const dotLimit = 600
/** "Prikaži sve" lists at most this many. */
const signedInComparableLimit = 100
const reviewLimit = 20

/** "Možeš uštedjeti oko 50 €": rounded, so it reads as an estimate. */
function approximateSaving(savingCents: number): number {
  const step = savingCents >= 10_00 ? 10_00 : 1_00
  return Math.max(step, Math.round(savingCents / step) * step)
}


function offerSection(check: ReportCheck, session: ReportSession | null): OfferSection {
  const offer = check.outcome.offer
  if (!offer) return { kind: 'none' }
  if (!session) return { kind: 'locked', approxSavingCents: approximateSaving(offer.savingCents) }
  const template = check.text?.offerMessage ?? null
  return {
    kind: 'unlocked',
    offerCents: offer.offerCents,
    savingCents: offer.savingCents,
    savingPercent: offer.savingPercent,
    message: template?.replace(offerPlaceholder, formatPrice(offer.offerCents)) ?? null,
  }
}

async function priceSection(
  store: ReportStore,
  check: ReportCheck,
  session: ReportSession | null,
): Promise<PriceSection> {
  const market = marketOf(check.outcome.market)
  const rows = await store.listComparables(check.id, check.priceCents, dotLimit)
  const visible = session ? rows.slice(0, signedInComparableLimit) : rows.slice(0, 1)
  return {
    market,
    comparableCount: check.outcome.market?.count ?? 0,
    priceDiffPercent:
      market && check.priceCents !== null
        ? Math.round((check.priceCents / market.medianCents - 1) * 100)
        : null,
    widened: check.outcome.widened,
    byMarketplace: marketplaces.map((marketplace) => {
      const stats = check.statsByMarketplace[marketplace]
      return {
        marketplace,
        count: stats?.count ?? 0,
        // A per-marketplace median only once there is a market at all.
        medianCents: market && stats ? stats.medianCents : null,
      }
    }),
    dots: rows.map((row) => row.priceCents),
    comparables: visible.map((row) => ({
      listingId: row.listingId,
      title: row.title,
      marketplace: row.marketplace,
      city: row.city,
      seenAt: row.seenAt.toISOString(),
      priceCents: row.priceCents,
      url: row.url,
    })),
  }
}

async function sellerAndReviews(
  store: ReportStore,
  listing: ReportListing,
  session: ReportSession | null,
): Promise<{ seller: SellerSection | null; reviews: ReviewItem[]; viewerCanReview: boolean }> {
  const seller = listing.sellerId ? await store.getSeller(listing.sellerId) : null
  if (!seller) return { seller: null, reviews: [], viewerCanReview: false }

  const [stored, stats, sameOwner, viewerReviewed] = await Promise.all([
    store.listReviews(seller.id, { includeDemo: listing.isDemo, limit: reviewLimit }),
    store.reviewStats(seller.id),
    seller.claimedBy ? store.listSellersClaimedBy(seller.claimedBy) : Promise.resolve([]),
    session ? store.hasReviewed(session.userId, seller.id) : Promise.resolve(false),
  ])
  const claimedByViewer = session !== null && seller.claimedBy === session.userId
  const shown = listing.isDemo
    ? {
        count: stored.length,
        averageStars:
          stored.length === 0 ? 0 : stored.reduce((sum, review) => sum + review.stars, 0) / stored.length,
      }
    : stats

  return {
    seller: {
      sellerId: seller.id,
      displayName: seller.displayName,
      initials: initialsOf(seller.displayName),
      marketplace: seller.marketplace,
      profileUrl: seller.profileUrl,
      memberSince: seller.memberSince?.toISOString() ?? null,
      city: seller.city,
      facts: seller.facts,
      reviewCount: shown.count,
      averageStars: shown.count === 0 ? null : Math.round(shown.averageStars * 10) / 10,
      sameOwnerOn: [
        ...new Set(
          sameOwner
            .filter((other) => other.id !== seller.id && other.marketplace !== seller.marketplace)
            .map((other) => other.marketplace),
        ),
      ],
      claimedByViewer,
      claimable: seller.claimedBy === null,
    },
    reviews: stored.map((review) => ({
      id: review.id,
      reviewerName: review.reviewerName,
      createdAt: review.createdAt.toISOString(),
      marketplace: seller.marketplace,
      stars: review.stars,
      listingTitle: review.listingTitle,
      text: review.text,
      verifiedPurchase: review.isDemo && review.verifiedPurchase,
      isDemo: review.isDemo,
      helpfulCount: review.helpfulUserIds.length,
      markedHelpfulByViewer: session !== null && review.helpfulUserIds.includes(session.userId),
      reply: review.reply && { text: review.reply.text, createdAt: review.reply.createdAt.toISOString() },
      viewerCanReply: claimedByViewer && review.reply === null,
    })),
    viewerCanReview: session !== null && !claimedByViewer && !viewerReviewed,
  }
}

/**
 * Builds the report for one listing from its newest finished check. A guest
 * gets no offer amount, no offer message and one comparable; nothing locked
 * reaches them through another field either.
 */
export async function loadReport(
  deps: ReportDeps,
  session: ReportSession | null,
  listingId: string,
): Promise<Report | null> {
  const { store } = deps
  const [listing, check] = await Promise.all([store.getListing(listingId), store.getLatestCheck(listingId)])
  if (!listing || !check) return null

  const [price, people, photoUrls, tracked, ticks] = await Promise.all([
    priceSection(store, check, session),
    sellerAndReviews(store, listing, session),
    Promise.all(listing.photoKeys.map(deps.signPhotoUrl)),
    session ? store.isTracked(session.userId, listing.id) : Promise.resolve(null),
    session ? store.listTicks(session.userId, listing.id) : Promise.resolve([]),
  ])
  const { outcome, facts, text } = check
  const hasRiskEvidence = outcome.scam.some((result) => result.status === 'fired')

  return {
    now: deps.now().toISOString(),
    viewer: { signedIn: session !== null },
    listing: {
      id: listing.id,
      title: listing.title,
      marketplace: listing.marketplace,
      url: listing.canonicalUrl,
      city: listing.city,
      neighbourhood: listing.neighbourhood,
      postedAt: listing.postedAt?.toISOString() ?? null,
      photoUrls,
      priceCents: check.priceCents,
      removed: listing.status === 'removed',
      isDemo: listing.isDemo,
    },
    checkedAt: check.checkedAt.toISOString(),
    // Red never appears without its evidence: a risk verdict without any
    // shows as unknown instead.
    verdict: outcome.verdict === 'risk' && !hasRiskEvidence ? 'no_data' : outcome.verdict,
    summary: text?.summary ?? null,
    offerScore: outcome.offerScore,
    quality: outcome.quality,
    findings: facts && {
      missing: facts.missingFacts,
      contradictions: facts.contradictions,
      confirmed: facts.confirmedFacts,
    },
    price,
    scam: outcome.scam,
    seller: people.seller,
    reviews: people.reviews,
    viewerCanReview: people.viewerCanReview,
    questions: text?.questions ?? [],
    checklist: text?.checklist ?? [],
    ticks,
    offer: offerSection(check, session),
    tracked,
  }
}

const iso = (date: Date | null) => date?.toISOString() ?? null

/** "Oglas pročitan" covers reading and extraction; "Pitanja" covers scoring and writing. */
function combined(
  steps: ProgressSnapshot['steps'],
  names: readonly (keyof ProgressSnapshot['steps'])[],
): { status: ProgressRow['status']; errorCode: string | null; finishedAt: string | null } {
  const parts = names.map((name) => steps[name])
  const failed = parts.find((part) => part.status === 'failed')
  if (failed) return { status: 'failed', errorCode: failed.errorCode, finishedAt: iso(failed.finishedAt) }
  if (parts.every((part) => part.status === 'done')) {
    return { status: 'done', errorCode: null, finishedAt: iso(parts.at(-1)?.finishedAt ?? null) }
  }
  if (parts.some((part) => part.status === 'skipped')) return { status: 'skipped', errorCode: null, finishedAt: null }
  if (parts.some((part) => part.status !== 'queued')) return { status: 'running', errorCode: null, finishedAt: null }
  return { status: 'queued', errorCode: null, finishedAt: null }
}

/** "Provjera u tijeku": the rows the buyer watches, and the listing once it is read. */
export async function loadCheckProgress(
  deps: Pick<ReportDeps, 'store' | 'signPhotoUrl'>,
  checkId: string,
): Promise<CheckProgress | null> {
  const snapshot = await deps.store.getProgress(checkId)
  if (!snapshot) return null
  const { steps, listing } = snapshot
  const rows: ProgressRow[] = [
    { key: 'read', ...combined(steps, ['read', 'extract']) },
    ...marketplaces.map((marketplace): ProgressRow => {
      const step = steps[`comparables_${marketplace}`]
      return {
        key: 'comparables',
        marketplace,
        status: step.status,
        errorCode: step.errorCode,
        finishedAt: iso(step.finishedAt),
        comparableCount: step.summary?.comparableCount ?? null,
      }
    }),
    { key: 'scam', ...combined(steps, ['scam']) },
    { key: 'seller', ...combined(steps, ['seller']) },
    { key: 'questions', ...combined(steps, ['score', 'write']) },
  ]
  return {
    checkId: snapshot.checkId,
    canonicalUrl: snapshot.canonicalUrl,
    marketplace: snapshot.marketplace,
    status: snapshot.status,
    listing: listing && {
      listingId: listing.id,
      title: listing.title,
      marketplace: listing.marketplace,
      city: listing.city,
      photoUrl: listing.photoKey ? await deps.signPhotoUrl(listing.photoKey) : null,
      photoCount: listing.photoCount,
      priceCents: listing.priceCents,
    },
    rows,
  }
}
