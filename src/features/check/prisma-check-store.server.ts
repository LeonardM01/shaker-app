import { stepNames } from '#/features/check/check-store'
import type { CheckStore, ComparableRow } from '#/features/check/check-store'
import { toSignedPhash } from '#/features/check/photos/phash-storage'
import { normalizeTitle } from '#/features/check/scoring/comparables'
import { offerScoreRules } from '#/features/check/scoring/offer-score'
import { samePhotoMaxDistance } from '#/features/check/photos/phash'
import { scamPatterns } from '#/features/check/scoring/scam'
import type { PatternResult } from '#/features/check/scoring/scam'
import type { Prisma, PrismaClient } from '#/generated/prisma/client'
import type { Marketplace } from '#/lib/listing'

/** Our own values as JSON: dates become ISO strings, `undefined` drops out. */
function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

/** Most comparables a single query returns; stats don't need more. */
const comparableLimit = 200

const strengthOrder = { strong: 0, medium: 1, weak: 2 } as const

/** The pattern the watchlist row shows: strongest first, then catalogue order. */
function headlineEvidence(results: readonly PatternResult[]) {
  const fired = results
    .filter((result) => result.status === 'fired')
    .sort(
      (a, b) =>
        strengthOrder[a.strength] - strengthOrder[b.strength] ||
        scamPatterns.findIndex((pattern) => pattern.code === a.code) -
          scamPatterns.findIndex((pattern) => pattern.code === b.code),
    )
  const first = fired[0]
  if (first?.status !== 'fired') return { riskEvidenceKind: null, riskEvidenceCount: null }
  return {
    riskEvidenceKind: first.code,
    riskEvidenceCount:
      first.evidence.kind === 'duplicate_photo' ? first.evidence.otherListingCount : null,
  }
}

type ComparableSqlRow = {
  id: string
  marketplace: Marketplace
  title: string
  price_cents: number
  city: string | null
  canonical_url: string
  seen_at: Date
}

export function createPrismaCheckStore(db: PrismaClient): CheckStore {
  return {
    async findReusableCheck(canonicalUrl, since) {
      const check = await db.listingCheck.findFirst({
        where: {
          canonicalUrl,
          OR: [
            { status: 'completed', startedAt: { gte: since.completed } },
            { status: 'running', startedAt: { gte: since.running } },
          ],
        },
        orderBy: { startedAt: 'desc' },
        select: { id: true },
      })
      return check?.id ?? null
    },

    async createCheck({ canonicalUrl, marketplace, startedAt }) {
      const check = await db.listingCheck.create({
        data: {
          canonicalUrl,
          marketplace,
          startedAt,
          steps: { createMany: { data: stepNames.map((name) => ({ name })) } },
        },
        select: { id: true },
      })
      return check.id
    },

    async setStep(checkId, name, update) {
      const fields =
        update.status === 'running'
          ? { status: update.status, startedAt: update.at, finishedAt: null, errorCode: null }
          : {
              status: update.status,
              finishedAt: update.at,
              errorCode: update.status === 'failed' ? update.errorCode : null,
              ...(update.status === 'done' && update.summary ? { summary: json(update.summary) } : {}),
            }
      await db.checkStep.update({ where: { checkId_name: { checkId, name } }, data: fields })
    },

    async saveListing(checkId, marketplace, scraped, seenAt) {
      return db.$transaction(async (tx) => {
        const seller = scraped.seller
          ? await tx.seller.upsert({
              where: { marketplace_externalId: { marketplace, externalId: scraped.seller.externalId } },
              create: {
                marketplace,
                externalId: scraped.seller.externalId,
                displayName: scraped.seller.displayName,
                profileUrl: scraped.seller.profileUrl,
              },
              update: { displayName: scraped.seller.displayName, profileUrl: scraped.seller.profileUrl },
              select: { id: true },
            })
          : null
        const fields = {
          kind: 'checked' as const,
          canonicalUrl: scraped.canonicalUrl,
          title: scraped.title,
          normalizedTitle: normalizeTitle(scraped.title),
          description: scraped.description,
          city: scraped.city,
          neighbourhood: scraped.neighbourhood,
          priceCents: scraped.priceCents,
          seenAt,
          postedAt: scraped.postedAt,
          sellerId: seller?.id ?? null,
          status: 'active' as const,
          removedAt: null,
        }
        const listing = await tx.listing.upsert({
          where: { marketplace_externalId: { marketplace, externalId: scraped.externalId } },
          create: { marketplace, externalId: scraped.externalId, ...fields },
          update: fields,
          select: { id: true },
        })
        await tx.listingCheck.update({
          where: { id: checkId },
          data: { listingId: listing.id, priceCents: scraped.priceCents },
        })
        return { listingId: listing.id, sellerId: seller?.id ?? null }
      })
    },

    async markRemoved(checkId, at) {
      const check = await db.listingCheck.findUniqueOrThrow({
        where: { id: checkId },
        select: { canonicalUrl: true },
      })
      // The listing an earlier check of the same link read, if any.
      const earlier = await db.listingCheck.findFirst({
        where: { canonicalUrl: check.canonicalUrl, listingId: { not: null } },
        orderBy: { startedAt: 'desc' },
        select: { listingId: true },
      })
      await db.$transaction([
        ...(earlier?.listingId
          ? [
              db.listing.update({
                where: { id: earlier.listingId },
                data: { status: 'removed', removedAt: at },
              }),
            ]
          : []),
        db.listingCheck.update({
          where: { id: checkId },
          data: { status: 'removed', checkedAt: at, listingId: earlier?.listingId ?? null },
        }),
      ])
    },

    async savePhotos(listingId, photos) {
      const kept = new Set(photos.map((photo) => photo.objectKey))
      const previous = await db.listingPhoto.findMany({
        where: { listingId, deletedAt: null },
        select: { objectKey: true },
      })
      await db.$transaction([
        db.listingPhoto.deleteMany({ where: { listingId } }),
        db.listingPhoto.createMany({
          data: photos.map((photo) => ({
            listingId,
            position: photo.position,
            objectKey: photo.objectKey,
            phash: toSignedPhash(photo.phash),
          })),
        }),
        db.listing.update({ where: { id: listingId }, data: { photoKey: photos[0]?.objectKey ?? null } }),
      ])
      return previous.map((photo) => photo.objectKey).filter((key) => !kept.has(key))
    },

    async countDuplicatePhotoListings({ listingId, sellerId, phashes }) {
      if (phashes.length === 0) return 0
      // Hamming distance on 64-bit pHashes. A full scan for now; deleted
      // photos keep their hash, so they still count.
      const [row] = await db.$queryRaw<{ count: number }[]>`
        SELECT count(DISTINCT p.listing_id)::int AS count
        FROM listing_photo p
        JOIN listing l ON l.id = p.listing_id
        WHERE p.listing_id <> ${listingId}::uuid
          AND (${sellerId}::uuid IS NULL OR l.seller_id IS DISTINCT FROM ${sellerId}::uuid)
          AND EXISTS (
            SELECT 1 FROM unnest(${phashes.map(toSignedPhash)}::bigint[]) AS h(hash)
            WHERE bit_count((p.phash # h.hash)::bit(64)) <= ${samePhotoMaxDistance}
          )`
      return row?.count ?? 0
    },

    async saveFacts(checkId, listingId, facts) {
      await db.$transaction([
        db.listingCheck.update({ where: { id: checkId }, data: { facts: json(facts) } }),
        db.listing.update({
          where: { id: listingId },
          data: { category: facts.category, searchKey: facts.searchKey },
        }),
      ])
    },

    async findComparables(query) {
      // Tokens are [a-z0-9] only (normalizeTitle), so they carry no LIKE wildcards.
      const required = query.tokens.map((token) => `% ${token} %`)
      const excluded = query.exclusions.map((word) => `% ${word} %`)
      const rows = await db.$queryRaw<ComparableSqlRow[]>`
        SELECT l.id, l.marketplace::text AS marketplace, l.title, l.price_cents, l.city,
               l.canonical_url, l.seen_at
        FROM listing l
        WHERE l.marketplace = ${query.marketplace}::marketplace
          AND l.category = ${query.category}::listing_category
          AND l.id <> ${query.excludeListingId}::uuid
          AND l.status = 'active'
          AND NOT l.is_demo
          AND l.price_cents IS NOT NULL
          AND l.seen_at >= ${query.seenSince}
          AND l.normalized_title LIKE ALL (${required}::text[])
          AND NOT (l.normalized_title LIKE ANY (${excluded}::text[]))
        ORDER BY l.seen_at DESC
        LIMIT ${comparableLimit}`
      return rows.map(
        (row): ComparableRow => ({
          listingId: row.id,
          marketplace: row.marketplace,
          title: row.title,
          priceCents: row.price_cents,
          city: row.city,
          url: row.canonical_url,
          seenAt: row.seen_at,
        }),
      )
    },

    async saveObservations({ marketplace, category, results, seenAt }) {
      // A listing someone already checked keeps its kind and category; only
      // its last seen price moves.
      await db.$transaction(
        results.map((result) =>
          db.listing.upsert({
            where: { marketplace_externalId: { marketplace, externalId: result.externalId } },
            create: {
              marketplace,
              externalId: result.externalId,
              kind: 'observation',
              canonicalUrl: result.url,
              title: result.title,
              normalizedTitle: normalizeTitle(result.title),
              category,
              city: result.city,
              priceCents: result.priceCents,
              postedAt: result.postedAt,
              seenAt,
            },
            update: { priceCents: result.priceCents, seenAt },
          }),
        ),
      )
    },

    async saveSellerProfile(sellerId, profile, scrapedAt) {
      await db.seller.update({
        where: { id: sellerId },
        data: {
          displayName: profile.displayName,
          profileUrl: profile.profileUrl,
          memberSince: profile.memberSince,
          city: profile.city,
          profileFacts: json(profile.facts),
          lastScrapedAt: scrapedAt,
        },
      })
    },

    async reviewStats(sellerId) {
      const stats = await db.review.aggregate({
        where: { sellerId, isDemo: false },
        _count: { _all: true },
        _avg: { stars: true },
      })
      return { count: stats._count._all, averageStars: stats._avg.stars ?? 0 }
    },

    async platformAverageStars() {
      const stats = await db.review.aggregate({ where: { isDemo: false }, _avg: { stars: true } })
      return stats._avg.stars ?? offerScoreRules.defaultPlatformAverageStars
    },

    async saveOutcome(checkId, outcome, snapshot) {
      const comparables = Object.values(snapshot.byMarketplace).flatMap((entry) => entry.comparables)
      const statsByMarketplace = Object.fromEntries(
        Object.entries(snapshot.byMarketplace).map(([marketplace, entry]) => [marketplace, entry.stats]),
      )
      await db.$transaction([
        db.listingCheck.update({
          where: { id: checkId },
          data: {
            priceCents: outcome.priceCents,
            verdict: outcome.verdict,
            priceVerdict: outcome.priceVerdict,
            marketAverageCents: outcome.market?.medianCents ?? null,
            comparableCount: outcome.market?.count ?? 0,
            ...headlineEvidence(outcome.scam),
            rulesetVersion: outcome.rulesetVersion,
            widenedMatch: outcome.widened,
            comparableStats: json({ overall: outcome.market, byMarketplace: statsByMarketplace }),
            offerScore: json(outcome.offerScore),
            listingQuality: json(outcome.quality),
            ...(outcome.offer ? { suggestedOffer: json(outcome.offer) } : {}),
            scamResults: json(outcome.scam),
            jevAnswers: json(outcome.jev),
          },
        }),
        db.listingComparable.deleteMany({ where: { checkId } }),
        db.listingComparable.createMany({
          data: comparables.map((row) => ({
            checkId,
            comparableListingId: row.listingId,
            marketplace: row.marketplace,
            priceCents: row.priceCents,
          })),
        }),
      ])
    },

    async saveText(checkId, text) {
      await db.listingCheck.update({
        where: { id: checkId },
        data: {
          summary: text.summary,
          questions: json(text.questions),
          checklist: json(text.checklist),
          offerMessage: text.offerMessage,
        },
      })
    },

    async finishCheck(checkId, status, at) {
      await db.listingCheck.update({ where: { id: checkId }, data: { status, checkedAt: at } })
    },
  }
}
