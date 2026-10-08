import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ReportScreen } from '#/features/report/report-screen'
import type { ReportActions } from '#/features/report/report-screen'
import type { Report } from '#/features/report/report-result'
import { guestReportFixture, reportFixture } from '#/features/report/testing/report-fixture'
import { renderInRouter } from '#/test/render-in-router'

function fakeActions() {
  const copied: string[] = []
  const actions: ReportActions = {
    onRefresh: vi.fn(),
    onSetTracked: vi.fn(() => Promise.resolve()),
    onTick: vi.fn(() => Promise.resolve()),
    onClaim: vi.fn(() => Promise.resolve({ kind: 'claimed' as const })),
    onWriteReview: vi.fn(() => Promise.resolve({ kind: 'created' as const })),
    onReply: vi.fn(() => Promise.resolve({ kind: 'replied' as const })),
    onHelpful: vi.fn(() => Promise.resolve()),
    onReportReview: vi.fn(() => Promise.resolve()),
    onCheckMessage: vi.fn(() =>
      Promise.resolve([
        {
          code: 'off_platform_payment_link' as const,
          strength: 'strong' as const,
          status: 'fired' as const,
          evidence: { kind: 'quote' as const, quote: 'platite na dostava-hr.com' },
        },
        { code: 'off_platform_contact' as const, strength: 'weak' as const, status: 'clear' as const },
      ]),
    ),
    copyText: (text: string) => {
      copied.push(text)
      return Promise.resolve()
    },
  }
  return { actions, copied }
}

async function renderReport(report: Report) {
  const { actions, copied } = fakeActions()
  await renderInRouter(() => <ReportScreen report={report} actions={actions} />, '/app/listing/x')
  return { actions, copied, user: userEvent.setup() }
}

const rail = () => screen.getByRole('complementary', { name: 'Predložena ponuda' })

describe('ReportScreen: header and verdict', () => {
  it('shows the listing, its price and the verdict with the offer for a signed-in buyer', async () => {
    await renderReport(reportFixture())

    expect(screen.getByRole('heading', { level: 1, name: 'iPhone 13 Pro, 128 GB, zeleni' })).toBeInTheDocument()
    expect(screen.getByText('Zagreb, Trešnjevka · objavljeno prije 3 dana · 2 fotografije')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Otvori oglas u novoj kartici' })).toHaveAttribute(
      'href',
      'https://www.njuskalo.hr/mobiteli/iphone-13-pro-oglas-45123987',
    )
    const verdict = screen.getByRole('group', { name: 'Presuda' })
    expect(verdict).toHaveTextContent('Prostor za pregovor')
    expect(verdict).toHaveTextContent('Ponudi ~590 € · uštedi 50 €')
    expect(screen.getByText('Zadnja provjera danas u 14:32')).toBeInTheDocument()
  })

  it('answers "can I trust it" above the title and links to the evidence', async () => {
    await renderReport(reportFixture())

    const badge = screen.getByRole('link', { name: /^Oprez/ })
    expect(badge).toHaveTextContent('Oprez1 mogući znak prijevare · Opis i fotografije se ne slažu')
    expect(badge).toHaveAttribute('href', '#sigurnost')
  })

  it('shows no data in gray words, never a guessed number', async () => {
    await renderReport(
      reportFixture({
        verdict: 'no_data',
        offer: { kind: 'none' },
        price: {
          ...reportFixture().price,
          market: null,
          comparableCount: 3,
          priceDiffPercent: null,
          byMarketplace: [
            { marketplace: 'njuskalo', count: 3, medianCents: null },
            { marketplace: 'facebook_marketplace', count: 0, medianCents: null },
            { marketplace: 'index_oglasi', count: 0, medianCents: null },
          ],
        },
      }),
    )

    expect(screen.getByRole('group', { name: 'Presuda' })).toHaveTextContent('Nema podataka')
    expect(screen.getByText('Premalo podataka za raspon (3 od potrebnih 5)')).toBeInTheDocument()
    expect(within(rail()).getByText('Ponudu predlažemo kad imamo barem 5 usporedivih oglasa.')).toBeInTheDocument()
    expect(screen.getByText(/Još nemamo dovoljno podataka/)).toBeInTheDocument()
    expect(screen.getAllByText('Nema podataka').length).toBeGreaterThan(1)
  })

  it('refreshes the check from the header', async () => {
    const { actions, user } = await renderReport(reportFixture())

    await user.click(screen.getByRole('button', { name: 'Provjeri ponovo' }))

    expect(actions.onRefresh).toHaveBeenCalledOnce()
  })

  it('tracks and untracks the listing for a signed-in buyer', async () => {
    const { actions, user } = await renderReport(reportFixture({ tracked: true }))

    expect(screen.getByText('Pratimo ovaj oglas')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Praćeno' }))

    expect(actions.onSetTracked).toHaveBeenCalledWith(false)
  })
})

describe('ReportScreen: guest lock', () => {
  it('shows a guest the saving but no offer, no message and one comparable behind a lock', async () => {
    await renderReport(guestReportFixture())

    expect(screen.getByRole('group', { name: 'Presuda' })).toHaveTextContent('Možeš uštedjeti oko 50 €')
    expect(within(rail()).getByText('Možeš uštedjeti oko 50 €')).toBeInTheDocument()
    expect(within(rail()).queryByText(/590/)).not.toBeInTheDocument()
    expect(within(rail()).getByRole('link', { name: /Napravi račun i kopiraj/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/sign-up') as string,
    )
    expect(screen.getAllByRole('article', { name: /iPhone 13 Pro 128 GB/ })).toHaveLength(1)
    expect(screen.getByText('Još 5 usporedivih oglasa')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Prati cijenu' })).toHaveAttribute(
      'href',
      expect.stringContaining('/sign-up') as string,
    )
  })
})

describe('ReportScreen: questions and checklist', () => {
  it('copies one question, or all of them', async () => {
    const { copied, user } = await renderReport(reportFixture())

    await user.click(screen.getByRole('button', { name: 'Kopiraj pitanje: Imate li račun?' }))
    await user.click(screen.getByRole('button', { name: 'Kopiraj sva pitanja' }))

    expect(copied).toEqual([
      'Imate li račun?',
      'Koliki je točan kapacitet baterije?\nImate li račun?\nMože li osobno preuzimanje u Zagrebu?',
    ])
  })

  it('adds a question for a missing fact the list does not cover yet', async () => {
    const { user } = await renderReport(reportFixture())

    const findings = screen.getByRole('region', { name: 'Što nedostaje ili se ne slaže' })
    const receipt = within(findings).getByRole('listitem', { name: 'Nije navedeno: račun ili jamstvo' })
    expect(within(receipt).getByText('U pitanjima')).toBeInTheDocument()
    const repairs = within(findings).getByRole('listitem', { name: 'Nije navedeno: je li telefon servisiran' })
    await user.click(within(repairs).getByRole('button', { name: 'Dodaj u pitanja' }))

    const questions = screen.getByRole('region', { name: 'Što pitati prodavatelja?' })
    expect(
      within(questions).getByText('Možete li mi reći nešto više o ovome: je li telefon servisiran?'),
    ).toBeInTheDocument()
    expect(within(repairs).getByText('U pitanjima')).toBeInTheDocument()
  })

  it('ticks checklist items with a running count and saves them for a signed-in buyer', async () => {
    const { actions, user } = await renderReport(reportFixture({ ticks: ['imei'] }))

    const checklist = screen.getByRole('region', { name: 'Provjeri prije plaćanja' })
    expect(within(checklist).getByText('1 od 3')).toBeInTheDocument()
    await user.click(within(checklist).getByRole('checkbox', { name: 'Face ID, kamere i zvučnici rade' }))

    expect(within(checklist).getByText('2 od 3')).toBeInTheDocument()
    expect(actions.onTick).toHaveBeenCalledWith('face_id', true)
  })

  it("lets a guest tick, but doesn't save", async () => {
    const { actions, user } = await renderReport(guestReportFixture())

    const checklist = screen.getByRole('region', { name: 'Provjeri prije plaćanja' })
    await user.click(within(checklist).getByRole('checkbox', { name: 'IMEI na kutiji i u Postavkama je isti' }))

    expect(within(checklist).getByText('1 od 3')).toBeInTheDocument()
    expect(actions.onTick).not.toHaveBeenCalled()
  })

  it('copies the offer message', async () => {
    const { copied, user } = await renderReport(reportFixture())

    await user.click(within(rail()).getByRole('button', { name: 'Kopiraj ponudu' }))

    expect(copied).toEqual(['Pozdrav! Biste li prihvatili 590 €?'])
    expect(within(rail()).getByText('Ponuda je kopirana')).toBeInTheDocument()
  })
})

describe('ReportScreen: Znakovi prijevare', () => {
  it('lists the six patterns with evidence next to the one that fired', async () => {
    await renderReport(reportFixture())

    const safety = screen.getByRole('region', { name: 'Znakovi prijevare' })
    expect(within(safety).getByText('Jedna stvar traži pažnju')).toBeInTheDocument()
    expect(
      within(safety).getByText('Provjerili smo 6 poznatih obrazaca prijevare s Njuškala i Facebooka.'),
    ).toBeInTheDocument()
    const patterns = within(safety).getByRole('list', { name: 'Obrasci prijevare' })
    expect(within(patterns).getAllByRole('listitem')).toHaveLength(6)
    expect(within(patterns).getByText('„javi se na WhatsApp”')).toBeInTheDocument()
  })

  it('says nothing was found only when every pattern was checked clear', async () => {
    const report = reportFixture()
    await renderReport(
      reportFixture({ scam: report.scam.map((result) => ({ code: result.code, strength: result.strength, status: 'clear' })) }),
    )

    const safety = screen.getByRole('region', { name: 'Znakovi prijevare' })
    expect(within(safety).getByText('Nema znakova prijevare')).toBeInTheDocument()
  })

  it('shows unchecked patterns as unknown, never as all clear', async () => {
    const report = reportFixture()
    await renderReport(
      reportFixture({ scam: report.scam.map((result) => ({ code: result.code, strength: result.strength, status: 'unknown' })) }),
    )

    const safety = screen.getByRole('region', { name: 'Znakovi prijevare' })
    expect(within(safety).getByText('Znakove prijevare nismo uspjeli provjeriti')).toBeInTheDocument()
    expect(within(safety).queryByText('Nema znakova prijevare')).not.toBeInTheDocument()
  })

  it("checks a pasted message and shows what matched, without keeping it", async () => {
    const { actions, user } = await renderReport(reportFixture())

    const safety = screen.getByRole('region', { name: 'Znakovi prijevare' })
    await user.type(within(safety).getByRole('textbox', { name: 'Poruka prodavača' }), 'Platite na dostava-hr.com')
    await user.click(within(safety).getByRole('button', { name: 'Provjeri poruku' }))

    expect(actions.onCheckMessage).toHaveBeenCalledWith('Platite na dostava-hr.com')
    const result = await within(safety).findByRole('alert')
    expect(result).toHaveTextContent('Poruka sadrži poznate trikove')
    expect(result).toHaveTextContent('„platite na dostava-hr.com”')
  })
})

describe('ReportScreen: seller and reviews', () => {
  it('shows only facts the marketplace publishes and the seller reply on a review', async () => {
    await renderReport(reportFixture())

    const seller = screen.getByRole('region', { name: 'Prodavač i recenzije' })
    expect(within(seller).getByText('Na Njuškalu od 2019. · Zagreb')).toBeInTheDocument()
    expect(within(seller).getByText('Broj telefona potvrđen')).toBeInTheDocument()
    expect(within(seller).queryByText(/Isti profil/)).not.toBeInTheDocument()
    expect(within(seller).queryByText(/potvrđenom kupnjom/)).not.toBeInTheDocument()
    const review = within(seller).getByRole('article', { name: 'Ivana P.' })
    expect(within(review).getByText('Hvala Ivana!')).toBeInTheDocument()
  })

  it('writes a review with stars and text', async () => {
    const { actions, user } = await renderReport(reportFixture())

    const form = screen.getByRole('form', { name: 'Napiši recenziju' })
    await user.click(within(form).getByRole('radio', { name: '4 zvjezdice' }))
    await user.type(within(form).getByRole('textbox', { name: 'Kako je prošla kupnja?' }), 'Sve je bilo u redu.')
    await user.click(within(form).getByRole('button', { name: 'Objavi recenziju' }))

    expect(actions.onWriteReview).toHaveBeenCalledWith({ stars: 4, text: 'Sve je bilo u redu.' })
    expect(await screen.findByText('Hvala, recenzija je objavljena.')).toBeInTheDocument()
  })

  it('marks a review useful once', async () => {
    const { actions, user } = await renderReport(reportFixture())

    await user.click(screen.getByRole('button', { name: 'Korisno (12)' }))

    expect(actions.onHelpful).toHaveBeenCalledWith('00000000-0000-4000-8000-0000000000r1')
  })

  it('lets a signed-in seller claim the listing from the rail', async () => {
    const { actions, user } = await renderReport(reportFixture())

    await user.click(screen.getByRole('button', { name: 'Ovo je moj oglas' }))

    expect(actions.onClaim).toHaveBeenCalledOnce()
    expect(await screen.findByText('Oglas je tvoj. Sada možeš odgovarati na recenzije.')).toBeInTheDocument()
  })
})
