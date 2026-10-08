import { Link } from '@tanstack/react-router'
import { ShieldAlert, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { buttonStyles } from '#/components/ui/button-styles'
import { verdictLabels } from '#/components/ui/copy'
import { VerdictBadge } from '#/components/ui/verdict-badge'
import { WatchlistRow } from '#/components/ui/watchlist-row'
import { homeCopy } from '#/features/home/copy'
import type { RowLine, WatchlistRow as WatchlistRowData } from '#/features/home/home-result'
import { formatPrice, formatTimeAgo } from '#/lib/format'

const copy = homeCopy.watchlist

function lineText(line: RowLine, now: string): string {
  switch (line.kind) {
    case 'removed':
      return copy.removedAgo(formatTimeAgo(line.removedAt, now))
    case 'risk_evidence':
      return copy.riskEvidence(line.evidence)
    case 'price_change':
      return copy.priceChange(line.deltaCents)
    case 'too_few_comparables':
      return copy.tooFewComparables
    case 'unchanged':
      return copy.unchangedLine
  }
}

function Pill({ tone, icon, children }: { tone: 'warning' | 'danger'; icon: ReactNode; children: string }) {
  const tones = {
    warning: 'bg-bg-warning-subtle text-text-warning [&>svg]:text-icon-warning',
    danger: 'bg-bg-danger-subtle text-text-danger [&>svg]:text-icon-danger',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-small whitespace-nowrap ${tones[tone]}`}>
      {icon}
      {children}
    </span>
  )
}

function Line({ line, text }: { line: RowLine; text: string }) {
  switch (line.kind) {
    case 'removed':
      return null
    case 'risk_evidence':
      return (
        <Pill tone="danger" icon={<ShieldAlert aria-hidden size={14} />}>
          {text}
        </Pill>
      )
    case 'price_change': {
      const Icon = line.deltaCents < 0 ? TrendingDown : TrendingUp
      return (
        <Pill tone="warning" icon={<Icon aria-hidden size={14} />}>
          {text}
        </Pill>
      )
    }
    case 'too_few_comparables':
    case 'unchanged':
      return <span className="text-caption text-text-tertiary">{text}</span>
  }
}

/** One tracked listing; a removed one also offers "Ukloni s popisa". */
export function WatchlistItem({
  row,
  now,
  onUntrack,
}: {
  row: WatchlistRowData
  now: string
  onUntrack: (listingId: string) => Promise<void>
}) {
  const [untrackFailed, setUntrackFailed] = useState(false)
  const removed = row.line.kind === 'removed'
  const status = removed ? copy.removed : verdictLabels[row.verdict]
  const price = formatPrice(row.priceCents)
  const text = lineText(row.line, now)

  return (
    <li className="flex flex-col gap-2">
      <WatchlistRow
        accessibleName={[row.title, status, price, text].join(', ')}
        title={
          <Link
            to="/app/listing/$listingId"
            params={{ listingId: row.listingId }}
            className="rounded-xs hover:underline focus-ring"
          >
            {row.title}
          </Link>
        }
        photoUrl={row.photoUrl}
        badge={
          removed ? (
            <span className="text-label-small text-text-secondary">{copy.removed}</span>
          ) : (
            <VerdictBadge verdict={row.verdict} />
          )
        }
        meta={copy.meta(row.marketplace, row.city)}
        price={price}
        line={<Line line={row.line} text={text} />}
        muted={removed}
      />
      {row.line.kind === 'removed' && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 px-1">
          <p className="text-caption text-text-secondary">
            {copy.removedDetail(row.priceCents, formatTimeAgo(row.line.removedAt, now))}
          </p>
          <button
            type="button"
            aria-label={copy.untrackLabel(row.title)}
            onClick={() => {
              setUntrackFailed(false)
              onUntrack(row.listingId).catch(() => {
                setUntrackFailed(true)
              })
            }}
            className={buttonStyles({ variant: 'tertiary', size: 'medium' })}
          >
            {copy.untrack}
          </button>
          {untrackFailed && (
            <p role="alert" className="w-full text-caption text-text-secondary">
              {copy.untrackFailed}
            </p>
          )}
        </div>
      )}
    </li>
  )
}
