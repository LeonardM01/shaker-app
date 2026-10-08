// Every Croatian string on "Provjera u tijeku" and "Izvještaj oglasa". Kept out
// of the components so i18n can replace this module later.

import { marketplaceNames } from '#/features/home/copy'
import type { QualityLevel } from '#/features/check/scoring/listing-quality'
import type { OfferScore } from '#/features/check/scoring/offer-score'
import type { PatternResult, ScamPatternCode } from '#/features/check/scoring/scam'
import type { SellerFact } from '#/features/marketplaces/marketplace-reader'
import type { CautionReason } from '#/features/report/trust-status'
import type { ListingQuality } from '#/features/check/scoring/listing-quality'
import { formatClock, formatDate, formatPrice, recentDayOffset } from '#/lib/format'
import type { Marketplace } from '#/lib/listing'
import { brandName, pageTitle } from '#/components/ui/copy'

const plural = new Intl.PluralRules('hr-HR')

/** Croatian noun forms for one / few (2–4) / many. */
function count(value: number, one: string, few: string, many: string): string {
  const form = plural.select(value)
  return `${String(value)} ${form === 'one' ? one : form === 'few' ? few : many}`
}

const percent = (value: number) => `${String(Math.abs(value))} %`

/** "Originalna kutija" → "originalna kutija" mid-sentence; "iCloud" and "IMEI" stay. */
function midSentence(label: string): string {
  const [first = '', second = ''] = label
  return second === second.toLocaleLowerCase('hr-HR')
    ? `${first.toLocaleLowerCase('hr-HR')}${label.slice(1)}`
    : label
}

/** "Nedostaje 1 podatak", "Nedostaju 2 podatka", "Nedostaje 5 podataka". */
function missingFacts(value: number): string {
  const verb = plural.select(value) === 'few' ? 'Nedostaju' : 'Nedostaje'
  return `${verb} ${count(value, 'podatak', 'podatka', 'podataka')}`
}

/** Short names for tags and meta lines ("Facebook"). */
export const marketplaceTags: Record<Marketplace, string> = {
  njuskalo: 'Njuškalo',
  facebook_marketplace: 'Facebook',
  index_oglasi: 'Index oglasi',
}

/** "(na) Njuškalu", "(na) Facebooku", "(na) Index oglasima". */
const marketplaceLocative: Record<Marketplace, string> = {
  njuskalo: 'Njuškalu',
  facebook_marketplace: 'Facebooku',
  index_oglasi: 'Index oglasima',
}

/** Error codes a buyer may see next to a failed step. */
const errorTitles: Record<string, string> = {
  blocked: 'ne pušta provjeru',
  timeout: 'ne odgovara',
  session_failed: 'nije dostupan',
  parse_failed: 'je promijenio stranicu',
}

export const progressCopy = {
  pageTitle: pageTitle('Provjera u tijeku'),
  heading: 'Provjeravam oglas…',
  listLabel: 'Provjere',
  timing: 'Obično traje do pola minute. Svaka provjera se prikaže čim je gotova, ne moraš čekati sve.',
  listingMeta: (marketplace: Marketplace, city: string | null, photoCount: number) =>
    [marketplaceNames[marketplace], city, count(photoCount, 'fotografija', 'fotografije', 'fotografija')]
      .filter(Boolean)
      .join(' · '),
  rows: {
    read: { title: 'Oglas pročitan', pending: 'Naslov, opis i fotografije', done: (photoCount: number) => `Naslov, opis i ${count(photoCount, 'fotografija', 'fotografije', 'fotografija')}` },
    searching: 'Tražim usporedive oglase…',
    comparablesFound: (value: number) =>
      value === 0 ? 'Nema usporedivih oglasa' : count(value, 'usporediv oglas', 'usporediva oglasa', 'usporedivih oglasa'),
    scam: { title: 'Znakovi prijevare', detail: 'Usporedba fotografija i opisa' },
    seller: { title: 'Prodavač i recenzije', detail: 'Profil, povijest i recenzenti' },
    questions: { title: 'Pitanja za prodavatelja', detail: 'Nakon svih provjera' },
    skipped: 'Nije provjereno',
  },
  status: { queued: 'Na redu', running: 'U tijeku', done: 'Gotovo', failed: 'Greška', skipped: 'Preskočeno' },
  failed: {
    title: (subject: string, errorCode: string | null) =>
      `${subject} ${(errorCode && errorTitles[errorCode]) ?? 'trenutno ne radi'}`,
    body: 'Ostale provjere rade normalno.',
    retry: 'Pokušaj ponovo',
    stamp: (time: string, errorCode: string | null) => [time, errorCode?.toUpperCase()].filter(Boolean).join(' · '),
  },
  checkFailed: {
    title: 'Oglas se ne može pročitati',
    body: 'Stranica oglasa trenutno ne odgovara. Pokušaj ponovo za minutu.',
  },
  removed: {
    title: 'Oglas više nije dostupan',
    body: 'Prodavač ga je uklonio ili je istekao. Ako ga pratiš, ostaje na popisu kao uklonjen.',
    back: 'Natrag na početnu',
  },
  notFound: 'Ova provjera ne postoji.',
} as const

const verdictReasons = {
  great: (saving: number) => `Ispod tržišta za ${formatPrice(saving)}`,
  fair: 'U okviru tržišne cijene',
  noData: 'Premalo usporedivih oglasa',
  risk: 'Pogledaj znakove prijevare',
}

function qualityPhrase(quality: Extract<ListingQuality, { kind: 'score' }>): string {
  const parts: string[] = []
  const photos: Record<QualityLevel, string | null> = {
    good: 'Dobre fotografije',
    fair: 'Osnovne fotografije',
    poor: 'Slabe fotografije',
    unknown: null,
  }
  const description: Record<QualityLevel, string | null> = {
    good: 'jasan opis',
    fair: 'kratak opis',
    poor: 'oskudan opis',
    unknown: null,
  }
  const first = [photos[quality.photos], description[quality.description]].filter(Boolean).join(' i ')
  if (first) parts.push(`${first.charAt(0).toUpperCase()}${first.slice(1)}.`)
  const missing = quality.missingCount > 0 ? missingFacts(quality.missingCount) : 'Ništa važno ne nedostaje'
  const contradictions =
    quality.contradictionCount === 0
      ? ''
      : quality.contradictionCount === 1
        ? ', a jedan se ne slaže'
        : `, a ${String(quality.contradictionCount)} se ne slažu`
  parts.push(`${missing}${contradictions}.`)
  return parts.join(' ')
}

const scamPatternCopy: Record<ScamPatternCode, { clear: string; unknown: string; fired: (result: PatternResult) => string }> = {
  duplicate_photo: {
    clear: 'Fotografije se ne pojavljuju u drugim oglasima',
    unknown: 'Fotografije nismo mogli usporediti s drugim oglasima',
    fired: (result) => {
      const others = result.status === 'fired' && result.evidence.kind === 'duplicate_photo' ? result.evidence.otherListingCount : 0
      const where = plural.select(others) === 'one' ? 'drugom oglasu' : plural.select(others) === 'few' ? 'druga oglasa' : 'drugih oglasa'
      return `Ista slika u ${String(others)} ${where} drugog prodavača`
    },
  },
  off_platform_payment_link: {
    clear: 'Nema linkova za plaćanje ili dostavu izvan oglasnika',
    unknown: 'Linkove za plaćanje nismo mogli provjeriti',
    fired: () => 'Link za plaćanje ili dostavu izvan oglasnika. Ne plaćaj preko takvih stranica.',
  },
  price_far_below_market: {
    clear: 'Cijena nije sumnjivo niska za ovaj model',
    unknown: 'Premalo usporedivih oglasa da procijenimo je li cijena preniska',
    fired: (result) =>
      result.status === 'fired' && result.evidence.kind === 'price_far_below_market'
        ? `Cijena je ispod pola tržišne (${formatPrice(result.evidence.priceCents)} prema ${formatPrice(result.evidence.medianCents)})`
        : 'Cijena je ispod pola tržišne',
  },
  off_platform_contact: {
    clear: 'Ne traži dopisivanje izvan oglasnika',
    unknown: 'Kontakt izvan oglasnika nismo mogli provjeriti',
    fired: () => 'Traži kontakt izvan oglasnika (WhatsApp, Telegram ili e-mail).',
  },
  advance_payment_only: {
    clear: 'Ne traži samo uplatu unaprijed',
    unknown: 'Način plaćanja nismo mogli provjeriti',
    fired: () => 'Traži samo uplatu unaprijed, bez preuzimanja ili pouzeća.',
  },
  urgency_pressure: {
    clear: 'Ne požuruje kupca',
    unknown: 'Požurivanje nismo mogli provjeriti',
    fired: () => 'Požuruje kupca da odluči odmah.',
  },
}

export const reportCopy = {
  pageTitle,
  notFound: 'Za ovaj oglas još nemamo izvještaj.',
  breadcrumb: { home: 'Početna', watchlist: 'Praćeni oglasi', label: 'Putanja' },
  back: 'Natrag',
  header: {
    meta: (city: string | null, neighbourhood: string | null, postedAgo: string | null, photoCount: number) =>
      [
        [city, neighbourhood].filter(Boolean).join(', '),
        postedAgo && `objavljeno ${postedAgo}`,
        count(photoCount, 'fotografija', 'fotografije', 'fotografija'),
      ]
        .filter(Boolean)
        .join(' · '),
    open: 'Otvori oglas',
    openLabel: 'Otvori oglas u novoj kartici',
    refresh: 'Provjeri ponovo',
    track: 'Prati',
    tracked: 'Praćeno',
    trackGuest: 'Prati cijenu',
    /** "Zadnja provjera danas u 14:32", "… jučer u 9:05", "… 3. 10. 2026. u 14:32". */
    lastChecked: (checkedAt: string, now: string) => {
      const day = recentDayOffset(checkedAt, now)
      const when = day === 0 ? 'danas' : day === 1 ? 'jučer' : formatDate(checkedAt)
      return `Zadnja provjera ${when} u ${formatClock(checkedAt)}`
    },
    removed: 'Oglas više nije aktivan',
    demo: 'Primjer',
    photoAlt: (title: string) => `Fotografija oglasa: ${title}`,
    noPrice: 'Cijena nije navedena',
    trust: {
      labels: { checked: 'Provjereno', caution: 'Oprez', suspicious: 'Sumnjivo', unknown: 'Nedovoljno podataka' },
      suspicious: (signals: number) =>
        `Pronašli smo ${count(signals, 'znak prijevare', 'znaka prijevare', 'znakova prijevare')}`,
      caution: (reasons: CautionReason[], signals: number) =>
        reasons
          .map((reason) => {
            switch (reason) {
              case 'scam_signals':
                return count(signals, 'mogući znak prijevare', 'moguća znaka prijevare', 'mogućih znakova prijevare')
              case 'contradictions':
                return 'Opis i fotografije se ne slažu'
              case 'low_quality':
                return 'Slaba kvaliteta oglasa'
              case 'low_offer_score':
                return 'Niska ocjena ponude'
            }
          })
          .join(' · '),
      checked: (qualityValue: number, offerScoreValue: number | null) =>
        [
          'Nema znakova prijevare',
          `kvaliteta oglasa ${String(qualityValue)}/100`,
          offerScoreValue !== null && `ocjena ponude ${String(offerScoreValue)}/100`,
        ]
          .filter(Boolean)
          .join(' · '),
      unknown: 'Premalo podataka za procjenu. To nije znak rizika.',
    },
  },
  verdictReason: {
    haggle: (offerCents: number, savingCents: number) =>
      `Ponudi ~${formatPrice(offerCents)} · uštedi ${formatPrice(savingCents)}`,
    haggleLocked: (approxSavingCents: number) => `Možeš uštedjeti oko ${formatPrice(approxSavingCents)}`,
    ...verdictReasons,
  },
  tabs: {
    label: 'Dijelovi izvještaja',
    summary: 'Sažetak',
    findings: 'Podaci',
    price: 'Cijena',
    safety: 'Sigurnost',
    seller: 'Prodavač',
    beforeBuying: 'Prije kupnje',
  },
  summary: {
    heading: 'Sažetak',
    missingText: 'Sažetak još nije napisan. Ostatak izvještaja je spreman.',
    offerScore: 'Ocjena ponude',
    quality: 'Kvaliteta oglasa',
    outOf: '/100',
    offerScoreReason: (score: OfferScore) => {
      switch (score.kind) {
        case 'no_data':
          return `Još nemamo dovoljno podataka. Prodavač ima manje od 5 recenzija na ${brandName}.`
        case 'score':
          if (score.basis === 'reviews_only') return 'Ocjena se temelji samo na recenzijama prodavača.'
          if (score.priceDiffPercent === 0) return 'Cijena je na razini prosjeka. Ocjena uključuje i recenzije prodavača.'
          return `Cijena je ${percent(score.priceDiffPercent)} ${score.priceDiffPercent > 0 ? 'iznad' : 'ispod'} prosjeka. Ocjena uključuje i recenzije prodavača.`
      }
    },
    qualityReason: (quality: ListingQuality) =>
      quality.kind === 'score' ? qualityPhrase(quality) : 'Oglas nismo uspjeli pročitati do kraja.',
    noScore: 'Nema podataka',
  },
  findings: {
    heading: 'Što nedostaje ili se ne slaže',
    count: (value: number) => count(value, 'provjera', 'provjere', 'provjera'),
    contradiction: (label: string, textValue: string, photoValue: string) =>
      `${label}: ${textValue} u opisu, ${photoValue} na fotografiji`,
    contradictionDetail: (photoDescription: string, photoIndex: number) =>
      `${photoDescription} (${String(photoIndex)}. fotografija)`,
    missing: (label: string) => `Nije navedeno: ${midSentence(label)}`,
    confirmed: (labels: string[]) => {
      const last = labels.at(-1) ?? ''
      const [first = '', ...rest] = labels.slice(0, -1)
      const sentence =
        labels.length <= 1
          ? `${last} se slaže`
          : `${[first, ...rest.map(midSentence)].join(', ')} i ${midSentence(last)} slažu se`
      return `${sentence.charAt(0).toLocaleUpperCase('hr-HR')}${sentence.slice(1)}`
    },
    confirmedDetail: 'Naslov, opis i fotografije opisuju isto.',
    add: 'Dodaj u pitanja',
    added: 'U pitanjima',
    empty: 'Oglas navodi sve što obično tražimo.',
    unavailable: 'Podatke iz oglasa nismo uspjeli pročitati.',
  },
  price: {
    heading: 'Usporedba cijena',
    window: 'Zadnjih 30 dana',
    range: 'Tržišni raspon',
    comparableCount: (value: number) => count(value, 'usporediv oglas', 'usporediva oglasa', 'usporedivih oglasa'),
    thisListing: (priceCents: number) => `Ovaj oglas · ${formatPrice(priceCents)}`,
    average: (cents: number) => `Prosjek ${formatPrice(cents)}`,
    diff: (value: number) =>
      value === 0 ? 'Na razini prosjeka' : `${percent(value)} ${value > 0 ? 'iznad' : 'ispod'} prosjeka`,
    insufficient: (have: number) => `Premalo podataka za raspon (${String(have)} od potrebnih 5)`,
    widened: 'Usporedba bez obzira na memoriju',
    platform: 'Platforma',
    median: 'Medijan',
    listingsCount: (value: number) => count(value, 'oglas', 'oglasa', 'oglasa'),
    noData: 'Nema podataka',
    closest: 'Najsličniji oglasi',
    showAll: (value: number) => `Prikaži sve (${String(value)})`,
    showFewer: 'Prikaži manje',
    shownOf: (shown: number, total: number) => `${String(shown)} od ${String(total)}`,
    comparableMeta: (city: string | null, seenAgo: string) => [city, seenAgo].filter(Boolean).join(' · '),
    openComparable: (title: string) => `Otvori oglas: ${title}`,
    lock: {
      title: (rest: number) => `Još ${count(rest, 'usporediv oglas', 'usporediva oglasa', 'usporedivih oglasa')}`,
      body: 'Napravi račun i vidi sve s cijenama i linkovima.',
      action: 'Napravi račun',
    },
    none: 'Nismo našli usporedive oglase u zadnjih 30 dana.',
  },
  scam: {
    heading: 'Znakovi prijevare',
    patternCount: (value: number) => count(value, 'poznati obrazac', 'poznata obrasca', 'poznatih obrazaca'),
    clearTitle: 'Nema znakova prijevare',
    attentionTitle: (attention: number) =>
      attention === 1 ? 'Jedna stvar traži pažnju' : `${String(attention)} stvari traže pažnju`,
    riskTitle: 'Pronašli smo znakove prijevare',
    unknownTitle: 'Znakove prijevare nismo uspjeli provjeriti',
    unknownBody: 'Provjera nije uspjela. To nije znak rizika.',
    summary: (checked: string) => `Provjerili smo ${checked} prijevare s Njuškala i Facebooka.`,
    riskBody: 'Ne plaćaj unaprijed i ne otvaraj linkove iz poruka. Dokaz je naveden ispod.',
    patternsLabel: 'Obrasci prijevare',
    how: 'Kako provjeravamo',
    howBody:
      'Uspoređujemo fotografije s drugim oglasima u našoj bazi, cijenu s usporedivim oglasima, a tekst oglasa čitamo tražeći poznate trikove: linkove za plaćanje ili dostavu izvan oglasnika, dopisivanje izvan oglasnika, samo uplatu unaprijed i požurivanje. Novi profil sam po sebi nije znak prijevare.',
    pattern: (result: PatternResult) => {
      const copy = scamPatternCopy[result.code]
      switch (result.status) {
        case 'clear':
          return copy.clear
        case 'unknown':
          return copy.unknown
        case 'fired':
          return copy.fired(result)
      }
    },
    quote: (quote: string) => `„${quote}”`,
    message: {
      label: 'Poruka prodavača',
      placeholder: 'Zalijepi poruku prodavača da je provjerimo',
      submit: 'Provjeri poruku',
      checking: 'Provjeravam…',
      privacy: 'Poruku ne spremamo.',
      clearTitle: 'Poruka ne sadrži poznate trikove',
      clearBody: 'Svejedno plati tek kad vidiš stvar uživo.',
      riskTitle: 'Poruka sadrži poznate trikove',
      failed: 'Provjera poruke trenutno ne radi. Pokušaj ponovo.',
    },
  },
  seller: {
    heading: 'Prodavač i recenzije',
    memberSince: (marketplace: Marketplace, year: number | null, city: string | null) =>
      [
        year === null
          ? marketplaceNames[marketplace]
          : `Na ${marketplaceLocative[marketplace]} od ${String(year)}.`,
        city,
      ]
        .filter(Boolean)
        .join(' · '),
    rating: `Ocjena na ${brandName}`,
    reviewCount: (value: number) => count(value, 'recenzija', 'recenzije', 'recenzija'),
    noReviews: 'Još nema recenzija',
    newSeller: `Prodavač još nema recenzija na ${brandName}. To nije znak rizika.`,
    /** A published fact as a stat tile or a ✓ line. */
    fact: (fact: SellerFact): { kind: 'tile'; value: string; label: string } | { kind: 'check'; text: string } => {
      switch (fact.kind) {
        case 'active_listing_count':
          return { kind: 'tile', value: String(fact.count), label: 'aktivnih oglasa' }
        case 'marketplace_rating':
          return {
            kind: 'tile',
            value: new Intl.NumberFormat('hr-HR', { maximumFractionDigits: 1 }).format(fact.average),
            label: `ocjena na oglasniku (${String(fact.count)})`,
          }
        case 'phone_verified':
          return { kind: 'check', text: 'Broj telefona potvrđen' }
        case 'email_verified':
          return { kind: 'check', text: 'E-mail adresa potvrđena' }
        case 'seller_type':
          return { kind: 'check', text: fact.type === 'business' ? 'Registrirani trgovac' : 'Privatni prodavač' }
      }
    },
    sameOwner: (marketplace: Marketplace, others: Marketplace[]) =>
      `Isti profil na ${[marketplace, ...others].map((other) => marketplaceLocative[other]).join(' i ')}`,
    claimedByYou: 'Ovo je tvoj profil',
    profileLink: 'Profil na oglasniku',
    reviews: 'Recenzije',
    bought: (date: string) => `Kupnja · ${date}`,
    verified: 'Potvrđena kupnja',
    demo: 'Primjer',
    reply: (name: string) => `Odgovor prodavača · ${name}`,
    helpful: (value: number) => `Korisno (${String(value)})`,
    helpfulDone: (value: number) => `Označeno kao korisno (${String(value)})`,
    report: 'Prijavi',
    reported: 'Prijavljeno',
    reportReason: 'Uvredljivo ili lažno',
    replyForm: {
      open: 'Odgovori',
      label: 'Tvoj odgovor',
      submit: 'Objavi odgovor',
      cancel: 'Odustani',
      error: 'Odgovor nije objavljen. Pokušaj ponovo.',
      alreadyReplied: 'Na ovu recenziju je već odgovoreno.',
    },
    reviewForm: {
      heading: 'Napiši recenziju',
      intro: (name: string) => `Kupio si od prodavača ${name}? Recenzija je o ovom oglasu.`,
      stars: 'Ocjena',
      starLabel: (value: number) => count(value, 'zvjezdica', 'zvjezdice', 'zvjezdica'),
      text: 'Kako je prošla kupnja?',
      submit: 'Objavi recenziju',
      done: 'Hvala, recenzija je objavljena.',
      alreadyReviewed: 'Ovog prodavača si već ocijenio.',
      ownSeller: 'Ne možeš ocijeniti vlastiti profil.',
      error: 'Recenzija nije objavljena. Pokušaj ponovo.',
      chooseStars: 'Odaberi ocjenu.',
      writeText: 'Napiši nekoliko riječi.',
    },
    guestReview: 'Prijavi se da napišeš recenziju.',
  },
  questions: {
    heading: 'Što pitati prodavatelja?',
    copyAll: 'Kopiraj sva pitanja',
    copy: (text: string) => `Kopiraj pitanje: ${text}`,
    copied: 'Kopirano',
    empty: 'Pitanja će se pojaviti kad provjera završi.',
    fromMissing: (label: string) => `Možete li mi reći nešto više o ovome: ${midSentence(label)}?`,
    fromContradiction: (label: string, textValue: string, photoValue: string) =>
      `${label}: u opisu piše ${textValue}, a na fotografiji ${photoValue}. Možete li pojasniti?`,
  },
  checklist: {
    heading: 'Provjeri prije plaćanja',
    progress: (done: number, total: number) => `${String(done)} od ${String(total)}`,
    guestNote: 'Kvačice pamtimo kad se prijaviš.',
  },
  offer: {
    heading: 'Predložena ponuda',
    saving: (savingCents: number, savingPercent: number) =>
      `Uštedi ${formatPrice(savingCents)} (${String(savingPercent)} %)`,
    savingLocked: (approxSavingCents: number) => `Možeš uštedjeti oko ${formatPrice(approxSavingCents)}`,
    copy: 'Kopiraj ponudu',
    copied: 'Ponuda je kopirana',
    basis: 'Na temelju usporedivih oglasa na Njuškalu, Facebooku i Index oglasima.',
    noMessage: 'Poruka još nije napisana. Ponudu možeš kopirati kao iznos.',
    placeholderPrice: '000 €',
    placeholderMessage:
      'Pozdrav! Zanima me ovaj oglas. Biste li prihvatili ponudu? Mogu doći po njega danas i platiti pri preuzimanju.',
    lockLine: 'Napravi račun da vidiš točnu ponudu i kopiraš poruku za prodavača.',
    lockAction: 'Napravi račun i kopiraj',
    haveAccount: 'Već imaš račun?',
    signIn: 'Prijavi se',
    none: 'Ponudu predlažemo kad imamo barem 5 usporedivih oglasa.',
  },
  tracking: {
    title: 'Pratimo ovaj oglas',
    body: 'Javit ćemo ti ako cijena padne, oglas se promijeni ili nestane.',
  },
  claim: {
    action: 'Ovo je moj oglas',
    hint: 'Preuzmi oglas da možeš odgovarati na recenzije.',
    done: 'Oglas je tvoj. Sada možeš odgovarati na recenzije.',
    alreadyClaimed: 'Ovaj profil je već preuzeo netko drugi.',
    error: 'Preuzimanje nije uspjelo. Pokušaj ponovo.',
  },
  account: { signIn: 'Prijavi se' },
  actionFailed: 'Nije uspjelo. Pokušaj ponovo.',
} as const
