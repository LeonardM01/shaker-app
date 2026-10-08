import { parse } from 'node-html-parser'
import type { HTMLElement } from 'node-html-parser'
import { z } from 'zod'

import { sellerProfileSchema } from '#/features/marketplaces/marketplace-reader'
import type { SellerFact, SellerProfile } from '#/features/marketplaces/marketplace-reader'
import { sellerCity } from '#/features/marketplaces/njuskalo/location'
import { njuskaloSellerUrl } from '#/features/marketplaces/njuskalo/njuskalo-urls'
import { cleanLine, croatianDay, jsonObjectAt, parseFailed, validated } from '#/features/marketplaces/parsing'

// Private sellers (/korisnik/…) get a "UserProfileDetails" page, stores
// (/trgovina/…) a "BrandPage". Both boot their header from the same JSON.
const bootSchema = z.object({
  name: z.enum(['UserProfileDetails', 'BrandPage']),
  values: z.object({
    profileData: z.unknown().optional(),
    brandData: z.unknown().optional(),
  }),
})

const profileSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string(),
  url: z.string(),
  /** "11.12.2007." */
  registrationDate: z.string().nullish(),
})

const bootPrefix = 'app.boot.push('

function readProfileBoot(root: HTMLElement) {
  for (const script of root.querySelectorAll('script')) {
    const source = script.rawText
    let at = source.indexOf(bootPrefix)
    while (at !== -1) {
      const boot = bootSchema.safeParse(jsonObjectAt(source, at + bootPrefix.length))
      if (boot.success) {
        const data = boot.data.name === 'BrandPage' ? boot.data.values.brandData : boot.data.values.profileData
        return { isStore: boot.data.name === 'BrandPage', profile: validated(profileSchema, data, 'Njuškalo seller profile') }
      }
      at = source.indexOf(bootPrefix, at + bootPrefix.length)
    }
  }
  return null
}

/** The text of the contact row marked with a given icon ("…IconPin" for the address). */
function contactRowText(root: HTMLElement, icon: string): string | null {
  const row = root.querySelector(`i.${icon}`)?.parentNode
  return row ? cleanLine(row.text, 300) : null
}

function rating(root: HTMLElement): SellerFact | null {
  const box = root.querySelector('.UserRating-rating')
  // "5,0" and "(11)"
  const average = Number(box?.querySelector('strong')?.text.trim().replace(',', '.'))
  const count = Number(/\((\d+)\)/.exec(box?.querySelector('span')?.text ?? '')?.[1])
  if (!Number.isFinite(average) || !Number.isInteger(count) || count === 0) return null
  return { kind: 'marketplace_rating', average, scale: 5, count }
}

/**
 * Reads a Njuškalo seller profile (`/korisnik/<name>` or `/trgovina/<name>`).
 * Returns null when Njuškalo says the profile doesn't exist.
 */
export function parseNjuskaloSellerPage(html: string): SellerProfile | null {
  const root = parse(html)
  const boot = readProfileBoot(root)
  if (!boot) {
    if (root.querySelector('title')?.text.includes('nepostojeća stranica')) return null
    return parseFailed('Njuškalo seller page has no profile data')
  }

  // The profile header; listing rows further down have their own icons.
  const header = root.querySelector(boot.isStore ? '.BrandPage-header' : '.UserProfileDetails') ?? root
  const facts: SellerFact[] = []
  const listingCount = Number(root.querySelector('strong.entities-count')?.text.trim())
  if (Number.isInteger(listingCount)) facts.push({ kind: 'active_listing_count', count: listingCount })
  // "Korisnik je verificirao broj telefona u državi: Hrvatska"
  if (header.querySelector('i.icon--userProfileIconVerified')) facts.push({ kind: 'phone_verified' })
  const ratingFact = rating(header)
  if (ratingFact) facts.push(ratingFact)
  // Stores are businesses; private profiles say "Korisnik nije trgovac …" (or that they are one).
  const traderNote = contactRowText(header, 'icon--userProfileIconUser')
  if (boot.isStore) facts.push({ kind: 'seller_type', type: 'business' })
  else if (traderNote?.includes('trgovac')) {
    facts.push({ kind: 'seller_type', type: traderNote.includes('nije trgovac') ? 'private' : 'business' })
  }

  const { profile } = boot
  return validated(
    sellerProfileSchema,
    {
      externalId: profile.id,
      displayName: cleanLine(profile.title, 200),
      profileUrl: njuskaloSellerUrl(profile.url),
      memberSince: croatianDay(profile.registrationDate),
      city: sellerCity(contactRowText(header, 'icon--userProfileIconPin')),
      facts,
    },
    'Njuškalo seller profile',
  )
}
