// Croatian strings for the shared UI components.

import type { Verdict } from '#/lib/listing'

export const verdictLabels: Record<Verdict, string> = {
  great_price: 'Odlična cijena',
  fair_price: 'Fer cijena',
  room_to_haggle: 'Prostor za pregovor',
  risk: 'Rizik',
  no_data: 'Nema podataka',
}

/** Names the full verdict badge for screen readers. */
export const verdictGroupLabel = 'Presuda'

export const shellCopy = {
  skipLink: 'Preskoči na sadržaj',
  logo: 'Vrijedi.Ly',
  nav: 'Glavna navigacija',
  home: 'Početna',
  /** Titles of screens that are only navigation targets for now. */
  pendingScreens: {
    check: 'Provjera u tijeku',
    terms: 'Uvjeti korištenja',
    privacy: 'Pravila privatnosti',
  },
  checkStartFailed: 'Provjeru trenutno ne možemo pokrenuti. Pokušaj ponovo za minutu.',
  extension: {
    title: 'Vrijedi.Ly u Chromeu',
    body: 'Ocjena se pojavi uz cijenu dok listaš Njuškalo.',
    action: 'Dodaj besplatno',
  },
} as const
