import type { Report } from '#/features/report/report-result'

const clear = (code: Report['scam'][number]['code'], strength: Report['scam'][number]['strength']) =>
  ({ code, strength, status: 'clear' }) as const

/** A signed-in report of the iPhone demo listing; override per test. */
export function reportFixture(overrides: Partial<Report> = {}): Report {
  return {
    now: '2026-10-08T12:40:00.000Z',
    viewer: { signedIn: true },
    listing: {
      id: '00000000-0000-4000-8000-000000000001',
      title: 'iPhone 13 Pro, 128 GB, zeleni',
      marketplace: 'njuskalo',
      url: 'https://www.njuskalo.hr/mobiteli/iphone-13-pro-oglas-45123987',
      city: 'Zagreb',
      neighbourhood: 'Trešnjevka',
      postedAt: '2026-10-05T09:00:00.000Z',
      photoUrls: ['https://signed.test/1.webp', 'https://signed.test/2.webp'],
      priceCents: 64_000,
      removed: false,
      isDemo: false,
    },
    checkedAt: '2026-10-08T12:32:00.000Z',
    verdict: 'room_to_haggle',
    summary: 'Dobar telefon po cijeni malo iznad tržišta. Oglas ne navodi račun.',
    offerScore: { kind: 'no_data' },
    quality: {
      kind: 'score',
      value: 71,
      photos: 'good',
      description: 'good',
      defects: 'stated',
      missingCount: 2,
      contradictionCount: 1,
    },
    findings: {
      missing: [
        { key: 'receipt_or_warranty', label: 'račun ili jamstvo', whyItMatters: 'Račun dokazuje porijeklo.' },
        { key: 'repairs', label: 'je li telefon servisiran', whyItMatters: 'Zamijenjen ekran smanjuje cijenu.' },
      ],
      contradictions: [
        {
          key: 'battery_health',
          label: 'Baterija',
          textValue: '91 %',
          photoValue: '86 %',
          photoIndex: 5,
          photoDescription: 'Snimka zaslona iz Postavki',
        },
      ],
      confirmed: [
        { key: 'model', label: 'Model' },
        { key: 'storage', label: 'memorija' },
      ],
    },
    price: {
      market: { count: 6, medianCents: 59_500, lowCents: 56_000, highCents: 62_000 },
      comparableCount: 6,
      priceDiffPercent: 8,
      widened: false,
      byMarketplace: [
        { marketplace: 'njuskalo', count: 4, medianCents: 59_500 },
        { marketplace: 'facebook_marketplace', count: 2, medianCents: 57_000 },
        { marketplace: 'index_oglasi', count: 0, medianCents: null },
      ],
      dots: [56_000, 57_500, 58_500, 60_500, 61_000, 62_000],
      comparables: [
        {
          listingId: 'c1',
          title: 'iPhone 13 Pro 128 GB, baterija 88 %',
          marketplace: 'facebook_marketplace',
          city: 'Zagreb',
          seenAt: '2026-10-06T10:00:00.000Z',
          priceCents: 58_000,
          url: 'https://www.facebook.com/marketplace/item/1/',
        },
        {
          listingId: 'c2',
          title: 'iPhone 13 Pro 128 GB, grafitni',
          marketplace: 'njuskalo',
          city: 'Zagreb',
          seenAt: '2026-10-02T10:00:00.000Z',
          priceCents: 60_000,
          url: 'https://www.njuskalo.hr/mobiteli/x-oglas-2',
        },
      ],
    },
    scam: [
      clear('duplicate_photo', 'strong'),
      clear('off_platform_payment_link', 'strong'),
      clear('price_far_below_market', 'medium'),
      {
        code: 'off_platform_contact',
        strength: 'weak',
        status: 'fired',
        evidence: { kind: 'quote', quote: 'javi se na WhatsApp' },
      },
      clear('advance_payment_only', 'medium'),
      clear('urgency_pressure', 'weak'),
    ],
    seller: {
      sellerId: 's1',
      displayName: 'Marko K.',
      initials: 'MK',
      marketplace: 'njuskalo',
      profileUrl: 'https://www.njuskalo.hr/trgovina/marko',
      memberSince: '2019-03-01T00:00:00.000Z',
      city: 'Zagreb',
      facts: [{ kind: 'phone_verified' }],
      reviewCount: 2,
      averageStars: 4.5,
      sameOwnerOn: [],
      claimedByViewer: false,
      claimable: true,
    },
    reviews: [
      {
        id: '00000000-0000-4000-8000-0000000000r1',
        reviewerName: 'Ivana P.',
        createdAt: '2026-10-03T10:00:00.000Z',
        marketplace: 'njuskalo',
        stars: 5,
        listingTitle: 'iPhone 12, 64 GB',
        text: 'Mobitel je točno kao na slikama.',
        verifiedPurchase: false,
        isDemo: false,
        helpfulCount: 12,
        markedHelpfulByViewer: false,
        reply: { text: 'Hvala Ivana!', createdAt: '2026-10-04T10:00:00.000Z' },
        viewerCanReply: false,
      },
    ],
    viewerCanReview: true,
    questions: [
      { key: 'battery', text: 'Koliki je točan kapacitet baterije?', sourceKey: 'battery_health' },
      { key: 'receipt', text: 'Imate li račun?', sourceKey: 'receipt_or_warranty' },
      { key: 'meet', text: 'Može li osobno preuzimanje u Zagrebu?', sourceKey: null },
    ],
    checklist: [
      { key: 'imei', text: 'IMEI na kutiji i u Postavkama je isti' },
      { key: 'face_id', text: 'Face ID, kamere i zvučnici rade' },
      { key: 'pay_in_hand', text: 'Plaćaš tek kad držiš telefon u ruci' },
    ],
    ticks: [],
    offer: {
      kind: 'unlocked',
      offerCents: 59_000,
      savingCents: 5_000,
      savingPercent: 8,
      message: 'Pozdrav! Biste li prihvatili 590 €?',
    },
    tracked: false,
    ...overrides,
  }
}

/** The same report as a guest receives it: nothing locked inside. */
export function guestReportFixture(overrides: Partial<Report> = {}): Report {
  const signedIn = reportFixture()
  return reportFixture({
    viewer: { signedIn: false },
    offer: { kind: 'locked', approxSavingCents: 5_000 },
    price: { ...signedIn.price, comparables: signedIn.price.comparables.slice(0, 1) },
    ticks: [],
    tracked: null,
    viewerCanReview: false,
    ...overrides,
  })
}
