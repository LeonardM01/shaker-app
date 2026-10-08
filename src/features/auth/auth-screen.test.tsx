import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { AuthContext } from '#/features/auth/auth-context'
import type { AuthOutcome, AuthPort } from '#/features/auth/auth-port'
import { AuthScreen } from '#/features/auth/auth-screen'
import type { AuthMode } from '#/features/auth/auth-form'
import type { AuthSearch } from '#/features/auth/auth-search'

/** Intl puts a no-break space before "€"; accessible names keep it. */
const nbsp = (text: string) => text.replaceAll(' €', ' €')

const LISTING_ID = '6f1c2a4e-8b1d-4c3a-9e7f-2d5b8a1c0e93'
const REPORT = '/app/check?url=https%3A%2F%2Fwww.njuskalo.hr%2Fx-oglas-1'

const generic: AuthContext = { kind: 'generic' }
const iphone: AuthContext = {
  kind: 'listing',
  listing: {
    title: 'iPhone 13 Pro, 128 GB, zeleni',
    photoUrl: 'https://signed.test/iphone.jpg',
    verdict: 'room_to_haggle',
    priceCents: 64_000,
  },
}

const ok: AuthOutcome = { ok: true }

function fakePort(overrides: Partial<AuthPort> = {}) {
  return {
    signUp: vi.fn<AuthPort['signUp']>(() => Promise.resolve(ok)),
    signIn: vi.fn<AuthPort['signIn']>(() => Promise.resolve(ok)),
    signInWithGoogle: vi.fn<AuthPort['signInWithGoogle']>(() => new Promise(() => undefined)),
    ...overrides,
  }
}

async function renderAuth({
  mode = 'sign-up',
  context = generic,
  search = {},
  auth = fakePort(),
}: {
  mode?: AuthMode
  context?: AuthContext
  search?: AuthSearch
  auth?: ReturnType<typeof fakePort>
} = {}) {
  const onSignedIn = vi.fn(() => Promise.resolve())
  const screenFor = (screenMode: AuthMode) => () => (
    <AuthScreen
      mode={screenMode}
      auth={auth}
      context={context}
      search={search}
      onSignedIn={onSignedIn}
    />
  )
  const rootRoute = createRootRoute({ component: Outlet })
  const routeTree = rootRoute.addChildren([
    createRoute({ getParentRoute: () => rootRoute, path: '/sign-up', component: screenFor('sign-up') }),
    createRoute({ getParentRoute: () => rootRoute, path: '/sign-in', component: screenFor('sign-in') }),
    createRoute({ getParentRoute: () => rootRoute, path: '/app', component: () => <p>Početna</p> }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/app/check',
      component: () => <p>Izvještaj</p>,
    }),
  ])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [`/${mode}`] }),
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole('heading', { level: 1 })
  return { router, auth, onSignedIn, user: userEvent.setup() }
}

const username = () => screen.getByLabelText('Korisničko ime')
const email = () => screen.getByLabelText('E-mail adresa')
const password = () => screen.getByLabelText('Lozinka')
const signUpButton = () => screen.getByRole('button', { name: 'Napravi račun' })
const signInButton = () => screen.getByRole('button', { name: 'Prijavi se' })

async function fillSignUp(
  user: ReturnType<typeof userEvent.setup>,
  values: { username?: string; email?: string; password?: string } = {},
) {
  const { username: name = 'ivana_zg', email: mail = 'ivana@primjer.hr', password: pass = 'tajna-lozinka' } =
    values
  if (name) await user.type(username(), name)
  if (mail) await user.type(email(), mail)
  if (pass) await user.type(password(), pass)
}

describe('Registracija: the form', () => {
  it('renders the heading, the labelled fields, Google, the legal links and the toggle', async () => {
    await renderAuth({ search: { redirect: REPORT, listing: LISTING_ID } })

    expect(screen.getByRole('heading', { level: 1, name: 'Napravi račun' })).toBeInTheDocument()
    expect(username()).toHaveAccessibleDescription('Prikazuje se uz tvoje recenzije.')
    expect(username()).toHaveAttribute('autocomplete', 'nickname')
    expect(email()).toHaveAttribute('type', 'email')
    expect(email()).toHaveAttribute('autocomplete', 'email')
    expect(password()).toHaveAttribute('type', 'password')
    expect(password()).toHaveAttribute('autocomplete', 'new-password')
    for (const field of [username(), email(), password()]) {
      expect(field).toHaveAttribute('autocapitalize', 'off')
      expect(field).toHaveAttribute('spellcheck', 'false')
    }
    expect(screen.getByRole('button', { name: 'Nastavi s Googleom' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Uvjete korištenja' })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: 'Pravila privatnosti' })).toHaveAttribute('href', '/privacy')
    expect(screen.queryByRole('link', { name: 'Zaboravljena lozinka?' })).not.toBeInTheDocument()

    const toggle = new URL(
      screen.getByRole('link', { name: 'Prijavi se' }).getAttribute('href') ?? '',
      'http://x',
    )
    expect(toggle.pathname).toBe('/sign-in')
    expect(toggle.searchParams.get('redirect')).toBe(REPORT)
    expect(toggle.searchParams.get('listing')).toBe(LISTING_ID)
  })

  it('shows every problem in Croatian on an empty submit, focuses the first, and sends nothing', async () => {
    const { auth, user } = await renderAuth()

    await user.click(signUpButton())

    expect(username()).toHaveAccessibleDescription('Upiši korisničko ime.')
    expect(username()).toHaveAttribute('aria-invalid', 'true')
    expect(email()).toHaveAccessibleDescription('Upiši e-mail adresu.')
    expect(password()).toHaveAccessibleDescription('Upiši lozinku.')
    expect(username()).toHaveFocus()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('focuses the first invalid field when earlier ones are fine', async () => {
    const { user } = await renderAuth()

    await fillSignUp(user, { email: 'ivana@', password: 'kratka' })
    await user.click(signUpButton())

    expect(username()).not.toHaveAttribute('aria-invalid', 'true')
    expect(email()).toHaveAccessibleDescription('Upiši ispravnu e-mail adresu, npr. ime@primjer.hr.')
    expect(password()).toHaveAccessibleDescription('Lozinka mora imati barem 8 znakova.')
    expect(email()).toHaveFocus()
  })

  it.each([
    ['too short', 'iv', 'Korisničko ime mora imati barem 3 znaka.'],
    ['too long', 'a'.repeat(31), 'Korisničko ime može imati najviše 30 znakova.'],
    ['with a space', 'ivana zg', 'Koristi samo slova, brojeve, _ i točku.'],
    ['with a symbol', 'ivana@zg', 'Koristi samo slova, brojeve, _ i točku.'],
  ])('rejects a username that is %s', async (_, name, message) => {
    const { auth, user } = await renderAuth()

    await fillSignUp(user, { username: name })
    await user.click(signUpButton())

    expect(username()).toHaveAccessibleDescription(message)
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('validates on submit only, then again on every change', async () => {
    const { user } = await renderAuth()

    await user.type(username(), 'iv')
    expect(username()).toHaveAccessibleDescription('Prikazuje se uz tvoje recenzije.')
    await user.click(signUpButton())
    expect(username()).toHaveAccessibleDescription('Korisničko ime mora imati barem 3 znaka.')
    await user.type(username(), 'a')

    expect(username()).toHaveAccessibleDescription('Prikazuje se uz tvoje recenzije.')
    expect(username()).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('sends the trimmed username, the trimmed lower-cased e-mail and the untouched password', async () => {
    const { auth, user } = await renderAuth()

    await fillSignUp(user, {
      username: '  Đurđa.Čakovec_3 ',
      email: '  Ivana@Primjer.HR ',
      password: ' razmak na kraju ',
    })
    await user.click(signUpButton())

    expect(auth.signUp).toHaveBeenCalledExactlyOnceWith({
      username: 'Đurđa.Čakovec_3',
      email: 'ivana@primjer.hr',
      password: ' razmak na kraju ',
    })
  })

  it('signs in the app, then lands on the redirect', async () => {
    const { router, onSignedIn, user } = await renderAuth({ search: { redirect: REPORT } })

    await fillSignUp(user)
    await user.click(signUpButton())

    await screen.findByText('Izvještaj')
    expect(onSignedIn).toHaveBeenCalledOnce()
    expect(router.state.location.href).toBe(REPORT)
  })

  it('lands on Početna without a redirect', async () => {
    const { router, user } = await renderAuth()

    await fillSignUp(user)
    await user.click(signUpButton())

    await screen.findByText('Početna')
    expect(router.state.location.pathname).toBe('/app')
  })

  it('says the e-mail is taken under the field, linking to sign-in with the redirect', async () => {
    const auth = fakePort({ signUp: vi.fn(() => Promise.resolve({ ok: false, reason: 'email_taken' } as const)) })
    const { router, user } = await renderAuth({ auth, search: { redirect: REPORT, listing: LISTING_ID } })

    await fillSignUp(user)
    await user.click(signUpButton())

    expect(await screen.findByText('Račun s ovim e-mailom već postoji.')).toBeInTheDocument()
    expect(email()).toHaveAccessibleDescription(/Račun s ovim e-mailom već postoji\./)
    expect(email()).toHaveAttribute('aria-invalid', 'true')
    const links = screen.getAllByRole('link', { name: 'Prijavi se' })
    const hrefs = links.map((link) => new URL(link.getAttribute('href') ?? '', 'http://x'))
    expect(hrefs).toHaveLength(2)
    for (const href of hrefs) {
      expect(href.pathname).toBe('/sign-in')
      expect(href.searchParams.get('redirect')).toBe(REPORT)
    }
    expect(router.state.location.pathname).toBe('/sign-up')
  })

  it.each([
    ['rate_limited', 'Previše pokušaja. Pričekaj minutu pa pokušaj ponovno.'],
    ['unavailable', 'Nešto nije u redu na našoj strani. Pokušaj ponovno.'],
  ] as const)('shows a form-level alert for %s', async (reason, message) => {
    const auth = fakePort({ signUp: vi.fn(() => Promise.resolve({ ok: false, reason } as const)) })
    const { onSignedIn, user } = await renderAuth({ auth })

    await fillSignUp(user)
    await user.click(signUpButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(onSignedIn).not.toHaveBeenCalled()
  })

  it('ignores a second submit while the first is in flight', async () => {
    let finish: (outcome: AuthOutcome) => void = () => undefined
    const auth = fakePort({
      signUp: vi.fn(
        () =>
          new Promise<AuthOutcome>((resolve) => {
            finish = resolve
          }),
      ),
    })
    const { user } = await renderAuth({ auth })

    await fillSignUp(user)
    await user.click(signUpButton())
    expect(signUpButton()).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Nastavi s Googleom' })).toBeDisabled()
    await user.click(signUpButton())
    await user.type(password(), '{Enter}')

    expect(auth.signUp).toHaveBeenCalledOnce()
    finish({ ok: false, reason: 'unavailable' })
    await screen.findByRole('alert')
    expect(signUpButton()).not.toHaveAttribute('aria-busy', 'true')
  })

  it('shows and hides the password without submitting', async () => {
    const { auth, user } = await renderAuth()

    await user.type(password(), 'tajna')
    await user.click(screen.getByRole('button', { name: 'Prikaži lozinku' }))

    expect(password()).toHaveAttribute('type', 'text')
    const hide = screen.getByRole('button', { name: 'Sakrij lozinku' })
    expect(hide).toHaveAttribute('aria-pressed', 'true')
    await user.click(hide)
    expect(password()).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Prikaži lozinku' })).toHaveAttribute('aria-pressed', 'false')
    expect(auth.signUp).not.toHaveBeenCalled()
    expect(username()).not.toHaveAttribute('aria-invalid', 'true')
  })
})

describe('Prijava: the form', () => {
  it('renders e-mail and current password, and toggles to sign-up keeping the redirect', async () => {
    await renderAuth({ mode: 'sign-in', search: { redirect: REPORT, listing: LISTING_ID } })

    expect(screen.getByRole('heading', { level: 1, name: 'Prijavi se' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Korisničko ime')).not.toBeInTheDocument()
    expect(password()).toHaveAttribute('autocomplete', 'current-password')
    const toggle = new URL(
      screen.getByRole('link', { name: 'Napravi ga' }).getAttribute('href') ?? '',
      'http://x',
    )
    expect(toggle.pathname).toBe('/sign-up')
    expect(toggle.searchParams.get('redirect')).toBe(REPORT)
    expect(toggle.searchParams.get('listing')).toBe(LISTING_ID)
  })

  it('accepts any non-empty password', async () => {
    const { auth, user } = await renderAuth({ mode: 'sign-in' })

    await user.type(email(), 'Ana@Primjer.hr')
    await user.type(password(), 'x')
    await user.click(signInButton())

    expect(auth.signIn).toHaveBeenCalledExactlyOnceWith({ email: 'ana@primjer.hr', password: 'x' })
  })

  it('requires an e-mail and a password', async () => {
    const { auth, user } = await renderAuth({ mode: 'sign-in' })

    await user.click(signInButton())

    expect(email()).toHaveAccessibleDescription('Upiši e-mail adresu.')
    expect(password()).toHaveAccessibleDescription('Upiši lozinku.')
    expect(email()).toHaveFocus()
    expect(auth.signIn).not.toHaveBeenCalled()
  })

  it('says the e-mail or password is wrong, keeping the e-mail and clearing the password', async () => {
    const auth = fakePort({
      signIn: vi.fn(() => Promise.resolve({ ok: false, reason: 'invalid_credentials' } as const)),
    })
    const { user } = await renderAuth({ mode: 'sign-in', auth })

    await user.type(email(), 'ana@primjer.hr')
    await user.type(password(), 'kriva')
    await user.click(signInButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ili lozinka nisu točni.')
    expect(email()).toHaveValue('ana@primjer.hr')
    expect(password()).toHaveValue('')
  })

  it('lands on the redirect after signing in', async () => {
    const { router, onSignedIn, user } = await renderAuth({ mode: 'sign-in', search: { redirect: '/app' } })

    await user.type(email(), 'ana@primjer.hr')
    await user.type(password(), 'lozinka')
    await user.click(signInButton())

    await screen.findByText('Početna')
    expect(onSignedIn).toHaveBeenCalledOnce()
    expect(router.state.location.pathname).toBe('/app')
  })
})

describe('Google', () => {
  it.each(['sign-up', 'sign-in'] as const)(
    'on %s, starts Google with the absolute destination and an error callback back here',
    async (mode) => {
      const { auth, user } = await renderAuth({ mode, search: { redirect: REPORT, listing: LISTING_ID } })

      await user.click(screen.getByRole('button', { name: 'Nastavi s Googleom' }))

      const [[input]] = auth.signInWithGoogle.mock.calls as [[Parameters<AuthPort['signInWithGoogle']>[0]]]
      expect(input.callbackURL).toBe(`${window.location.origin}${REPORT}`)
      const errorCallback = new URL(input.errorCallbackURL)
      expect(errorCallback.origin).toBe(window.location.origin)
      expect(errorCallback.pathname).toBe(`/${mode}`)
      expect(errorCallback.searchParams.get('redirect')).toBe(REPORT)
      expect(errorCallback.searchParams.get('listing')).toBe(LISTING_ID)
      expect(errorCallback.searchParams.get('error')).toBe('google')
    },
  )

  it('disables the e-mail submit while Google is starting', async () => {
    const { auth, user } = await renderAuth()

    await user.click(screen.getByRole('button', { name: 'Nastavi s Googleom' }))
    await fillSignUp(user)
    await user.click(signUpButton())

    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('shows an alert when Google could not start', async () => {
    const auth = fakePort({
      signInWithGoogle: vi.fn(() => Promise.resolve({ ok: false, reason: 'unavailable' } as const)),
    })
    const { user } = await renderAuth({ auth })

    await user.click(screen.getByRole('button', { name: 'Nastavi s Googleom' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nešto nije u redu na našoj strani. Pokušaj ponovno.',
    )
    expect(screen.getByRole('button', { name: 'Nastavi s Googleom' })).toBeEnabled()
  })

  it('explains a failed Google sign-in on load', async () => {
    await renderAuth({ search: { error: 'google' } })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Prijava s Googleom nije uspjela. Pokušaj ponovno ili koristi e-mail.',
    )
  })
})

describe('Context panel', () => {
  it('shows the listing with its formatted price and verdict, and the way back to the report', async () => {
    await renderAuth({ context: iphone, search: { redirect: REPORT } })

    const panel = within(screen.getByRole('complementary', { name: 'Tvoj izvještaj te čeka' }))
    expect(panel.getByText('Nakon prijave vraćamo te točno ovdje.')).toBeInTheDocument()
    expect(panel.getByText('iPhone 13 Pro, 128 GB, zeleni')).toBeInTheDocument()
    expect(panel.getByText(nbsp('640 €'))).toBeInTheDocument()
    expect(panel.getByText('Prostor za pregovor')).toBeInTheDocument()
    expect(panel.getByText('Predložena ponuda')).toBeInTheDocument()
    expect(panel.getByText('Kopiraj predloženu ponudu')).toBeInTheDocument()
    expect(screen.getByText('Tvoj izvještaj za iPhone 13 Pro, 128 GB, zeleni te čeka')).toBeInTheDocument()

    const back = screen.getByRole('link', { name: 'Natrag na izvještaj' })
    expect(back).toHaveAttribute('href', REPORT)
  })

  it('keeps the offer placeholder away from assistive tech', async () => {
    await renderAuth({ context: iphone })

    const placeholder = screen.getByText(nbsp('000 €'))
    expect(placeholder.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('shows no badge for a listing without a verdict', async () => {
    const context: AuthContext = { kind: 'listing', listing: { ...iphone.listing, verdict: null } }
    await renderAuth({ context })

    const panel = within(screen.getByRole('complementary', { name: 'Tvoj izvještaj te čeka' }))
    expect(panel.queryByText('Prostor za pregovor')).not.toBeInTheDocument()
    expect(panel.queryByText('Rizik')).not.toBeInTheDocument()
  })

  it('shows only the benefits in the generic variant, and a plain way back', async () => {
    await renderAuth({ context: generic, search: { redirect: REPORT } })

    const panel = within(screen.getByRole('complementary', { name: 'Što dobivaš s računom' }))
    expect(panel.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Kopiraj predloženu ponuduTočan iznos i poruka za prodavača, spremni za slanje.',
      'Prati cijeneJavimo ti kad oglas pojeftini, promijeni se ili nestane.',
      'Svi usporedivi oglasiS cijenama i linkovima na Njuškalo, Facebook i Index oglase.',
    ])
    expect(panel.queryByText('Predložena ponuda')).not.toBeInTheDocument()
    expect(screen.queryByText(/Tvoj izvještaj/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Natrag na izvještaj' })).not.toBeInTheDocument()
    for (const back of screen.getAllByRole('link', { name: 'Natrag' })) {
      expect(back).toHaveAttribute('href', REPORT)
    }
  })

  it('goes back to Početna without a redirect', async () => {
    await renderAuth()

    for (const back of screen.getAllByRole('link', { name: 'Natrag' })) {
      expect(back).toHaveAttribute('href', '/app')
    }
  })
})
