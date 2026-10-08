import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ProgressScreen } from '#/features/report/progress-screen'
import type { CheckProgress, ProgressRow } from '#/features/report/report-result'
import { renderInRouter } from '#/test/render-in-router'


function rows(overrides: Partial<Record<string, Partial<ProgressRow>>> = {}): ProgressRow[] {
  const base: ProgressRow[] = [
    { key: 'read', status: 'done', errorCode: null, finishedAt: '2026-10-08T12:32:00Z' },
    { key: 'comparables', marketplace: 'njuskalo', status: 'done', errorCode: null, finishedAt: null, comparableCount: 13 },
    { key: 'comparables', marketplace: 'facebook_marketplace', status: 'running', errorCode: null, finishedAt: null, comparableCount: null },
    { key: 'comparables', marketplace: 'index_oglasi', status: 'done', errorCode: null, finishedAt: null, comparableCount: 0 },
    { key: 'scam', status: 'queued', errorCode: null, finishedAt: null },
    { key: 'seller', status: 'queued', errorCode: null, finishedAt: null },
    { key: 'questions', status: 'queued', errorCode: null, finishedAt: null },
  ]
  return base.map((row) => {
    const key = row.key === 'comparables' ? row.marketplace : row.key
    return { ...row, ...overrides[key] } as ProgressRow
  })
}

function progress(overrides: Partial<CheckProgress> = {}): CheckProgress {
  return {
    checkId: 'c1',
    canonicalUrl: 'https://www.njuskalo.hr/mobiteli/iphone-13-pro-oglas-45123987',
    marketplace: 'njuskalo',
    status: 'running',
    listing: {
      listingId: 'l1',
      title: 'iPhone 13 Pro, 128 GB, zeleni',
      marketplace: 'njuskalo',
      city: 'Zagreb',
      photoUrl: null,
      photoCount: 6,
      priceCents: 64_000,
    },
    rows: rows(),
    ...overrides,
  }
}

async function renderProgress(value: CheckProgress) {
  const onRetry = vi.fn()
  await renderInRouter(() => <ProgressScreen progress={value} onRetry={onRetry} />)
  return { onRetry, user: userEvent.setup() }
}

describe('ProgressScreen', () => {
  it('names the link being checked and shows the listing once it is read', async () => {
    await renderProgress(progress())

    expect(screen.getByRole('heading', { level: 1, name: 'Provjeravam oglas…' })).toBeInTheDocument()
    expect(screen.getByText('njuskalo.hr/mobiteli/iphone-13-pro-oglas-45123987')).toBeInTheDocument()
    const card = screen.getByRole('region', { name: 'iPhone 13 Pro, 128 GB, zeleni' })
    expect(within(card).getByText('Njuškalo · Zagreb · 6 fotografija')).toBeInTheDocument()
    expect(within(card).getByText('640 €')).toBeInTheDocument()
  })

  it('shows one row per check step with its state and comparable count', async () => {
    await renderProgress(progress())

    const list = screen.getByRole('list', { name: 'Provjere' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'Oglas pročitanNaslov, opis i 6 fotografijaGotovo',
      'Njuškalo13 usporedivih oglasaGotovo',
      'Facebook MarketplaceTražim usporedive oglase…U tijeku',
      'Index oglasiNema usporedivih oglasaGotovo',
      'Znakovi prijevareUsporedba fotografija i opisaNa redu',
      'Prodavač i recenzijeProfil, povijest i recenzentiNa redu',
      'Pitanja za prodavateljaNakon svih provjeraNa redu',
    ])
  })

  it('shows a failed step as a neutral block with retry, time and code while the rest keep running', async () => {
    const { onRetry, user } = await renderProgress(
      progress({
        rows: rows({
          facebook_marketplace: { status: 'failed', errorCode: 'timeout', finishedAt: '2026-10-08T12:32:00Z' },
        }),
      }),
    )

    const block = screen.getByRole('region', { name: 'Facebook Marketplace ne odgovara' })
    expect(within(block).getByText('Ostale provjere rade normalno.')).toBeInTheDocument()
    expect(within(block).getByText('14:32 · TIMEOUT')).toBeInTheDocument()
    await user.click(within(block).getByRole('button', { name: 'Pokušaj ponovo' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows honest timing copy and placeholder score tiles while waiting', async () => {
    await renderProgress(progress({ listing: null }))

    expect(
      screen.getByText('Obično traje do pola minute. Svaka provjera se prikaže čim je gotova, ne moraš čekati sve.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /iPhone/ })).not.toBeInTheDocument()
  })

  it('ends a removed listing in a clear state instead of a spinner', async () => {
    await renderProgress(progress({ status: 'removed', listing: null }))

    expect(screen.getByRole('heading', { name: 'Oglas više nije dostupan' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Provjere' })).not.toBeInTheDocument()
  })

  it('offers a retry when the listing could not be read at all', async () => {
    const { onRetry, user } = await renderProgress(
      progress({
        status: 'failed',
        listing: null,
        rows: rows({ read: { status: 'failed', errorCode: 'blocked' } }),
      }),
    )

    expect(screen.getByRole('heading', { name: 'Oglas se ne može pročitati' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Pokušaj ponovo' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
