import { Link } from '@tanstack/react-router'
import { CircleCheck, Clock, Info, Link2, LoaderCircle, Minus, RefreshCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { buttonStyles } from '#/components/ui/button-styles'
import { marketplaceNames } from '#/features/home/copy'
import { progressCopy } from '#/features/report/copy'
import type { CheckProgress, ListingCard, ProgressRow, StepStatus } from '#/features/report/report-result'
import { formatClock, formatPrice } from '#/lib/format'

const copy = progressCopy

const statusIcons: Record<StepStatus, { icon: LucideIcon; className: string }> = {
  done: { icon: CircleCheck, className: 'text-icon-brand' },
  running: { icon: LoaderCircle, className: 'text-icon-primary motion-safe:animate-spin' },
  queued: { icon: Clock, className: 'text-icon-secondary' },
  failed: { icon: Info, className: 'text-icon-secondary' },
  skipped: { icon: Minus, className: 'text-icon-secondary' },
}

const statusTone: Record<StepStatus, string> = {
  done: 'text-text-secondary',
  running: 'text-text-primary',
  queued: 'text-text-tertiary',
  failed: 'text-text-secondary',
  skipped: 'text-text-tertiary',
}

/** The link as people read it: no scheme, no "www.". */
const displayUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')

function subjectOf(row: ProgressRow): string {
  switch (row.key) {
    case 'read':
      return copy.rows.read.title
    case 'comparables':
      return marketplaceNames[row.marketplace]
    case 'scam':
      return copy.rows.scam.title
    case 'seller':
      return copy.rows.seller.title
    case 'questions':
      return copy.rows.questions.title
  }
}

function detailOf(row: ProgressRow, photoCount: number | null): string {
  if (row.status === 'skipped') return copy.rows.skipped
  switch (row.key) {
    case 'read':
      return row.status === 'done' && photoCount !== null ? copy.rows.read.done(photoCount) : copy.rows.read.pending
    case 'comparables':
      return row.comparableCount === null ? copy.rows.searching : copy.rows.comparablesFound(row.comparableCount)
    case 'scam':
      return copy.rows.scam.detail
    case 'seller':
      return copy.rows.seller.detail
    case 'questions':
      return copy.rows.questions.detail
  }
}

const rowKey = (row: ProgressRow) => (row.key === 'comparables' ? row.marketplace : row.key)

function ListingFound({ listing }: { listing: ListingCard }) {
  return (
    <section
      aria-label={listing.title}
      className="flex items-center gap-4 rounded-lg bg-bg-neutral p-4"
    >
      <div className="size-14 shrink-0 overflow-hidden rounded-md bg-border-default">
        {listing.photoUrl && <img src={listing.photoUrl} alt="" className="size-full object-cover" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-title">{listing.title}</p>
        <p className="truncate text-body-small text-text-secondary">
          {copy.listingMeta(listing.marketplace, listing.city, listing.photoCount)}
        </p>
      </div>
      {listing.priceCents !== null && <p className="shrink-0 text-title">{formatPrice(listing.priceCents)}</p>}
    </section>
  )
}

function StepRow({ row, photoCount }: { row: ProgressRow; photoCount: number | null }) {
  const { icon: Icon, className } = statusIcons[row.status]
  return (
    <li className="flex items-center gap-4 border-b border-border-default px-5 py-4 last:border-b-0">
      <Icon aria-hidden size={20} className={`shrink-0 ${className}`} />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-title">{subjectOf(row)}</p>
        <p className="text-body-small text-text-secondary">{detailOf(row, photoCount)}</p>
      </div>
      <p className={`shrink-0 text-label ${statusTone[row.status]}`}>{copy.status[row.status]}</p>
    </li>
  )
}

/** DESIGN.md Panel states, Error: a neutral block naming the cause, a retry, a time and a code. */
function FailedStep({ row, onRetry }: { row: ProgressRow; onRetry: () => void }) {
  const title = copy.failed.title(subjectOf(row), row.errorCode)
  return (
    <section aria-label={title} className="flex flex-col gap-2 rounded-lg bg-bg-neutral p-5">
      <h2 className="flex items-center gap-2 text-title">
        <Info aria-hidden size={20} className="shrink-0 text-icon-secondary" />
        {title}
      </h2>
      <p className="text-body-small text-text-secondary">{copy.failed.body}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onRetry} className={buttonStyles({ variant: 'secondary', size: 'medium' })}>
          <RefreshCw aria-hidden size={16} />
          {copy.failed.retry}
        </button>
        <p className="text-caption text-text-tertiary">
          {copy.failed.stamp(row.finishedAt ? formatClock(row.finishedAt) : '', row.errorCode)}
        </p>
      </div>
    </section>
  )
}

function SkeletonTiles() {
  return (
    <div aria-hidden className="grid gap-4 sm:grid-cols-2">
      {['offer', 'quality'].map((tile) => (
        <div key={tile} className="flex flex-col gap-3 rounded-xl bg-bg-neutral p-6">
          <div className="h-3.5 w-28 rounded-sm bg-bg-neutral-hover" />
          <div className="h-10 w-18 rounded-sm bg-bg-neutral-hover" />
          <div className="h-2 w-full rounded-full bg-bg-neutral-hover" />
          <div className="h-3 w-56 max-w-full rounded-sm bg-bg-neutral-hover" />
        </div>
      ))}
    </div>
  )
}

function EndState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-xl bg-bg-neutral p-6">
      <h2 className="text-heading-small">{title}</h2>
      <p className="text-body text-text-secondary">{body}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className={buttonStyles({ variant: 'primary' })}>
          <RefreshCw aria-hidden size={18} />
          {copy.failed.retry}
        </button>
      ) : (
        <Link to="/app" className={buttonStyles({ variant: 'secondary' })}>
          {copy.removed.back}
        </Link>
      )}
    </section>
  )
}

/**
 * "Provjera u tijeku": the listing card once it is read, one row per check
 * step, and every failure on its own. The route opens the report when the
 * check completes.
 */
export function ProgressScreen({ progress, onRetry }: { progress: CheckProgress; onRetry: () => void }) {
  const failed = progress.rows.filter((row) => row.status === 'failed' && row.key !== 'read')
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-8 px-4 pt-6 pb-24 md:px-0 md:pt-16">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-heading-large">{copy.heading}</h1>
        <p className="flex max-w-full items-center gap-2 self-start rounded-full bg-bg-neutral px-4 py-2 text-body-small text-text-secondary">
          <Link2 aria-hidden size={16} className="shrink-0 text-icon-secondary" />
          <span className="truncate">{displayUrl(progress.canonicalUrl)}</span>
        </p>
      </div>
      {progress.status === 'removed' ? (
        <EndState title={copy.removed.title} body={copy.removed.body} />
      ) : progress.status === 'failed' && !progress.listing ? (
        <EndState title={copy.checkFailed.title} body={copy.checkFailed.body} onRetry={onRetry} />
      ) : (
        <>
          {progress.listing && <ListingFound listing={progress.listing} />}
          <ul aria-label={copy.listLabel} className="flex flex-col rounded-xl border border-border-default">
            {progress.rows.map((row) => (
              <StepRow key={rowKey(row)} row={row} photoCount={progress.listing?.photoCount ?? null} />
            ))}
          </ul>
          {failed.map((row) => (
            <FailedStep key={rowKey(row)} row={row} onRetry={onRetry} />
          ))}
          <p className="text-body-small text-text-secondary">{copy.timing}</p>
          <SkeletonTiles />
        </>
      )}
    </div>
  )
}
