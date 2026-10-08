import { stepNames } from '#/features/check/check-store'
import { InMemoryCheckStore } from '#/features/check/testing/in-memory-check-store'
import type {
  ProgressSnapshot,
  ReportCheck,
  ReportStore,
  StoredComparable,
  StoredReviewView,
} from '#/features/report/report-store'
import { marketplaces } from '#/lib/listing'
import type { Marketplace } from '#/lib/listing'

/**
 * The check pipeline's tables plus the report's own (claims, replies,
 * helpful marks, reports, ticks, tracking), in memory.
 */
export class InMemoryReportStore extends InMemoryCheckStore implements ReportStore {
  readonly userNames = new Map<string, string>()
  claims: { userId: string; sellerId: string }[] = []
  replies: { reviewId: string; userId: string; text: string; createdAt: Date }[] = []
  helpful: { reviewId: string; userId: string }[] = []
  reports: { reviewId: string; userId: string; reason: string }[] = []
  ticks: { userId: string; listingId: string; itemKey: string }[] = []
  tracked: { userId: string; listingId: string }[] = []
  now = new Date(0)

  getProgress = (checkId: string): Promise<ProgressSnapshot | null> => {
    const check = this.checks.get(checkId)
    if (!check) return Promise.resolve(null)
    const listing = check.listingId ? this.listings.get(check.listingId) : undefined
    const steps = this.stepsOf(checkId)
    return Promise.resolve({
      checkId,
      canonicalUrl: check.canonicalUrl,
      marketplace: check.marketplace,
      status: check.status,
      listing: listing
        ? {
            id: listing.id,
            title: listing.title,
            marketplace: listing.marketplace,
            city: listing.city,
            photoKey: listing.photoKey,
            photoCount: this.photos.filter((photo) => photo.listingId === listing.id).length,
            priceCents: listing.priceCents,
          }
        : null,
      steps: Object.fromEntries(
        stepNames.map((name) => {
          const step = steps[name]
          return [
            name,
            {
              status: step.status,
              errorCode: step.errorCode,
              finishedAt: step.finishedAt,
              summary: step.summary,
            },
          ]
        }),
      ) as ProgressSnapshot['steps'],
    })
  }

  getListing = (listingId: string) => {
    const listing = this.listings.get(listingId)
    if (!listing) return Promise.resolve(null)
    return Promise.resolve({
      id: listing.id,
      marketplace: listing.marketplace,
      title: listing.title,
      canonicalUrl: listing.canonicalUrl,
      city: listing.city,
      neighbourhood: listing.neighbourhood,
      postedAt: listing.postedAt,
      status: listing.status,
      isDemo: listing.isDemo,
      sellerId: listing.sellerId,
      photoKeys: this.photos
        .filter((photo) => photo.listingId === listingId && !photo.deletedAt)
        .sort((a, b) => a.position - b.position)
        .map((photo) => photo.objectKey),
    })
  }

  getLatestCheck = (listingId: string): Promise<ReportCheck | null> => {
    const [check] = [...this.checks.values()]
      .filter((candidate) => candidate.listingId === listingId && candidate.status === 'completed' && candidate.outcome)
      .sort((a, b) => (b.finishedAt?.getTime() ?? 0) - (a.finishedAt?.getTime() ?? 0))
    if (!check?.outcome || !check.finishedAt) return Promise.resolve(null)
    const byMarketplace = check.comparables?.byMarketplace
    return Promise.resolve({
      id: check.id,
      checkedAt: check.finishedAt,
      priceCents: check.outcome.priceCents,
      outcome: check.outcome,
      statsByMarketplace: Object.fromEntries(
        marketplaces.map((marketplace) => [marketplace, byMarketplace?.[marketplace].stats ?? null]),
      ) as Record<Marketplace, ReportCheck['statsByMarketplace'][Marketplace]>,
      facts: check.facts,
      text: check.text,
    })
  }

  listComparables = (checkId: string, priceCents: number | null, limit: number) => {
    const check = this.check(checkId)
    const rows: StoredComparable[] = Object.values(check.comparables?.byMarketplace ?? {}).flatMap(
      (entry) =>
        entry.comparables.map((row) => ({
          listingId: row.listingId,
          title: row.title,
          marketplace: row.marketplace,
          city: row.city,
          seenAt: row.seenAt,
          priceCents: row.priceCents,
          url: row.url,
        })),
    )
    const distance = (row: StoredComparable) => Math.abs(row.priceCents - (priceCents ?? row.priceCents))
    return Promise.resolve(rows.sort((a, b) => distance(a) - distance(b)).slice(0, limit))
  }

  getSeller = (sellerId: string) => {
    const seller = this.sellers.get(sellerId)
    if (!seller) return Promise.resolve(null)
    return Promise.resolve({
      id: seller.id,
      marketplace: seller.marketplace,
      displayName: seller.displayName,
      profileUrl: seller.profileUrl,
      memberSince: seller.profile?.memberSince ?? null,
      city: seller.profile?.city ?? null,
      facts: seller.profile?.facts ?? [],
      claimedBy: this.claims.find((claim) => claim.sellerId === sellerId)?.userId ?? null,
    })
  }

  listSellersClaimedBy = (userId: string) =>
    Promise.resolve(
      this.claims.flatMap((claim) => {
        const seller = claim.userId === userId ? this.sellers.get(claim.sellerId) : undefined
        return seller ? [{ id: seller.id, marketplace: seller.marketplace }] : []
      }),
    )

  listReviews: ReportStore['listReviews'] = (sellerId, { includeDemo, limit, before }) => {
    const newestFirst = (a: { createdAt: Date; id: string }, b: { createdAt: Date; id: string }) =>
      b.createdAt.getTime() - a.createdAt.getTime() || (b.id < a.id ? -1 : b.id > a.id ? 1 : 0)
    return Promise.resolve(
      this.reviews
        .filter((review) => review.sellerId === sellerId && (includeDemo || !review.isDemo))
        .filter((review) => !before || newestFirst(before, review) < 0)
        .sort(newestFirst)
        .slice(0, limit)
        .map((review): StoredReviewView => {
          const reply = this.replies.find((candidate) => candidate.reviewId === review.id)
          return {
            id: review.id,
            userId: review.userId,
            reviewerName: this.userNames.get(review.userId) ?? 'Kupac',
            createdAt: review.createdAt,
            stars: review.stars,
            text: review.text,
            verifiedPurchase: review.verifiedPurchase,
            isDemo: review.isDemo,
            listingTitle: this.listings.get(review.listingId)?.title ?? '',
            helpfulUserIds: this.helpful
              .filter((mark) => mark.reviewId === review.id)
              .map((mark) => mark.userId),
            reply: reply ? { text: reply.text, createdAt: reply.createdAt } : null,
          }
        }),
    )
  }

  listTrackedForRecheck = () =>
    Promise.resolve(
      [...new Set(this.tracked.map((link) => link.listingId))].flatMap((listingId) => {
        const listing = this.listings.get(listingId)
        const [latest] = [...this.checks.values()]
          .filter((check) => check.listingId === listingId)
          .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        return listing?.status === 'active' && latest ? [{ listingId, canonicalUrl: latest.canonicalUrl }] : []
      }),
    )

  hasReviewed = (userId: string, sellerId: string) =>
    Promise.resolve(this.reviews.some((review) => review.userId === userId && review.sellerId === sellerId))

  isTracked = (userId: string, listingId: string) =>
    Promise.resolve(this.tracked.some((link) => link.userId === userId && link.listingId === listingId))

  listTicks = (userId: string, listingId: string) =>
    Promise.resolve(
      this.ticks
        .filter((tick) => tick.userId === userId && tick.listingId === listingId)
        .map((tick) => tick.itemKey),
    )

  track = async (userId: string, listingId: string) => {
    if (!(await this.isTracked(userId, listingId))) this.tracked.push({ userId, listingId })
  }

  untrack = (userId: string, listingId: string) => {
    this.tracked = this.tracked.filter((link) => !(link.userId === userId && link.listingId === listingId))
    return Promise.resolve()
  }

  claimSeller = (userId: string, sellerId: string) => {
    const existing = this.claims.find((claim) => claim.sellerId === sellerId)
    if (existing) return Promise.resolve({ claimedBy: existing.userId })
    this.claims.push({ userId, sellerId })
    return Promise.resolve({ claimedBy: userId })
  }

  createReview = ({ installId: given, ...input }: Parameters<ReportStore['createReview']>[0]) => {
    const installId = given ?? null
    // The unique (user_id, seller_id, install_id) NULLS NOT DISTINCT of ADR 0014.
    const taken = this.reviews.some(
      (review) =>
        review.userId === input.userId && review.sellerId === input.sellerId && review.installId === installId,
    )
    if (taken) return Promise.resolve(null)
    const review = this.addReview({ ...input, installId, createdAt: this.now })
    return Promise.resolve({ id: review.id })
  }

  getReview = (reviewId: string) => {
    const review = this.reviews.find((candidate) => candidate.id === reviewId)
    if (!review) return Promise.resolve(null)
    return Promise.resolve({
      id: review.id,
      sellerId: review.sellerId,
      userId: review.userId,
      hasReply: this.replies.some((reply) => reply.reviewId === reviewId),
    })
  }

  createReply = (input: { reviewId: string; userId: string; text: string }) => {
    if (this.replies.some((reply) => reply.reviewId === input.reviewId)) return Promise.resolve(false)
    this.replies.push({ ...input, createdAt: this.now })
    return Promise.resolve(true)
  }

  markHelpful = (reviewId: string, userId: string) => {
    if (!this.helpful.some((mark) => mark.reviewId === reviewId && mark.userId === userId)) {
      this.helpful.push({ reviewId, userId })
    }
    return Promise.resolve()
  }

  reportReview = (input: { reviewId: string; userId: string; reason: string }) => {
    if (!this.reports.some((report) => report.reviewId === input.reviewId && report.userId === input.userId)) {
      this.reports.push(input)
    }
    return Promise.resolve()
  }

  setTick = ({ userId, listingId, itemKey, ticked }: { userId: string; listingId: string; itemKey: string; ticked: boolean }) => {
    this.ticks = this.ticks.filter(
      (tick) => !(tick.userId === userId && tick.listingId === listingId && tick.itemKey === itemKey),
    )
    if (ticked) this.ticks.push({ userId, listingId, itemKey })
    return Promise.resolve()
  }
}
