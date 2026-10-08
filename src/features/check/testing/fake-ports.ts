import type { CheckDeps, ExtractorInput, WriterInput } from '#/features/check/check-ports'
import type { WrittenText } from '#/features/check/check-outcome'
import type { ListingFacts, ScamSignals } from '#/features/check/listing-facts'
import type { JevAnswers } from '#/features/check/scoring/listing-quality'
import { InMemoryCheckStore } from '#/features/check/testing/in-memory-check-store'
import { ReaderError } from '#/features/marketplaces/marketplace-reader'
import type {
  ListingPageResult,
  MarketplaceReader,
  ScrapedListing,
  SearchResult,
  SellerProfile,
} from '#/features/marketplaces/marketplace-reader'
import type { Marketplace } from '#/lib/listing'

type Outcome<T> = T | ReaderError

const settle = <T>(outcome: Outcome<T> | undefined, fallback: T): Promise<T> =>
  outcome instanceof ReaderError ? Promise.reject(outcome) : Promise.resolve(outcome ?? fallback)

/** Serves programmed pages; anything unprogrammed is an empty search or a missing profile. */
export class FakeReader implements MarketplaceReader {
  readonly pages = new Map<string, Outcome<ListingPageResult>>()
  readonly searches = new Map<Marketplace, Outcome<SearchResult[]>>()
  readonly profiles = new Map<string, Outcome<SellerProfile | null>>()
  readonly searched: { marketplace: Marketplace; query: string }[] = []

  readListing = (_marketplace: Marketplace, canonicalUrl: string) =>
    settle(this.pages.get(canonicalUrl), { kind: 'removed' } as ListingPageResult)

  search = (marketplace: Marketplace, query: string) => {
    this.searched.push({ marketplace, query })
    return settle(this.searches.get(marketplace), [])
  }

  readSeller = (_marketplace: Marketplace, seller: { externalId: string }) =>
    settle(this.profiles.get(seller.externalId), null)
}

export const noScamSignals: ScamSignals = {
  offPlatformPaymentLink: { present: false, evidence: null },
  offPlatformContact: { present: false, evidence: null },
  advancePaymentOnly: { present: false, evidence: null },
  urgency: { present: false, evidence: null },
}

export function phoneFacts(overrides: Partial<ListingFacts> = {}): ListingFacts {
  return {
    searchKey: 'iPhone 13 Pro 128 GB',
    category: 'phones',
    statedSpecs: [{ key: 'storage', label: 'Memorija', value: '128 GB' }],
    missingFacts: [
      {
        key: 'receipt_or_warranty',
        label: 'račun ili jamstvo',
        whyItMatters: 'Dokazuje da uređaj nije ukraden.',
      },
    ],
    contradictions: [],
    confirmedFacts: [{ key: 'model', label: 'Model' }],
    photos: [],
    conditionNotes: 'Like new, no scratches.',
    scamSignals: noScamSignals,
    ...overrides,
  }
}

export function writtenText(overrides: Partial<WrittenText> = {}): WrittenText {
  return {
    summary: 'Cijena je malo iznad tržišta. Oglas je jasan, ali ne spominje račun.',
    questions: [
      { key: 'receipt', text: 'Imaš li račun ili jamstvo?', sourceKey: 'receipt_or_warranty' },
      { key: 'meet', text: 'Možemo li se naći uživo?', sourceKey: null },
    ],
    checklist: [{ key: 'imei', text: 'Provjeri IMEI u postavkama.' }],
    offerMessage: 'Pozdrav! Nudim {ponuda}, može li?',
    ...overrides,
  }
}

/** A stable 64-bit FNV-1a hash, so unrelated URLs get unrelated photo hashes. */
function hashOfUrl(url: string): string {
  let hash = 0xcbf29ce484222325n
  for (const char of url) {
    hash ^= BigInt(char.charCodeAt(0))
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn
  }
  return hash.toString(16).padStart(16, '0')
}

/** The ports with sensible defaults; override any part per test. */
export function fakeDeps<Store extends InMemoryCheckStore = InMemoryCheckStore>(
  now: Date,
  store: Store = new InMemoryCheckStore() as Store,
) {
  const reader = new FakeReader()
  const extractorInputs: ExtractorInput[] = []
  const writerInputs: WriterInput[] = []
  const photoHashes = new Map<string, string>()
  const deletedPhotos: string[] = []
  const fakes = {
    facts: phoneFacts() as ListingFacts | Error,
    jev: {} as JevAnswers,
    /** One draft per attempt; the last repeats. */
    drafts: [writtenText()],
    photoFailure: null as Error | null,
  }

  const deps: CheckDeps = {
    reader,
    store,
    clock: () => now,
    photos: {
      copyPhotos: (listingId, photoUrls) =>
        fakes.photoFailure
          ? Promise.reject(fakes.photoFailure)
          : Promise.resolve(
              photoUrls.map((url, position) => ({
                position,
                objectKey: `listings/${listingId}/${String(position)}.webp`,
                phash: photoHashes.get(url) ?? hashOfUrl(url),
              })),
            ),
      readPhotos: (keys) => Promise.resolve(keys.map(() => new Uint8Array([1, 2, 3]))),
      deletePhotos: (keys) => {
        deletedPhotos.push(...keys)
        return Promise.resolve()
      },
    },
    extractor: {
      extractListing: (input) => {
        extractorInputs.push(input)
        return fakes.facts instanceof Error ? Promise.reject(fakes.facts) : Promise.resolve(fakes.facts)
      },
      extractMessage: () => Promise.resolve(noScamSignals),
    },
    jev: { answerQualityQuestions: () => Promise.resolve(fakes.jev) },
    writer: {
      write: (input, attempt) => {
        writerInputs.push(input)
        const draft = fakes.drafts[Math.min(attempt, fakes.drafts.length) - 1]
        return draft ? Promise.resolve(draft) : Promise.reject(new Error('no draft'))
      },
    },
  }
  return { deps, reader, store, fakes, photoHashes, deletedPhotos, extractorInputs, writerInputs }
}

export function scrapedPhone(overrides: Partial<ScrapedListing> = {}): ScrapedListing {
  return {
    externalId: '45123987',
    canonicalUrl: 'https://www.njuskalo.hr/mobiteli/iphone-13-pro-oglas-45123987',
    title: 'iPhone 13 Pro 128 GB, zeleni',
    description: 'Prodajem iPhone 13 Pro, baterija 91 %. Bez oštećenja.',
    priceCents: 64000,
    city: 'Zagreb',
    neighbourhood: 'Trešnjevka',
    postedAt: new Date('2026-10-06T09:00:00Z'),
    photoUrls: ['https://img.test/1.jpg', 'https://img.test/2.jpg'],
    seller: { externalId: 'seller-ivana', displayName: 'Ivana', profileUrl: 'https://www.njuskalo.hr/trgovina/ivana' },
    ...overrides,
  }
}
