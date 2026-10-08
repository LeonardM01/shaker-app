// Every Croatian string on Registracija and Prijava. Kept out of the
// components so i18n can replace this module later. The error strings and the
// generic panel heading are still to be confirmed with the designer.

import type { AuthFailure } from '#/features/auth/auth-port'
import { pageTitle } from '#/components/ui/copy'

export const authCopy = {
  signUp: {
    pageTitle: pageTitle('Registracija'),
    heading: 'Napravi račun',
    subtitle: 'Za kopiranje ponude, praćenje cijena i sve usporedive oglase.',
    submit: 'Napravi račun',
    toggleQuestion: 'Već imaš račun?',
    toggleAction: 'Prijavi se',
  },
  signIn: {
    pageTitle: pageTitle('Prijava'),
    heading: 'Prijavi se',
    subtitle: 'Upiši e-mail i lozinku ili nastavi s Googleom.',
    submit: 'Prijavi se',
    toggleQuestion: 'Nemaš račun?',
    toggleAction: 'Napravi ga',
  },

  google: 'Nastavi s Googleom',
  divider: 'ili',
  back: 'Natrag',
  backToReport: 'Natrag na izvještaj',

  fields: {
    username: {
      label: 'Korisničko ime',
      placeholder: 'npr. ivana_zg',
      helper: 'Prikazuje se uz tvoje recenzije.',
    },
    email: { label: 'E-mail adresa', placeholder: 'ime@primjer.hr' },
    password: {
      label: 'Lozinka',
      placeholderNew: 'Najmanje 8 znakova',
      placeholderCurrent: 'Upiši lozinku',
      show: 'Prikaži lozinku',
      hide: 'Sakrij lozinku',
    },
  },

  /** Field errors: each names the problem and how to fix it. */
  invalid: {
    usernameRequired: 'Upiši korisničko ime.',
    usernameTooShort: 'Korisničko ime mora imati barem 3 znaka.',
    usernameTooLong: 'Korisničko ime može imati najviše 30 znakova.',
    usernameCharacters: 'Koristi samo slova, brojeve, _ i točku.',
    emailRequired: 'Upiši e-mail adresu.',
    emailInvalid: 'Upiši ispravnu e-mail adresu, npr. ime@primjer.hr.',
    passwordRequired: 'Upiši lozinku.',
    passwordTooShort: 'Lozinka mora imati barem 8 znakova.',
    passwordTooLong: 'Lozinka može imati najviše 128 znakova.',
  },

  emailTaken: 'Račun s ovim e-mailom već postoji.',
  emailTakenAction: 'Prijavi se',

  /** Form-level alerts. */
  alerts: {
    invalid_credentials: 'E-mail ili lozinka nisu točni.',
    rate_limited: 'Previše pokušaja. Pričekaj minutu pa pokušaj ponovno.',
    unavailable: 'Nešto nije u redu na našoj strani. Pokušaj ponovno.',
    google: 'Prijava s Googleom nije uspjela. Pokušaj ponovno ili koristi e-mail.',
  } satisfies Record<Exclude<AuthFailure, 'email_taken'> | 'google', string>,

  legal: {
    before: 'Nastavkom prihvaćaš ',
    terms: 'Uvjete korištenja',
    between: ' i ',
    privacy: 'Pravila privatnosti',
    after: '.',
  },

  context: {
    listingHeading: 'Tvoj izvještaj te čeka',
    listingSubtitle: 'Nakon prijave vraćamo te točno ovdje.',
    genericHeading: 'Što dobivaš s računom',
    offerLabel: 'Predložena ponuda',
    /** A fixed placeholder under the blur. Never the real offer. */
    offerPlaceholder: '000 €',
    mobileHeading: (title: string) => `Tvoj izvještaj za ${title} te čeka`,
    mobileSubtitle: 'Nakon prijave vraćamo te ovdje.',
    benefits: [
      {
        id: 'copy-offer',
        title: 'Kopiraj predloženu ponudu',
        body: 'Točan iznos i poruka za prodavača, spremni za slanje.',
      },
      {
        id: 'track-prices',
        title: 'Prati cijene',
        body: 'Javimo ti kad oglas pojeftini, promijeni se ili nestane.',
      },
      {
        id: 'comparables',
        title: 'Svi usporedivi oglasi',
        body: 'S cijenama i linkovima na Njuškalo, Facebook i Index oglase.',
      },
    ],
  },
} as const
