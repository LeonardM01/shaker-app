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

import { HomeScreen } from '#/features/home/home-screen'
import type { HomeResult, WatchlistRow } from '#/features/home/home-result'

const NOW = '2026-10-08T12:00:00.000Z'
/** Intl puts a no-break space before "€"; accessible names keep it. */
const nbsp = (text: string) => text.replaceAll(' €', '\u00a0€')
const minutesAgo = (minutes: number) => new Date(Date.parse(NOW) - minutes * 60_000).toISOString()

function row(overrides: Partial<WatchlistRow> & { listingId: string }): WatchlistRow {
  return {
    title: 'PlayStation 5 + 2 kontrolera',
    marketplace: 'facebook_marketplace',
    city: 'Split',
    photoUrl: null,
    verdict: 'great_price',
    priceCents: 34_000,
    line: { kind: 'unchanged' },
    ...overrides,
  }
}

function signedIn(overrides: Partial<Extract<HomeResult, { kind: 'signed_in' }>> = {}): HomeResult {
  return {
    kind: 'signed_in',
    now: NOW,
    viewer: { initials: 'MB' },
    banner: null,
    changed: [],
    unchanged: [],
    totalCount: 0,
    ...overrides,
  }
}

async function renderHome(home: HomeResult) {
  const onRetry = vi.fn()
  const onUntrack = vi.fn()
  const rootRoute = createRootRoute({ component: Outlet })
  const routeTree = rootRoute.addChildren([
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/app',
      component: () => <HomeScreen home={home} onRetry={onRetry} onUntrack={onUntrack} />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/app/check',
      component: () => <p>Provjera u tijeku</p>,
    }),
  ])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/app'] }),
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole('heading', { level: 1, name: 'Provjeri oglas' })
  return { router, onRetry, onUntrack, user: userEvent.setup() }
}

const field = () => screen.getByRole('textbox', { name: 'Link oglasa' })
const submit = () => screen.getByRole('button', { name: 'Provjeri' })

describe('Početna: pasting a link', () => {
  it.each([
    [
      'https://www.njuskalo.hr/mobiteli/iphone-13-pro-oglas-44710238',
      'Njuškalo',
      'https://www.njuskalo.hr/mobiteli/iphone-13-pro-oglas-44710238',
    ],
    [
      'njuskalo.hr/mobiteli/iphone-13-pro-oglas-44710238/?utm_source=share',
      'Njuškalo',
      'https://www.njuskalo.hr/mobiteli/iphone-13-pro-oglas-44710238',
    ],
    [
      'https://m.facebook.com/marketplace/item/1234567890/?ref=search&tracking=abc',
      'Facebook Marketplace',
      'https://www.facebook.com/marketplace/item/1234567890/',
    ],
    [
      '  www.index.hr/oglasi/osobni-automobili/oglas/golf-7/3975904?fbclid=xyz  ',
      'Index oglasi',
      'https://www.index.hr/oglasi/osobni-automobili/oglas/golf-7/3975904',
    ],
  ])('recognises %s and checks its canonical URL', async (input, marketplace, canonical) => {
    const { router, user } = await renderHome({ kind: 'guest' })

    await user.type(field(), input)
    expect(screen.getByText(`Link je prepoznat: ${marketplace}.`)).toBeInTheDocument()
    await user.click(submit())

    await screen.findByText('Provjera u tijeku')
    expect(router.state.location.pathname).toBe('/app/check')
    expect(router.state.location.search).toEqual({ url: canonical })
  })

  it('submits on Enter', async () => {
    const { router, user } = await renderHome({ kind: 'guest' })

    await user.type(field(), 'njuskalo.hr/x/stan-oglas-123{Enter}')

    await screen.findByText('Provjera u tijeku')
    expect(router.state.location.search).toEqual({ url: 'https://www.njuskalo.hr/x/stan-oglas-123' })
  })

  it.each([
    ['search words', 'iphone 13 pro zagreb'],
    ['a supported homepage', 'https://www.njuskalo.hr/'],
    ['supported search results', 'https://www.index.hr/oglasi/mobiteli?q=iphone'],
    ['a Facebook page that is not an item', 'facebook.com/marketplace/zagreb/search?query=ps5'],
  ])('rejects %s on submit only, keeping the input', async (_, input) => {
    const { router, user } = await renderHome({ kind: 'guest' })

    await user.type(field(), input)
    expect(screen.queryByText(/Ovo nije link na oglas/)).not.toBeInTheDocument()
    await user.click(submit())

    expect(field()).toHaveAccessibleDescription(
      'Ovo nije link na oglas. Zalijepi adresu koja počinje s njuskalo.hr, facebook.com/marketplace ili index.hr/oglasi.',
    )
    expect(field()).toHaveValue(input)
    expect(router.state.location.pathname).toBe('/app')
  })

  it.each(['https://www.vinted.hr/items/123-jakna', 'https://www.ebay.de/itm/123'])(
    'explains calmly that %s is not read yet',
    async (input) => {
      const { router, user } = await renderHome({ kind: 'guest' })

      await user.type(field(), input)
      await user.click(submit())

      expect(screen.getByText('Ovu stranicu još ne čitamo')).toBeInTheDocument()
      expect(field()).toHaveAccessibleDescription(/Za sada provjeravamo oglase s Njuškala/)
      expect(field()).toHaveValue(input)
      expect(router.state.location.pathname).toBe('/app')
    },
  )

  it('clears the error once the input changes', async () => {
    const { user } = await renderHome({ kind: 'guest' })

    await user.type(field(), 'iphone')
    await user.click(submit())
    await user.type(field(), ' 13')

    expect(screen.queryByText(/Ovo nije link na oglas/)).not.toBeInTheDocument()
  })

  it('lists the supported marketplaces', async () => {
    await renderHome({ kind: 'guest' })

    const supported = screen.getByRole('list', { name: 'Radi s' })
    expect(within(supported).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Njuškalo',
      'Facebook Marketplace',
      'Index oglasi',
    ])
  })
})

describe('Početna: signed in', () => {
  it('groups rows under headings, skipping empty groups', async () => {
    await renderHome(signedIn({ unchanged: [row({ listingId: 'a' })], totalCount: 1 }))

    expect(screen.getByRole('list', { name: 'Bez promjene' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /Promijenilo se/ })).not.toBeInTheDocument()
  })

  it('renders each row with its verdict, hr-HR price and secondary line', async () => {
    await renderHome(
      signedIn({
        changed: [
          row({ listingId: 'ps5', line: { kind: 'price_change', deltaCents: -4_000 } }),
          row({
            listingId: 'bike',
            title: 'Scott Scale 970, veličina M',
            marketplace: 'index_oglasi',
            city: 'Rijeka',
            verdict: 'fair_price',
            priceCents: 1_252_000,
            line: { kind: 'price_change', deltaCents: 1_500 },
          }),
          row({
            listingId: 'drill',
            title: 'Makita bušilica',
            marketplace: 'njuskalo',
            city: 'Osijek',
            verdict: 'risk',
            priceCents: 9_500,
            line: { kind: 'risk_evidence', evidence: { kind: 'duplicate_photo', count: 3 } },
          }),
        ],
        unchanged: [
          row({ listingId: 'phone', title: 'iPhone 13 Pro', verdict: 'room_to_haggle' }),
          row({
            listingId: 'sofa',
            title: 'Kauč',
            verdict: 'no_data',
            line: { kind: 'too_few_comparables' },
          }),
        ],
        totalCount: 12,
      }),
    )

    const changed = within(screen.getByRole('list', { name: 'Promijenilo se od zadnje provjere' }))
    const [ps5, bike, drill] = changed.getAllByRole('article')
    expect(ps5).toHaveAccessibleName(
      nbsp('PlayStation 5 + 2 kontrolera, Odlična cijena, 340 €, −40 € od zadnje provjere'),
    )
    expect(bike).toHaveAccessibleName(
      nbsp('Scott Scale 970, veličina M, Fer cijena, 12.520 €, +15 € od zadnje provjere'),
    )
    expect(within(bike!).getByText('Index oglasi · Rijeka')).toBeInTheDocument()
    expect(drill).toHaveAccessibleName(nbsp('Makita bušilica, Rizik, 95 €, ista slika u 3 druga oglasa'))

    const unchanged = within(screen.getByRole('list', { name: 'Bez promjene' }))
    const [phone, sofa] = unchanged.getAllByRole('article')
    expect(phone).toHaveAccessibleName(nbsp('iPhone 13 Pro, Prostor za pregovor, 340 €, bez promjene'))
    expect(sofa).toHaveAccessibleName(nbsp('Kauč, Nema podataka, 340 €, premalo usporedivih oglasa'))
  })

  it.each([
    [1, 'ista slika u 1 drugom oglasu'],
    [2, 'ista slika u 2 druga oglasa'],
    [7, 'ista slika u 7 drugih oglasa'],
  ])('words %i duplicate photos in Croatian', async (count, text) => {
    await renderHome(
      signedIn({
        changed: [
          row({
            listingId: 'x',
            verdict: 'risk',
            line: { kind: 'risk_evidence', evidence: { kind: 'duplicate_photo', count } },
          }),
        ],
      }),
    )

    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('offers removal only on a removed listing, with its last price', async () => {
    const { onUntrack, user } = await renderHome(
      signedIn({
        changed: [
          row({
            listingId: 'bike',
            title: 'Scott Scale 970',
            priceCents: 52_000,
            line: { kind: 'removed', removedAt: minutesAgo(60 * 48) },
          }),
          row({ listingId: 'ps5', line: { kind: 'price_change', deltaCents: -4_000 } }),
        ],
      }),
    )

    expect(screen.getByRole('article', { name: /^Scott Scale 970/ })).toHaveAccessibleName(
      nbsp('Scott Scale 970, Više nije aktivan, 520 €, uklonjen prije 2 dana'),
    )
    expect(
      screen.getByText('Zadnja cijena 520 €, uklonjen prije 2 dana. Možda je prodan.'),
    ).toBeInTheDocument()
    const remove = screen.getAllByRole('button', { name: /Ukloni s popisa/ })
    expect(remove).toHaveLength(1)

    await user.click(remove[0]!)

    expect(onUntrack).toHaveBeenCalledWith('bike')
  })

  it('shows the update banner with the market comparison when it has one', async () => {
    await renderHome(
      signedIn({
        banner: {
          listingId: 'ps5',
          title: 'PlayStation 5 + 2 kontrolera',
          dropCents: 4_000,
          priceCents: 34_000,
          marketAverageCents: 39_500,
          checkedAt: minutesAgo(20),
        },
      }),
    )

    const banner = screen.getByRole('region', { name: nbsp('Cijena je pala 40 €') })
    expect(banner).toHaveTextContent(
      'PlayStation 5 + 2 kontrolera: sada 340 €, ispod tržišnog prosjeka od 395 €. Provjereno prije 20 min.',
    )
  })

  it('leaves the market clause out of the banner without an average', async () => {
    await renderHome(
      signedIn({
        banner: {
          listingId: 'ps5',
          title: 'PlayStation 5',
          dropCents: 4_000,
          priceCents: 34_000,
          marketAverageCents: null,
          checkedAt: minutesAgo(20),
        },
      }),
    )

    expect(screen.getByRole('region', { name: nbsp('Cijena je pala 40 €') })).toHaveTextContent(
      'PlayStation 5: sada 340 €. Provjereno prije 20 min.',
    )
    expect(screen.queryByText(/prosjeka/)).not.toBeInTheDocument()
  })

  it('shows no banner when the result has none', async () => {
    await renderHome(signedIn({ unchanged: [row({ listingId: 'a' })], totalCount: 1 }))

    expect(screen.queryByRole('region', { name: /Cijena je pala/ })).not.toBeInTheDocument()
  })

  it('shows the empty state when nothing is tracked', async () => {
    await renderHome(signedIn())

    expect(screen.getByRole('heading', { name: 'Još ne pratiš nijedan oglas' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /Cijena je pala/ })).not.toBeInTheDocument()
  })

  it('shows the viewer and no sign-in action', async () => {
    await renderHome(signedIn())

    expect(screen.getByLabelText('Tvoj račun')).toHaveTextContent('MB')
    expect(screen.queryByRole('link', { name: 'Prijavi se' })).not.toBeInTheDocument()
  })
})

describe('Početna: guest', () => {
  it('shows a labelled example behind the sign-up card, and no account controls', async () => {
    await renderHome({ kind: 'guest' })

    expect(screen.getByText('Primjer')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prati oglase, mi pazimo na cijenu' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Napravi račun' })).toHaveAttribute(
      'href',
      '/sign-up?redirect=%2Fapp',
    )
    const signIns = screen.getAllByRole('link', { name: 'Prijavi se' })
    expect(signIns).toHaveLength(2)
    for (const link of signIns) expect(link).toHaveAttribute('href', '/sign-in?redirect=%2Fapp')
    expect(screen.queryByLabelText('Tvoj račun')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /Cijena je pala/ })).not.toBeInTheDocument()
  })

  it('keeps the example rows out of the accessibility tree', async () => {
    await renderHome({ kind: 'guest' })

    const watchlist = screen.getByRole('region', { name: 'Praćeni oglasi' })
    expect(within(watchlist).queryAllByRole('listitem')).toEqual([])
    expect(within(watchlist).getByText('PlayStation 5 + 2 kontrolera')).toBeInTheDocument()
  })
})

describe('Početna: watchlist unavailable', () => {
  it('shows a neutral error with a retry, and the paste field still works', async () => {
    const { router, onRetry, user } = await renderHome({ kind: 'unavailable', viewer: null })

    expect(screen.getByText('Praćeni oglasi se trenutno ne mogu učitati.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Pokušaj ponovo' }))
    expect(onRetry).toHaveBeenCalled()

    await user.type(field(), 'njuskalo.hr/x/stan-oglas-123{Enter}')
    await screen.findByText('Provjera u tijeku')
    expect(router.state.location.pathname).toBe('/app/check')
  })
})
