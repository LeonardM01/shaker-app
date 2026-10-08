// The ports `runCheck` is built against. Production adapters live next to
// them as `*.server.ts`; tests pass fakes.

import type { CheckStore, StoredPhoto } from '#/features/check/check-store'
import type { WrittenText } from '#/features/check/check-outcome'
import type { Category, ListingFacts, ScamSignals } from '#/features/check/listing-facts'
import type { JevAnswers } from '#/features/check/scoring/listing-quality'
import type { MarketplaceReader } from '#/features/marketplaces/marketplace-reader'
import type { Verdict } from '#/lib/listing'

export type PhotoStore = {
  /** Copies each photo into the private bucket as one WebP and hashes it. Order is kept. */
  copyPhotos: (listingId: string, photoUrls: readonly string[]) => Promise<StoredPhoto[]>
  /** The stored copies' bytes, for the extractor. */
  readPhotos: (objectKeys: readonly string[]) => Promise<Uint8Array[]>
  /** Deletes stored copies; their pHashes stay in Postgres. */
  deletePhotos: (objectKeys: readonly string[]) => Promise<void>
}

export type ExtractorInput = {
  title: string
  description: string
  priceCents: number | null
  /** The stored WebP copies, in listing order. */
  photos: Uint8Array[]
}

export type Extractor = {
  extractListing: (input: ExtractorInput) => Promise<ListingFacts>
  /** The message check: patterns 2, 4, 5 and 6 on a pasted message. */
  extractMessage: (message: string) => Promise<ScamSignals>
}

export type JevClient = {
  /** Kvaliteta oglasa's atomic questions over the extractor's English facts. */
  answerQualityQuestions: (input: { facts: ListingFacts; photoCount: number }) => Promise<JevAnswers>
}

/** Reasons as codes with parameters. Never the offer amount or any price. */
export type WriterInput = {
  category: Category
  facts: ListingFacts
  verdict: Verdict
  reasons: {
    /** Asking price against the market median, whole percent; null without a market. */
    priceDiffPercent: number | null
    widenedMatch: boolean
    offerScore: 'no_data' | 'reviews_only' | 'reviews_and_price'
    quality: { photos: string; description: string; missingCount: number; contradictionCount: number } | null
    firedScamPatterns: string[]
  }
}

export type Writer = {
  /** `attempt` starts at 1; later attempts follow a rejected draft. */
  write: (input: WriterInput, attempt: number) => Promise<WrittenText>
}

export type CheckDeps = {
  reader: MarketplaceReader
  photos: PhotoStore
  extractor: Extractor
  jev: JevClient
  writer: Writer
  store: CheckStore
  clock: () => Date
}
