import { Link } from '@tanstack/react-router'
import { ExternalLink, Lock } from 'lucide-react'
import { useState } from 'react'

import { buttonStyles } from '#/components/ui/button-styles'
import { PriceRangeBar } from '#/components/ui/price-range-bar'
import { Tag } from '#/components/ui/tag'
import { marketplaceNames } from '#/features/home/copy'
import { marketplaceTags, reportCopy } from '#/features/report/copy'
import { ReportSection } from '#/features/report/report-section'
import type { ComparableItem, Report } from '#/features/report/report-result'
import { formatPrice, formatTimeAgo } from '#/lib/format'

const copy = reportCopy.price

/** Matches the price verdict's fair band (scoring/price.ts). */
const fairBand = 0.05
/** Najsličniji oglasi shown before "Prikaži sve". */
const closestShown = 3

function ComparableRow({ item, now }: { item: ComparableItem; now: string }) {
  return (
    <article aria-label={item.title} className="flex items-center gap-4 rounded-lg bg-bg-neutral px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-title">{item.title}</p>
        <div className="flex min-w-0 items-center gap-2">
          <Tag>{marketplaceTags[item.marketplace]}</Tag>
          <span className="truncate text-body-small text-text-secondary">
            {copy.comparableMeta(item.city, formatTimeAgo(item.seenAt, now))}
          </span>
        </div>
      </div>
      <p className="shrink-0 text-title">{formatPrice(item.priceCents)}</p>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        aria-label={copy.openComparable(item.title)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-icon-secondary hover:bg-bg-neutral-hover focus-ring"
      >
        <ExternalLink aria-hidden size={18} />
      </a>
    </article>
  )
}

/** The compact lock card over blurred placeholder rows: only the count is real. */
function ComparablesLock({ rest, listingId }: { rest: number; listingId: string }) {
  return (
    <div className="relative">
      <div aria-hidden inert className="pointer-events-none flex flex-col gap-2 blur-md select-none">
        {['a', 'b'].map((row) => (
          <div key={row} className="h-18 rounded-lg bg-bg-neutral" />
        ))}
      </div>
      <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 items-center gap-3 rounded-xl bg-bg-elevated p-4 shadow-overlay">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-neutral">
          <Lock aria-hidden size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-title">{copy.lock.title(rest)}</p>
          <p className="text-body-small text-text-secondary">{copy.lock.body}</p>
        </div>
        <Link
          to="/sign-up"
          search={{ redirect: `/app/listing/${listingId}` }}
          className={buttonStyles({ variant: 'secondary', size: 'medium' })}
        >
          {copy.lock.action}
        </Link>
      </div>
    </div>
  )
}

/** Usporedba cijena: the market range, medians per marketplace and Najsličniji oglasi. */
export function PriceSection({ report }: { report: Report }) {
  const { price, listing, viewer } = report
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? price.comparables : price.comparables.slice(0, closestShown)
  const hiddenFromGuest = viewer.signedIn ? 0 : price.comparableCount - price.comparables.length
  const summary = price.market
    ? `${copy.range}: ${formatPrice(price.market.lowCents)} – ${formatPrice(price.market.highCents)}, ${copy.average(price.market.medianCents)}.${
        listing.priceCents === null ? '' : ` ${copy.thisListing(listing.priceCents)}.`
      }`
    : copy.insufficient(price.comparableCount)

  return (
    <ReportSection id="cijena" title={copy.heading} aside={<p className="text-body-small text-text-tertiary">{copy.window}</p>}>
      <div className="flex flex-col gap-8 rounded-xl border border-border-default p-6 md:flex-row">
        <div className="flex flex-col gap-3 md:w-90 md:shrink-0">
          <PriceRangeBar
            dots={price.dots}
            market={price.market}
            priceCents={listing.priceCents}
            fairBand={fairBand}
            labels={{
              title: copy.range,
              count: copy.comparableCount(price.comparableCount),
              marker: copy.thisListing,
              average: copy.average,
              insufficient: copy.insufficient(price.comparableCount),
              summary,
            }}
          />
          {price.priceDiffPercent !== null && (
            <p className={`text-label ${price.priceDiffPercent > 0 ? 'text-text-warning' : 'text-text-positive'}`}>
              {copy.diff(price.priceDiffPercent)}
            </p>
          )}
          {price.widened && <p className="text-caption text-text-secondary">{copy.widened}</p>}
        </div>
        <table className="w-full min-w-0 flex-1 border-collapse text-left">
          <thead>
            <tr className="text-caption text-text-tertiary">
              <th scope="col" className="pb-2 font-normal">
                {copy.platform}
              </th>
              <th scope="col" className="pb-2 text-right font-normal">
                {copy.median}
              </th>
            </tr>
          </thead>
          <tbody>
            {price.byMarketplace.map((row) => (
              <tr key={row.marketplace} className="border-t border-border-default">
                <th scope="row" className="py-3 text-left font-normal">
                  <span className="block text-label">{marketplaceNames[row.marketplace]}</span>
                  <span className="block text-caption text-text-tertiary">{copy.listingsCount(row.count)}</span>
                </th>
                <td className={`py-3 text-right text-label whitespace-nowrap ${row.medianCents === null ? 'text-text-secondary' : ''}`}>
                  {row.medianCents === null ? copy.noData : formatPrice(row.medianCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex min-h-11 items-center justify-between gap-4 pt-2">
          <h3 className="text-title">{copy.closest}</h3>
          {viewer.signedIn
            ? price.comparables.length > closestShown && (
                <button
                  type="button"
                  aria-expanded={showAll}
                  onClick={() => {
                    setShowAll(!showAll)
                  }}
                  className={buttonStyles({ variant: 'tertiary', size: 'medium' })}
                >
                  {showAll ? copy.showFewer : copy.showAll(price.comparableCount)}
                </button>
              )
            : price.comparableCount > 0 && (
                <p className="text-body-small text-text-tertiary">
                  {copy.shownOf(price.comparables.length, price.comparableCount)}
                </p>
              )}
        </div>
        {price.comparables.length === 0 ? (
          <p className="rounded-lg bg-bg-neutral px-4 py-3 text-body-small text-text-secondary">{copy.none}</p>
        ) : (
          shown.map((item) => <ComparableRow key={item.listingId} item={item} now={report.now} />)
        )}
        {hiddenFromGuest > 0 && <ComparablesLock rest={hiddenFromGuest} listingId={listing.id} />}
      </div>
    </ReportSection>
  )
}
