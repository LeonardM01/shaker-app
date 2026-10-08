// The stages of a check. Each one owns its step's status row and turns its
// own failure into a failed (or skipped) step, so one failure never takes the
// other steps down. Inputs and outputs are plain data: the Workflow wrapper
// runs each stage as one durable step and persists what it returns.

import { offerPlaceholder, rulesetVersion } from '#/features/check/check-outcome'
import type { CheckOutcome, WrittenText } from '#/features/check/check-outcome'
import type { CheckDeps, WriterInput } from '#/features/check/check-ports'
import { comparablesStep, stepNames } from '#/features/check/check-store'
import type { ComparableRow, ComparableSnapshot, StepName, StepSummary, StoredPhoto } from '#/features/check/check-store'
import type { ListingFacts } from '#/features/check/listing-facts'
import { exclusionsFor, searchKeyTokens, widenSearchKey } from '#/features/check/scoring/comparables'
import { listingQuality } from '#/features/check/scoring/listing-quality'
import type { JevAnswers } from '#/features/check/scoring/listing-quality'
import { unknownNumbers } from '#/features/check/scoring/number-guard'
import { offerScore } from '#/features/check/scoring/offer-score'
import { marketOf, minComparables, priceStats, priceVerdict, suggestOffer } from '#/features/check/scoring/price'
import { evaluateScamPatterns, finalVerdict } from '#/features/check/scoring/scam'
import type { PatternResult } from '#/features/check/scoring/scam'
import { ReaderError } from '#/features/marketplaces/marketplace-reader'
import { marketplaces } from '#/lib/listing'
import type { Marketplace } from '#/lib/listing'

/** Comparables older than this don't describe today's market. */
const comparableWindowDays = 30

/** Writer drafts with a number not in its inputs are rejected this many times at most. */
const maxWriterAttempts = 3

export type ReadListing = {
  listingId: string
  sellerId: string | null
  seller: { externalId: string; profileUrl: string | null } | null
  title: string
  description: string
  priceCents: number | null
  photoUrls: string[]
}

export type ReadResult = { kind: 'found'; listing: ReadListing } | { kind: 'removed' } | { kind: 'failed' }

export type MarketplaceComparables = Record<Marketplace, ComparableRow[] | null>

export type ScoreInput = {
  listing: ReadListing
  photoCount: number
  facts: ListingFacts | null
  snapshot: ComparableSnapshot
  scam: PatternResult[] | null
}

/** Error codes for failures that aren't a marketplace read. */
function errorCodeOf(error: unknown, fallback: string): string {
  return error instanceof ReaderError ? error.code : fallback
}

const dayMs = 86_400_000

export function createCheckStages(deps: CheckDeps) {
  const { store, clock } = deps

  /** Runs `work` as step `name`: running, then done or failed. Null on failure. */
  async function asStep<T>(
    checkId: string,
    name: StepName,
    fallbackCode: string,
    work: () => Promise<{ value: T; summary?: StepSummary }>,
  ): Promise<T | null> {
    await store.setStep(checkId, name, { status: 'running', at: clock() })
    try {
      const { value, summary } = await work()
      await store.setStep(checkId, name, summary ? { status: 'done', at: clock(), summary } : { status: 'done', at: clock() })
      return value
    } catch (error) {
      const errorCode = errorCodeOf(error, fallbackCode)
      console.error('[check] step failed', { checkId, step: name, errorCode, error })
      await store.setStep(checkId, name, { status: 'failed', at: clock(), errorCode })
      return null
    }
  }

  async function skip(checkId: string, names: readonly StepName[]) {
    for (const name of names) await store.setStep(checkId, name, { status: 'skipped', at: clock() })
  }

  return {
    async read(checkId: string, marketplace: Marketplace, canonicalUrl: string): Promise<ReadResult> {
      const page = await asStep(checkId, 'read', 'read_failed', async () => ({
        value: await deps.reader.readListing(marketplace, canonicalUrl),
      }))
      const rest = stepNames.filter((name) => name !== 'read')
      if (!page) {
        await skip(checkId, rest)
        await store.finishCheck(checkId, 'failed', clock())
        return { kind: 'failed' }
      }
      if (page.kind === 'removed') {
        await skip(checkId, rest)
        await store.markRemoved(checkId, clock())
        return { kind: 'removed' }
      }
      const scraped = page.listing
      const { listingId, sellerId } = await store.saveListing(checkId, marketplace, scraped, clock())
      return {
        kind: 'found',
        listing: {
          listingId,
          sellerId,
          seller: scraped.seller && { externalId: scraped.seller.externalId, profileUrl: scraped.seller.profileUrl },
          title: scraped.title,
          description: scraped.description,
          priceCents: scraped.priceCents,
          photoUrls: scraped.photoUrls,
        },
      }
    },

    photos(checkId: string, listing: ReadListing): Promise<StoredPhoto[] | null> {
      return asStep(checkId, 'photos', 'photos_failed', async () => {
        const photos = await deps.photos.copyPhotos(listing.listingId, listing.photoUrls)
        const unused = await store.savePhotos(listing.listingId, photos)
        // The listing lost photos since its last check: their copies go now.
        if (unused.length > 0) await deps.photos.deletePhotos(unused)
        return { value: photos, summary: { photoCount: photos.length } }
      })
    },

    extract(checkId: string, listing: ReadListing, photos: StoredPhoto[] | null): Promise<ListingFacts | null> {
      return asStep(checkId, 'extract', 'extract_failed', async () => {
        const bytes = photos ? await deps.photos.readPhotos(photos.map((photo) => photo.objectKey)) : []
        const facts = await deps.extractor.extractListing({
          title: listing.title,
          description: listing.description,
          priceCents: listing.priceCents,
          photos: bytes,
        })
        await store.saveFacts(checkId, listing.listingId, facts)
        return { value: facts }
      })
    },

    /**
     * Comparables on one marketplace: the database first, one live search
     * when it has fewer than 5 (ADR 0002). A failed search keeps what the
     * database had but marks the step failed.
     */
    async comparables(
      checkId: string,
      marketplace: Marketplace,
      listing: ReadListing,
      facts: ListingFacts | null,
    ): Promise<ComparableRow[] | null> {
      const step = comparablesStep(marketplace)
      if (!facts) {
        await skip(checkId, [step])
        return null
      }
      const tokens = searchKeyTokens(facts.searchKey)
      const query = {
        marketplace,
        category: facts.category,
        tokens,
        exclusions: exclusionsFor(tokens),
        seenSince: new Date(clock().getTime() - comparableWindowDays * dayMs),
        excludeListingId: listing.listingId,
      }
      let rows = await store.findComparables(query)
      if (rows.length >= minComparables) {
        await store.setStep(checkId, step, { status: 'running', at: clock() })
        await store.setStep(checkId, step, { status: 'done', at: clock(), summary: { comparableCount: rows.length } })
        return rows
      }
      const searched = await asStep(checkId, step, 'search_failed', async () => {
        const results = await deps.reader.search(marketplace, facts.searchKey)
        await store.saveObservations({ marketplace, category: facts.category, results, seenAt: clock() })
        const found = await store.findComparables(query)
        return { value: found, summary: { comparableCount: found.length } }
      })
      rows = searched ?? rows
      return rows
    },

    seller(checkId: string, marketplace: Marketplace, listing: ReadListing): Promise<null> {
      const { seller, sellerId } = listing
      return asStep(checkId, 'seller', 'seller_failed', async () => {
        if (seller && sellerId) {
          const profile = await deps.reader.readSeller(marketplace, seller)
          if (profile) await store.saveSellerProfile(sellerId, profile, clock())
        }
        return { value: null }
      })
    },

    /**
     * Price stats per marketplace and overall. Under 5 in total, drops the
     * storage token from the match and says so (ADR 0002 step 4). No live
     * search here: only the database is asked again.
     */
    async finalizeComparables(
      checkId: string,
      listing: ReadListing,
      facts: ListingFacts | null,
      found: MarketplaceComparables,
    ): Promise<ComparableSnapshot> {
      let rows = found
      let widened = false
      const total = (byMarketplace: MarketplaceComparables) =>
        marketplaces.reduce((sum, marketplace) => sum + (byMarketplace[marketplace]?.length ?? 0), 0)
      const wideTokens = facts && widenSearchKey(searchKeyTokens(facts.searchKey))
      if (facts && wideTokens && total(found) < minComparables) {
        const wide = { ...found }
        for (const marketplace of marketplaces) {
          if (found[marketplace] === null) continue
          wide[marketplace] = await store.findComparables({
            marketplace,
            category: facts.category,
            tokens: wideTokens,
            exclusions: exclusionsFor(wideTokens),
            seenSince: new Date(clock().getTime() - comparableWindowDays * dayMs),
            excludeListingId: listing.listingId,
          })
        }
        if (total(wide) > total(found)) {
          rows = wide
          widened = true
          for (const marketplace of marketplaces) {
            const comparables = wide[marketplace]
            if (comparables && comparables.length !== found[marketplace]?.length) {
              await store.setStep(checkId, comparablesStep(marketplace), {
                status: 'done',
                at: clock(),
                summary: { comparableCount: comparables.length },
              })
            }
          }
        }
      }
      const entry = (comparables: ComparableRow[] | null) => ({
        comparables: comparables ?? [],
        stats: priceStats((comparables ?? []).map((row) => row.priceCents)),
      })
      return {
        byMarketplace: {
          njuskalo: entry(rows.njuskalo),
          facebook_marketplace: entry(rows.facebook_marketplace),
          index_oglasi: entry(rows.index_oglasi),
        },
        widened,
      }
    },

    scam(
      checkId: string,
      listing: ReadListing,
      photos: StoredPhoto[] | null,
      facts: ListingFacts | null,
      snapshot: ComparableSnapshot,
    ): Promise<PatternResult[] | null> {
      return asStep(checkId, 'scam', 'scam_failed', async () => {
        const otherListingCount = photos
          ? await store.countDuplicatePhotoListings({
              listingId: listing.listingId,
              sellerId: listing.sellerId,
              phashes: photos.map((photo) => photo.phash),
            })
          : null
        return {
          value: evaluateScamPatterns({
            duplicatePhotos: otherListingCount === null ? null : { otherListingCount },
            signals: facts?.scamSignals ?? null,
            priceCents: listing.priceCents,
            stats: overallStats(snapshot),
          }),
        }
      })
    },

    score(checkId: string, input: ScoreInput): Promise<CheckOutcome | null> {
      return asStep(checkId, 'score', 'score_failed', async () => {
        const { listing, facts, snapshot, photoCount } = input
        let jev: JevAnswers = {}
        if (facts) {
          try {
            jev = await deps.jev.answerQualityQuestions({ facts, photoCount })
          } catch (error) {
            // Jev down: Kvaliteta oglasa falls back to the extractor's facts.
            console.error('[check] jev failed', { checkId, error })
          }
        }
        const reviews = listing.sellerId
          ? await store.reviewStats(listing.sellerId)
          : { count: 0, averageStars: 0 }
        const market = overallStats(snapshot)
        const price = priceVerdict(listing.priceCents, market)
        const scam = input.scam ?? []
        const outcome: CheckOutcome = {
          rulesetVersion,
          priceCents: listing.priceCents,
          priceVerdict: price,
          verdict: finalVerdict(price, scam),
          market,
          widened: snapshot.widened,
          offer: suggestOffer(listing.priceCents, market),
          offerScore: offerScore({
            reviews,
            platformAverageStars: await store.platformAverageStars(),
            priceCents: listing.priceCents,
            stats: market,
          }),
          quality: listingQuality({ facts, photoCount, jev }),
          scam,
          jev,
        }
        await store.saveOutcome(checkId, outcome, snapshot)
        return { value: outcome }
      })
    },

    /** The report text, written last and without the offer (ADR 0009). */
    async write(checkId: string, facts: ListingFacts | null, outcome: CheckOutcome | null): Promise<void> {
      if (!facts || !outcome) {
        await skip(checkId, ['write'])
        return
      }
      const input = writerInputOf(facts, outcome)
      await asStep(checkId, 'write', 'write_failed', async () => {
        for (let attempt = 1; attempt <= maxWriterAttempts; attempt++) {
          const draft = await deps.writer.write(input, attempt)
          if (isAcceptable(draft, input)) {
            await store.saveText(checkId, draft)
            return { value: null }
          }
          console.warn('[check] writer draft rejected', { checkId, attempt })
        }
        throw new WriterRejectedError()
      })
    },

    async finish(checkId: string, outcome: CheckOutcome | null): Promise<void> {
      await store.finishCheck(checkId, outcome ? 'completed' : 'failed', clock())
    },
  }
}

export type CheckStages = ReturnType<typeof createCheckStages>

class WriterRejectedError extends Error {
  constructor() {
    super('Writer drafts kept using numbers that are not in their inputs')
  }
}

function overallStats(snapshot: ComparableSnapshot) {
  const prices = Object.values(snapshot.byMarketplace).flatMap((entry) =>
    entry.comparables.map((row) => row.priceCents),
  )
  return priceStats(prices)
}

function writerInputOf(facts: ListingFacts, outcome: CheckOutcome): WriterInput {
  const market = marketOf(outcome.market)
  const quality = outcome.quality
  return {
    category: facts.category,
    facts,
    verdict: outcome.verdict,
    reasons: {
      priceDiffPercent:
        market && outcome.priceCents !== null
          ? Math.round((outcome.priceCents / market.medianCents - 1) * 100)
          : null,
      widenedMatch: outcome.widened,
      offerScore: outcome.offerScore.kind === 'no_data' ? 'no_data' : outcome.offerScore.basis,
      quality:
        quality.kind === 'score'
          ? {
              photos: quality.photos,
              description: quality.description,
              missingCount: quality.missingCount,
              contradictionCount: quality.contradictionCount,
            }
          : null,
      firedScamPatterns: outcome.scam.filter((result) => result.status === 'fired').map((result) => result.code),
    },
  }
}

function isAcceptable(draft: WrittenText, input: WriterInput): boolean {
  const text = [
    draft.summary,
    ...draft.questions.map((question) => question.text),
    ...draft.checklist.map((item) => item.text),
    draft.offerMessage,
  ].join('\n')
  return draft.offerMessage.includes(offerPlaceholder) && unknownNumbers(text, input).length === 0
}
