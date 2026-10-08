import { Link } from '@tanstack/react-router'
import { Bookmark, BookmarkCheck, ExternalLink, RefreshCw } from 'lucide-react'

import { buttonStyles } from '#/components/ui/button-styles'
import { Tag } from '#/components/ui/tag'
import { VerdictBadgeFull } from '#/components/ui/verdict-badge-full'
import { marketplaceTags, reportCopy } from '#/features/report/copy'
import type { Report } from '#/features/report/report-result'
import { formatPrice, formatTimeAgo } from '#/lib/format'

const copy = reportCopy

/** The one line under the verdict, never naming a locked offer. */
function verdictReason(report: Report): string | null {
  switch (report.verdict) {
    case 'room_to_haggle':
      if (report.offer.kind === 'unlocked') return copy.verdictReason.haggle(report.offer.offerCents, report.offer.savingCents)
      if (report.offer.kind === 'locked') return copy.verdictReason.haggleLocked(report.offer.approxSavingCents)
      return null
    case 'great_price': {
      const { market } = report.price
      const price = report.listing.priceCents
      return market && price !== null ? copy.verdictReason.great(market.medianCents - price) : null
    }
    case 'fair_price':
      return copy.verdictReason.fair
    case 'risk':
      return copy.verdictReason.risk
    case 'no_data':
      return copy.verdictReason.noData
  }
}

function TrackControl({
  report,
  onSetTracked,
}: {
  report: Report
  onSetTracked: (tracked: boolean) => Promise<void>
}) {
  if (report.tracked === null) {
    return (
      <Link
        to="/sign-up"
        search={{ redirect: `/app/listing/${report.listing.id}` }}
        className={buttonStyles({ variant: 'secondary', size: 'medium' })}
      >
        <Bookmark aria-hidden size={16} />
        {copy.header.trackGuest}
      </Link>
    )
  }
  const tracked = report.tracked
  const Icon = tracked ? BookmarkCheck : Bookmark
  return (
    <button
      type="button"
      aria-pressed={tracked}
      // The query refetch re-renders the button; a failure leaves it as it was.
      onClick={() => void onSetTracked(!tracked).catch(() => undefined)}
      className={buttonStyles({ variant: 'secondary', size: 'medium' })}
    >
      <Icon aria-hidden size={16} />
      {tracked ? copy.header.tracked : copy.header.track}
    </button>
  )
}

/** Photo, title, where and when, the price with its verdict, and refresh / Prati. */
export function ReportHeader({
  report,
  onRefresh,
  onSetTracked,
}: {
  report: Report
  onRefresh: () => void
  onSetTracked: (tracked: boolean) => Promise<void>
}) {
  const { listing } = report
  const cover = listing.photoUrls[0]
  return (
    <header className="flex flex-col gap-6 md:flex-row md:items-start">
      <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-bg-neutral md:size-36">
        {cover && <img src={cover} alt={copy.header.photoAlt(listing.title)} className="size-full object-cover" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h1 className="font-display text-heading-large">{listing.title}</h1>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Tag>{marketplaceTags[listing.marketplace]}</Tag>
          {listing.isDemo && <Tag>{copy.header.demo}</Tag>}
          <p className="text-body-small text-text-secondary">
            {copy.header.meta(
              listing.city,
              listing.neighbourhood,
              listing.postedAt && formatTimeAgo(listing.postedAt, report.now),
              listing.photoUrls.length,
            )}
          </p>
          <a
            href={listing.url}
            target="_blank"
            rel="noreferrer"
            aria-label={copy.header.openLabel}
            className="inline-flex items-center gap-1 rounded-xs text-label text-text-brand hover:underline focus-ring"
          >
            {copy.header.open}
            <ExternalLink aria-hidden size={16} />
          </a>
        </div>
        {listing.removed && <p className="text-label text-text-secondary">{copy.header.removed}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <p className="font-display text-price-xl opsz-96">
            {listing.priceCents === null ? copy.header.noPrice : formatPrice(listing.priceCents)}
          </p>
          <VerdictBadgeFull verdict={report.verdict} reason={verdictReason(report)} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={copy.header.refresh}
            title={copy.header.refresh}
            onClick={onRefresh}
            className="relative flex size-9 items-center justify-center rounded-full bg-bg-neutral text-icon-primary before:absolute before:-inset-1 before:content-[''] hover:bg-bg-neutral-hover focus-ring"
          >
            <RefreshCw aria-hidden size={18} />
          </button>
          <TrackControl report={report} onSetTracked={onSetTracked} />
        </div>
        <p className="text-caption text-text-tertiary">
          {copy.header.lastChecked(report.checkedAt, report.now)}
        </p>
      </div>
    </header>
  )
}
