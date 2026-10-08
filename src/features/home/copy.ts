// Every Croatian string on Početna. Kept out of the components so i18n can
// replace this module later.

import type { RiskEvidence, UpdateBanner } from '#/features/home/home-result'
import type { Marketplace } from '#/lib/listing'
import { formatPrice, formatPriceDelta } from '#/lib/format'

export const marketplaceNames: Record<Marketplace, string> = {
  njuskalo: 'Njuškalo',
  facebook_marketplace: 'Facebook Marketplace',
  index_oglasi: 'Index oglasi',
}

/** Shorter names for the row meta line ("Facebook · Split"). */
const marketplaceShortNames: Record<Marketplace, string> = {
  ...marketplaceNames,
  facebook_marketplace: 'Facebook',
}

const plural = new Intl.PluralRules('hr-HR')

export const homeCopy = {
  pageTitle: 'Početna · Shaker',
  heading: 'Provjeri oglas',
  intro:
    'Zalijepi link s Njuškala, Facebook Marketplacea ili Index oglasa. Za 5–10 sekundi znaš je li cijena fer, što nedostaje i kome plaćaš.',
  introShort:
    'Zalijepi link s Njuškala, Facebook Marketplacea ili Index oglasa. Rezultat za 5–10 sekundi.',

  field: {
    label: 'Link oglasa',
    placeholder: 'Zalijepi link oglasa, npr. njuskalo.hr/…',
    submit: 'Provjeri',
    supportedLabel: 'Radi s',
    recognised: (marketplace: Marketplace) =>
      `Link je prepoznat: ${marketplaceNames[marketplace]}.`,
    notAListing:
      'Ovo nije link na oglas. Zalijepi adresu koja počinje s njuskalo.hr, facebook.com/marketplace ili index.hr/oglasi.',
    unsupportedTitle: 'Ovu stranicu još ne čitamo',
    unsupportedBody:
      'Za sada provjeravamo oglase s Njuškala, Facebook Marketplacea i Index oglasa.',
  },

  account: {
    label: 'Tvoj račun',
    signIn: 'Prijavi se',
  },

  banner: {
    heading: (dropCents: number) => `Cijena je pala ${formatPrice(dropCents)}`,
    body: ({ title, priceCents, marketAverageCents }: UpdateBanner, checkedAgo: string) => {
      const market =
        marketAverageCents === null
          ? ''
          : `, ispod tržišnog prosjeka od ${formatPrice(marketAverageCents)}`
      return `${title}: sada ${formatPrice(priceCents)}${market}. Provjereno ${checkedAgo}.`
    },
  },

  watchlist: {
    heading: 'Praćeni oglasi',
    changed: 'Promijenilo se od zadnje provjere',
    changedShort: 'Promijenilo se',
    unchanged: 'Bez promjene',
    meta: (marketplace: Marketplace, city: string | null) =>
      [marketplaceShortNames[marketplace], city].filter(Boolean).join(' · '),
    priceChange: (deltaCents: number) => `${formatPriceDelta(deltaCents)} od zadnje provjere`,
    riskEvidence: ({ count }: RiskEvidence) => {
      switch (plural.select(count)) {
        case 'one':
          return `ista slika u ${count} drugom oglasu`
        case 'few':
          return `ista slika u ${count} druga oglasa`
        default:
          return `ista slika u ${count} drugih oglasa`
      }
    },
    tooFewComparables: 'premalo usporedivih oglasa',
    unchangedLine: 'bez promjene',
    removed: 'Više nije aktivan',
    removedAgo: (ago: string) => `uklonjen ${ago}`,
    removedDetail: (priceCents: number, ago: string) =>
      `Zadnja cijena ${formatPrice(priceCents)}, uklonjen ${ago}. Možda je prodan.`,
    untrack: 'Ukloni s popisa',
    untrackLabel: (title: string) => `Ukloni s popisa: ${title}`,
    untrackFailed: 'Uklanjanje nije uspjelo. Pokušaj ponovo.',
  },

  empty: {
    heading: 'Još ne pratiš nijedan oglas',
    body: 'Zalijepi link iznad. Svaki provjereni oglas ostaje ovdje i javimo ti kad mu padne cijena.',
  },

  unavailable: {
    body: 'Praćeni oglasi se trenutno ne mogu učitati.',
    detail: 'Provjera novog oglasa radi normalno.',
    retry: 'Pokušaj ponovo',
  },

  guest: {
    example: 'Primjer',
    heading: 'Prati oglase, mi pazimo na cijenu',
    body: 'Spremi oglase koje provjeriš. Javit ćemo ti kad cijena padne, oglas se promijeni ili nestane.',
    bodyShort: 'Javit ćemo ti kad cijena padne ili oglas nestane.',
    signUp: 'Napravi račun',
    haveAccount: 'Već imaš račun?',
    signIn: 'Prijavi se',
    /** Fixed example rows behind the blur. Never real data. */
    placeholderRows: [
      { id: 'ps5', title: 'PlayStation 5 + 2 kontrolera', verdict: 'great_price', meta: 'Facebook · Split' },
      { id: 'bike', title: 'Scott Scale 970, veličina M', verdict: 'fair_price', meta: 'Index oglasi · Rijeka' },
      { id: 'phone', title: 'iPhone 13 Pro, 128 GB, zeleni', verdict: 'room_to_haggle', meta: 'Njuškalo · Zagreb' },
      { id: 'sofa', title: 'Kauč na razvlačenje, sivi', verdict: 'no_data', meta: 'Facebook · Zadar' },
    ],
    placeholderPrice: '000 €',
  },
} as const
