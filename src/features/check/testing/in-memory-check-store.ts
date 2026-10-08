import { normalizeTitle } from '#/features/check/scoring/comparables'
import { offerScoreRules } from '#/features/check/scoring/offer-score'
import { isSamePhoto } from '#/features/check/photos/phash'
import type { WrittenText, CheckOutcome } from '#/features/check/check-outcome'
import { stepNames } from '#/features/check/check-store'
import type {
  CheckStatus,
  CheckStore,
  ComparableQuery,
  ComparableRow,
  ComparableSnapshot,
  StepName,
  StepSummary,
  StepUpdate,
  StoredPhoto,
} from '#/features/check/check-store'
import type { Category, ListingFacts } from '#/features/check/listing-facts'
import type { SellerProfile } from '#/features/marketplaces/marketplace-reader'
import type { Marketplace } from '#/lib/listing'

export type StoredListing = {
  id: string
  kind: 'checked' | 'observation'
  marketplace: Marketplace
  externalId: string
  canonicalUrl: string
  title: string
  normalizedTitle: string
  category: Category | null
  searchKey: string | null
  description: string | null
  city: string | null
  neighbourhood: string | null
  priceCents: number | null
  seenAt: Date
  postedAt: Date | null
  sellerId: string | null
  photoKey: string | null
  status: 'active' | 'removed'
  removedAt: Date | null
  /** Labelled demo listing (PRODUCT.md): its reviews are examples. */
  isDemo: boolean
}

export type StoredCheck = {
  id: string
  canonicalUrl: string
  marketplace: Marketplace
  listingId: string | null
  status: CheckStatus
  startedAt: Date
  finishedAt: Date | null
  facts: ListingFacts | null
  outcome: CheckOutcome | null
  comparables: ComparableSnapshot | null
  text: WrittenText | null
}

export type StoredStep = {
  status: 'queued' | StepUpdate['status']
  errorCode: string | null
  startedAt: Date | null
  finishedAt: Date | null
  summary: StepSummary | null
}

export type StoredSeller = {
  id: string
  marketplace: Marketplace
  externalId: string
  displayName: string
  profileUrl: string | null
  profile: SellerProfile | null
  scrapedAt: Date | null
}

export type StoredReview = {
  id: string
  userId: string
  sellerId: string
  listingId: string
  stars: number
  text: string
  verifiedPurchase: boolean
  isDemo: boolean
  /** Extension reviews only (ADR 0014). */
  installId: string | null
  createdAt: Date
}

export type StoredPhotoRow = StoredPhoto & { listingId: string; deletedAt: Date | null }

let counter = 0
const nextId = (prefix: string) => `${prefix}-${String(++counter)}`
/** Rows keyed by `@db.Uuid` in Postgres get real UUIDs here too. */
const randomUUID = () => crypto.randomUUID()

/** Mirrors the check pipeline's tables in memory. */
export class InMemoryCheckStore implements CheckStore {
  readonly listings = new Map<string, StoredListing>()
  readonly checks = new Map<string, StoredCheck>()
  readonly steps = new Map<string, Map<StepName, StoredStep>>()
  readonly sellers = new Map<string, StoredSeller>()
  photos: StoredPhotoRow[] = []
  reviews: StoredReview[] = []

  // Seeding helpers --------------------------------------------------------

  addListing(seed: Partial<StoredListing> & Pick<StoredListing, 'title' | 'marketplace'>): StoredListing {
    const id = seed.id ?? randomUUID()
    const listing: StoredListing = {
      id,
      kind: 'observation',
      externalId: id,
      canonicalUrl: `https://example.test/${id}`,
      category: null,
      searchKey: null,
      description: null,
      city: null,
      neighbourhood: null,
      priceCents: null,
      seenAt: new Date(0),
      postedAt: null,
      sellerId: null,
      photoKey: null,
      status: 'active',
      removedAt: null,
      isDemo: false,
      ...seed,
      normalizedTitle: normalizeTitle(seed.title),
    }
    this.listings.set(id, listing)
    return listing
  }

  addSeller(seed: Partial<StoredSeller> & Pick<StoredSeller, 'marketplace' | 'externalId'>): StoredSeller {
    const seller: StoredSeller = {
      id: seed.id ?? randomUUID(),
      displayName: 'Prodavač',
      profileUrl: null,
      profile: null,
      scrapedAt: null,
      ...seed,
    }
    this.sellers.set(seller.id, seller)
    return seller
  }

  addReview(seed: Partial<StoredReview> & Pick<StoredReview, 'sellerId' | 'stars'>): StoredReview {
    const review: StoredReview = {
      id: randomUUID(),
      userId: nextId('user'),
      listingId: 'listing-x',
      text: 'Sve u redu.',
      verifiedPurchase: false,
      isDemo: false,
      installId: null,
      createdAt: new Date(0),
      ...seed,
    }
    this.reviews.push(review)
    return review
  }

  // Inspection helpers -----------------------------------------------------

  check(checkId: string): StoredCheck {
    const check = this.checks.get(checkId)
    if (!check) throw new Error(`no check ${checkId}`)
    return check
  }

  stepsOf(checkId: string): Record<StepName, StoredStep> {
    return Object.fromEntries(this.steps.get(checkId) ?? []) as Record<StepName, StoredStep>
  }

  listingByUrl(canonicalUrl: string): StoredListing | undefined {
    return [...this.listings.values()].find((listing) => listing.canonicalUrl === canonicalUrl)
  }

  // CheckStore ---------------------------------------------------------------

  findReusableCheck = (canonicalUrl: string, since: { completed: Date; running: Date }) => {
    const reusable = [...this.checks.values()]
      .filter(
        (check) =>
          check.canonicalUrl === canonicalUrl &&
          ((check.status === 'completed' && check.startedAt >= since.completed) ||
            (check.status === 'running' && check.startedAt >= since.running)),
      )
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    return Promise.resolve(reusable[0]?.id ?? null)
  }

  createCheck = (input: { canonicalUrl: string; marketplace: Marketplace; startedAt: Date }) => {
    const id = randomUUID()
    this.checks.set(id, {
      id,
      ...input,
      listingId: null,
      status: 'running',
      finishedAt: null,
      facts: null,
      outcome: null,
      comparables: null,
      text: null,
    })
    const queued: StoredStep = { status: 'queued', errorCode: null, startedAt: null, finishedAt: null, summary: null }
    this.steps.set(id, new Map(stepNames.map((name) => [name, { ...queued }])))
    return Promise.resolve(id)
  }

  setStep = (checkId: string, step: StepName, update: StepUpdate) => {
    const steps = this.steps.get(checkId)
    if (!steps) throw new Error(`no check ${checkId}`)
    const previous = steps.get(step)
    steps.set(step, {
      status: update.status,
      errorCode: update.status === 'failed' ? update.errorCode : null,
      startedAt: update.status === 'running' ? update.at : (previous?.startedAt ?? null),
      finishedAt: update.status === 'running' ? null : update.at,
      summary: update.status === 'done' ? (update.summary ?? null) : null,
    })
    return Promise.resolve()
  }

  saveListing: CheckStore['saveListing'] = (checkId, marketplace, scraped, seenAt) => {
    let sellerId: string | null = null
    if (scraped.seller) {
      const { externalId, displayName, profileUrl } = scraped.seller
      const existing = [...this.sellers.values()].find(
        (seller) => seller.marketplace === marketplace && seller.externalId === externalId,
      )
      sellerId = existing
        ? Object.assign(existing, { displayName, profileUrl }).id
        : this.addSeller({ marketplace, externalId, displayName, profileUrl }).id
    }
    const existing = [...this.listings.values()].find(
      (listing) => listing.marketplace === marketplace && listing.externalId === scraped.externalId,
    )
    const fields = {
      kind: 'checked' as const,
      marketplace,
      externalId: scraped.externalId,
      canonicalUrl: scraped.canonicalUrl,
      title: scraped.title,
      normalizedTitle: normalizeTitle(scraped.title),
      description: scraped.description,
      city: scraped.city,
      neighbourhood: scraped.neighbourhood,
      priceCents: scraped.priceCents,
      seenAt,
      postedAt: scraped.postedAt,
      sellerId,
      status: 'active' as const,
      removedAt: null,
    }
    const listing = existing
      ? Object.assign(existing, fields)
      : this.addListing({ ...fields, id: randomUUID() })
    this.check(checkId).listingId = listing.id
    return Promise.resolve({ listingId: listing.id, sellerId })
  }

  markRemoved = (checkId: string, at: Date) => {
    const check = this.check(checkId)
    check.status = 'removed'
    check.finishedAt = at
    // The listing an earlier check of the same link read, if any.
    const earlier = [...this.checks.values()]
      .filter((other) => other.canonicalUrl === check.canonicalUrl && other.listingId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0]
    const listing = earlier?.listingId ? this.listings.get(earlier.listingId) : undefined
    if (listing) {
      listing.status = 'removed'
      listing.removedAt = at
      check.listingId = listing.id
    }
    return Promise.resolve()
  }

  savePhotos = (listingId: string, photos: StoredPhoto[]) => {
    const kept = new Set(photos.map((photo) => photo.objectKey))
    const unused = this.photos
      .filter((photo) => photo.listingId === listingId && !photo.deletedAt && !kept.has(photo.objectKey))
      .map((photo) => photo.objectKey)
    this.photos = [
      ...this.photos.filter((photo) => photo.listingId !== listingId),
      ...photos.map((photo) => ({ ...photo, listingId, deletedAt: null })),
    ]
    const listing = this.listings.get(listingId)
    if (listing) listing.photoKey = photos[0]?.objectKey ?? null
    return Promise.resolve(unused)
  }

  countDuplicatePhotoListings: CheckStore['countDuplicatePhotoListings'] = ({ listingId, sellerId, phashes }) => {
    const matches = new Set(
      this.photos
        .filter((photo) => {
          if (photo.listingId === listingId) return false
          const owner = this.listings.get(photo.listingId)?.sellerId ?? null
          if (sellerId !== null && owner === sellerId) return false
          return phashes.some((hash) => isSamePhoto(hash, photo.phash))
        })
        .map((photo) => photo.listingId),
    )
    return Promise.resolve(matches.size)
  }

  saveFacts = (checkId: string, listingId: string, facts: ListingFacts) => {
    this.check(checkId).facts = facts
    const listing = this.listings.get(listingId)
    if (listing) {
      listing.category = facts.category
      listing.searchKey = facts.searchKey
    }
    return Promise.resolve()
  }

  findComparables = (query: ComparableQuery) =>
    Promise.resolve(
      [...this.listings.values()]
        .filter(
          (listing) =>
            listing.marketplace === query.marketplace &&
            listing.category === query.category &&
            listing.id !== query.excludeListingId &&
            listing.status === 'active' &&
            !listing.isDemo &&
            listing.priceCents !== null &&
            listing.seenAt >= query.seenSince &&
            query.tokens.every((token) => listing.normalizedTitle.includes(` ${token} `)) &&
            query.exclusions.every((word) => !listing.normalizedTitle.includes(` ${word} `)),
        )
        .sort((a, b) => b.seenAt.getTime() - a.seenAt.getTime())
        .map(
          (listing): ComparableRow => ({
            listingId: listing.id,
            marketplace: listing.marketplace,
            title: listing.title,
            priceCents: listing.priceCents ?? 0,
            city: listing.city,
            url: listing.canonicalUrl,
            seenAt: listing.seenAt,
          }),
        ),
    )

  saveObservations: CheckStore['saveObservations'] = ({ marketplace, category, results, seenAt }) => {
    for (const result of results) {
      const existing = [...this.listings.values()].find(
        (listing) => listing.marketplace === marketplace && listing.externalId === result.externalId,
      )
      if (existing) {
        Object.assign(existing, { priceCents: result.priceCents, seenAt, category: existing.category ?? category })
        continue
      }
      this.addListing({
        kind: 'observation',
        marketplace,
        externalId: result.externalId,
        canonicalUrl: result.url,
        title: result.title,
        category,
        city: result.city,
        priceCents: result.priceCents,
        postedAt: result.postedAt,
        seenAt,
      })
    }
    return Promise.resolve()
  }

  saveSellerProfile = (sellerId: string, profile: SellerProfile, scrapedAt: Date) => {
    const seller = this.sellers.get(sellerId)
    if (seller) Object.assign(seller, { profile, scrapedAt, displayName: profile.displayName })
    return Promise.resolve()
  }

  reviewStats = (sellerId: string) => {
    const real = this.reviews.filter((review) => review.sellerId === sellerId && !review.isDemo)
    const averageStars = real.length === 0 ? 0 : real.reduce((sum, review) => sum + review.stars, 0) / real.length
    return Promise.resolve({ count: real.length, averageStars })
  }

  platformAverageStars = () => {
    const real = this.reviews.filter((review) => !review.isDemo)
    return Promise.resolve(
      real.length === 0
        ? offerScoreRules.defaultPlatformAverageStars
        : real.reduce((sum, review) => sum + review.stars, 0) / real.length,
    )
  }

  saveOutcome = (checkId: string, outcome: CheckOutcome, comparables: ComparableSnapshot) => {
    const check = this.check(checkId)
    check.outcome = outcome
    check.comparables = comparables
    return Promise.resolve()
  }

  saveText = (checkId: string, text: WrittenText) => {
    this.check(checkId).text = text
    return Promise.resolve()
  }

  finishCheck = (checkId: string, status: 'completed' | 'failed', at: Date) => {
    const check = this.check(checkId)
    check.status = status
    check.finishedAt = at
    return Promise.resolve()
  }
}
