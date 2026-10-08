// Njuškalo writes Zagreb locations by city district ("Trešnjevka - Sjever"),
// never as "Zagreb". These helpers turn its location strings into city and
// neighbourhood the same way for listing, search and seller pages.

import { cleanLine } from '#/features/marketplaces/parsing'

type Place = { city: string | null; neighbourhood: string | null }

const zagreb = 'Zagreb'
const zagrebRegion = 'Grad Zagreb'

/** The 17 city districts (gradske četvrti) of Zagreb. */
const zagrebDistricts = new Set([
  'Brezovica',
  'Črnomerec',
  'Donja Dubrava',
  'Donji grad',
  'Gornja Dubrava',
  'Gornji grad - Medveščak',
  'Maksimir',
  'Novi Zagreb - Istok',
  'Novi Zagreb - Zapad',
  'Peščenica - Žitnjak',
  'Podsljeme',
  'Podsused - Vrapče',
  'Sesvete',
  'Stenjevec',
  'Trešnjevka - Jug',
  'Trešnjevka - Sjever',
  'Trnje',
])

function place(city: string | null, neighbourhood: string | null): Place {
  const cleanCity = cleanLine(city, 120)
  const cleanNeighbourhood = cleanLine(neighbourhood, 120)
  return {
    city: cleanCity,
    neighbourhood: cleanNeighbourhood === cleanCity ? null : cleanNeighbourhood,
  }
}

/** Listing pages: "Krapinsko-zagorska, Zabok, Zabok" (region, municipality, settlement). */
export function listingPlace(text: string | null | undefined): Place {
  const [region, municipality, settlement] = (text ?? '').split(',').map((part) => part.trim())
  if (!region) return place(null, null)
  if (region === zagrebRegion) return place(zagreb, settlement ?? municipality ?? null)
  return place(municipality ?? null, settlement ?? null)
}

/** Search results: "Dugave - Novi Zagreb - Istok" (settlement, then municipality or district). */
export function searchResultPlace(text: string | null | undefined): Place {
  const value = (text ?? '').trim()
  const split = value.indexOf(' - ')
  if (split === -1) return place(value === '' ? null : value, null)
  const settlement = value.slice(0, split)
  const municipality = value.slice(split + 3)
  return zagrebDistricts.has(municipality) ? place(zagreb, settlement) : place(municipality, settlement)
}

/** Seller profiles: "49221 Bedekovčina, Krapinsko-zagorska, Hrvatska" or "Grad Zagreb, Hrvatska". */
export function sellerCity(text: string | null | undefined): string | null {
  const first = (text ?? '').split(',')[0]?.replace(/^\s*\d{5}\s+/, '').trim()
  if (!first) return null
  return cleanLine(first === zagrebRegion ? zagreb : first, 120)
}
