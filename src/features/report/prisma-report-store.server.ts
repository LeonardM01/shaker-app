import { stepNames } from '#/features/check/check-store'
import type { StepName, StepSummary } from '#/features/check/check-store'
import type { CheckOutcome, WrittenText } from '#/features/check/check-outcome'
import type { ListingFacts } from '#/features/check/listing-facts'
import type { PriceStats } from '#/features/check/scoring/price'
import type { SellerFact } from '#/features/marketplaces/marketplace-reader'
import type {
  ProgressSnapshot,
  ReportCheck,
  ReportStore,
  StoredReviewView,
} from '#/features/report/report-store'
import { Prisma } from '#/generated/prisma/client'
import type { PrismaClient } from '#/generated/prisma/client'
import { marketplaces } from '#/lib/listing'
import type { Marketplace } from '#/lib/listing'

// JSON columns hold values this app wrote itself (check-stages.ts through
// prisma-check-store.server.ts), so they are read back as those types.
const asJson = <T>(value: Prisma.JsonValue | null): T | null => value as T | null

/** `listing_check.comparable_stats`, as prisma-check-store.server.ts writes it. */
type StoredComparableStats = {
  overall: PriceStats | null
  byMarketplace: Partial<Record<Marketplace, PriceStats | null>>
}

type ComparableSqlRow = {
  listing_id: string
  title: string
  marketplace: Marketplace
  city: string | null
  seen_at: Date
  price_cents: number
  canonical_url: string
}

type ReviewSqlRow = {
  id: string
  user_id: string
  reviewer_name: string | null
  created_at: Date
  stars: number
  text: string
  verified_purchase: boolean
  is_demo: boolean
  listing_title: string
  helpful_user_ids: string[]
  reply_text: string | null
  reply_created_at: Date | null
}

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'

export function createPrismaReportStore(db: PrismaClient): ReportStore {
  return {
    async getProgress(checkId) {
      const check = await db.listingCheck.findUnique({
        where: { id: checkId },
        select: {
          id: true,
          canonicalUrl: true,
          marketplace: true,
          status: true,
          steps: { select: { name: true, status: true, errorCode: true, finishedAt: true, summary: true } },
          listing: {
            select: {
              id: true,
              title: true,
              marketplace: true,
              city: true,
              photoKey: true,
              priceCents: true,
              _count: { select: { photos: true } },
            },
          },
        },
      })
      if (!check) return null
      const byName = new Map(check.steps.map((step) => [step.name, step]))
      const steps = Object.fromEntries(
        stepNames.map((name: StepName) => {
          const step = byName.get(name)
          return [
            name,
            {
              status: step?.status ?? 'queued',
              errorCode: step?.errorCode ?? null,
              finishedAt: step?.finishedAt ?? null,
              summary: asJson<StepSummary>(step?.summary ?? null),
            },
          ]
        }),
      ) as ProgressSnapshot['steps']
      const { listing } = check
      return {
        checkId: check.id,
        canonicalUrl: check.canonicalUrl,
        marketplace: check.marketplace,
        status: check.status,
        listing: listing && {
          id: listing.id,
          title: listing.title,
          marketplace: listing.marketplace,
          city: listing.city,
          photoKey: listing.photoKey,
          photoCount: listing._count.photos,
          priceCents: listing.priceCents,
        },
        steps,
      }
    },

    async getListing(listingId) {
      const listing = await db.listing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          marketplace: true,
          title: true,
          canonicalUrl: true,
          city: true,
          neighbourhood: true,
          postedAt: true,
          status: true,
          isDemo: true,
          sellerId: true,
          photos: {
            where: { deletedAt: null },
            orderBy: { position: 'asc' },
            select: { objectKey: true },
          },
        },
      })
      if (!listing) return null
      const { photos, ...rest } = listing
      return { ...rest, photoKeys: photos.map((photo) => photo.objectKey) }
    },

    async getLatestCheck(listingId) {
      const check = await db.listingCheck.findFirst({
        where: { listingId, status: 'completed', checkedAt: { not: null }, offerScore: { not: Prisma.AnyNull } },
        orderBy: { checkedAt: 'desc' },
      })
      if (!check?.checkedAt) return null
      const stats = asJson<StoredComparableStats>(check.comparableStats)
      const byMarketplace = stats?.byMarketplace ?? {}
      const outcome: CheckOutcome = {
        rulesetVersion: check.rulesetVersion ?? '',
        priceCents: check.priceCents,
        priceVerdict: check.priceVerdict ?? check.verdict,
        verdict: check.verdict,
        market: stats?.overall ?? null,
        widened: check.widenedMatch,
        offer: asJson<CheckOutcome['offer']>(check.suggestedOffer),
        offerScore: asJson<CheckOutcome['offerScore']>(check.offerScore) ?? { kind: 'no_data' },
        quality: asJson<CheckOutcome['quality']>(check.listingQuality) ?? { kind: 'no_data' },
        scam: asJson<CheckOutcome['scam']>(check.scamResults) ?? [],
        jev: asJson<CheckOutcome['jev']>(check.jevAnswers) ?? {},
      }
      const questions = asJson<WrittenText['questions']>(check.questions)
      const checklist = asJson<WrittenText['checklist']>(check.checklist)
      const report: ReportCheck = {
        id: check.id,
        checkedAt: check.checkedAt,
        priceCents: check.priceCents,
        outcome,
        statsByMarketplace: Object.fromEntries(
          marketplaces.map((marketplace) => [marketplace, byMarketplace[marketplace] ?? null]),
        ) as ReportCheck['statsByMarketplace'],
        facts: asJson<ListingFacts>(check.facts),
        text:
          check.summary !== null && questions && checklist && check.offerMessage !== null
            ? { summary: check.summary, questions, checklist, offerMessage: check.offerMessage }
            : null,
      }
      return report
    },

    async listComparables(checkId, priceCents, limit) {
      const rows = await db.$queryRaw<ComparableSqlRow[]>`
        SELECT c.comparable_listing_id AS listing_id, l.title, c.marketplace::text AS marketplace,
               l.city, l.seen_at, c.price_cents, l.canonical_url
        FROM listing_comparable c
        JOIN listing l ON l.id = c.comparable_listing_id
        WHERE c.check_id = ${checkId}::uuid
        ORDER BY abs(c.price_cents - coalesce(${priceCents}::int, c.price_cents)), l.seen_at DESC
        LIMIT ${limit}`
      return rows.map((row) => ({
        listingId: row.listing_id,
        title: row.title,
        marketplace: row.marketplace,
        city: row.city,
        seenAt: row.seen_at,
        priceCents: row.price_cents,
        url: row.canonical_url,
      }))
    },

    async getSeller(sellerId) {
      const seller = await db.seller.findUnique({
        where: { id: sellerId },
        select: {
          id: true,
          marketplace: true,
          displayName: true,
          profileUrl: true,
          memberSince: true,
          city: true,
          profileFacts: true,
          claim: { select: { userId: true } },
        },
      })
      if (!seller) return null
      const { profileFacts, claim, ...rest } = seller
      return { ...rest, facts: asJson<SellerFact[]>(profileFacts) ?? [], claimedBy: claim?.userId ?? null }
    },

    async listSellersClaimedBy(userId) {
      const claims = await db.sellerClaim.findMany({
        where: { userId },
        select: { seller: { select: { id: true, marketplace: true } } },
        take: 20,
      })
      return claims.map((claim) => claim.seller)
    },

    async listReviews(sellerId, { includeDemo, limit, before }) {
      // Postgres keeps microseconds and a cursor only milliseconds, so both the
      // order and the cursor compare the time truncated to milliseconds.
      const after = before
        ? Prisma.sql`AND (date_trunc('milliseconds', r.created_at), r.id) < (${before.createdAt}, ${before.id}::uuid)`
        : Prisma.empty
      // Reviewer names are read from neon_auth, never copied into our tables.
      const rows = await db.$queryRaw<ReviewSqlRow[]>`
        SELECT r.id, r.user_id, u.name AS reviewer_name, r.created_at, r.stars, r.text,
               r.verified_purchase, r.is_demo, l.title AS listing_title,
               coalesce(array(SELECT h.user_id FROM review_helpful h WHERE h.review_id = r.id), '{}') AS helpful_user_ids,
               rr.text AS reply_text, rr.created_at AS reply_created_at
        FROM review r
        JOIN listing l ON l.id = r.listing_id
        LEFT JOIN review_reply rr ON rr.review_id = r.id
        LEFT JOIN neon_auth."user" u ON u.id::text = r.user_id
        WHERE r.seller_id = ${sellerId}::uuid
          AND (${includeDemo} OR NOT r.is_demo)
          ${after}
        ORDER BY date_trunc('milliseconds', r.created_at) DESC, r.id DESC
        LIMIT ${limit}`
      return rows.map(
        (row): StoredReviewView => ({
          id: row.id,
          userId: row.user_id,
          reviewerName: row.reviewer_name ?? '',
          createdAt: row.created_at,
          stars: row.stars,
          text: row.text,
          verifiedPurchase: row.verified_purchase,
          isDemo: row.is_demo,
          listingTitle: row.listing_title,
          helpfulUserIds: row.helpful_user_ids,
          reply:
            row.reply_text !== null && row.reply_created_at !== null
              ? { text: row.reply_text, createdAt: row.reply_created_at }
              : null,
        }),
      )
    },

    async reviewStats(sellerId) {
      const stats = await db.review.aggregate({
        where: { sellerId, isDemo: false },
        _count: { _all: true },
        _avg: { stars: true },
      })
      return { count: stats._count._all, averageStars: stats._avg.stars ?? 0 }
    },

    async hasReviewed(userId, sellerId) {
      return (await db.review.count({ where: { userId, sellerId } })) > 0
    },

    async isTracked(userId, listingId) {
      return (await db.trackedListing.count({ where: { userId, listingId } })) > 0
    },

    async listTicks(userId, listingId) {
      const ticks = await db.checklistTick.findMany({
        where: { userId, listingId },
        select: { itemKey: true },
        take: 50,
      })
      return ticks.map((tick) => tick.itemKey)
    },

    async track(userId, listingId) {
      await db.trackedListing.upsert({
        where: { userId_listingId: { userId, listingId } },
        create: { userId, listingId },
        update: {},
      })
    },

    async untrack(userId, listingId) {
      await db.trackedListing.deleteMany({ where: { userId, listingId } })
    },

    async claimSeller(userId, sellerId) {
      try {
        await db.sellerClaim.create({ data: { userId, sellerId } })
        return { claimedBy: userId }
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
        const claim = await db.sellerClaim.findUniqueOrThrow({ where: { sellerId }, select: { userId: true } })
        return { claimedBy: claim.userId }
      }
    },

    async createReview(review) {
      try {
        return await db.review.create({ data: review, select: { id: true } })
      } catch (error) {
        if (isUniqueViolation(error)) return null
        throw error
      }
    },

    async getReview(reviewId) {
      const review = await db.review.findUnique({
        where: { id: reviewId },
        select: { id: true, sellerId: true, userId: true, reply: { select: { id: true } } },
      })
      if (!review) return null
      return { id: review.id, sellerId: review.sellerId, userId: review.userId, hasReply: review.reply !== null }
    },

    async createReply(reply) {
      try {
        await db.reviewReply.create({ data: reply })
        return true
      } catch (error) {
        if (isUniqueViolation(error)) return false
        throw error
      }
    },

    async markHelpful(reviewId, userId) {
      await db.reviewHelpful.upsert({
        where: { reviewId_userId: { reviewId, userId } },
        create: { reviewId, userId },
        update: {},
      })
    },

    async reportReview({ reviewId, userId, reason }) {
      await db.reviewReport.upsert({
        where: { reviewId_userId: { reviewId, userId } },
        create: { reviewId, userId, reason },
        update: { reason },
      })
    },

    async setTick({ userId, listingId, itemKey, ticked }) {
      if (ticked) {
        await db.checklistTick.upsert({
          where: { userId_listingId_itemKey: { userId, listingId, itemKey } },
          create: { userId, listingId, itemKey },
          update: {},
        })
      } else {
        await db.checklistTick.deleteMany({ where: { userId, listingId, itemKey } })
      }
    },
  }
}
