import type { ReactNode } from 'react'

type WatchlistRowProps = {
  /** Title, verdict, price and the secondary line, read as one name. */
  accessibleName: string
  title: string
  photoUrl: string | null
  /** The verdict badge, or a status where a listing has none. */
  badge: ReactNode
  meta: string
  price: string
  line: ReactNode
  muted?: boolean
}

/**
 * One tracked listing as a ledger row on `bg/neutral`. Desktop: photo, title
 * over badge + meta, price over the secondary line. Mobile: the line moves
 * under the badge and the meta drops out.
 */
export function WatchlistRow({
  accessibleName,
  title,
  photoUrl,
  badge,
  meta,
  price,
  line,
  muted = false,
}: WatchlistRowProps) {
  return (
    <article
      aria-label={accessibleName}
      className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-lg bg-bg-neutral py-3 pr-4 pl-3 [grid-template-areas:'photo_title_price'_'photo_badge_price'_'photo_line_price'] sm:[grid-template-areas:'photo_title_price'_'photo_badge_line']"
    >
      <div className="size-14 overflow-hidden rounded-md bg-border-default [grid-area:photo]">
        {photoUrl && (
          <img
            src={photoUrl}
            alt=""
            loading="lazy"
            className={`size-full object-cover ${muted ? 'opacity-60 grayscale' : ''}`}
          />
        )}
      </div>
      <p className="truncate text-title [grid-area:title]">{title}</p>
      <div className="flex min-w-0 items-center gap-2 [grid-area:badge]">
        {badge}
        <span className="hidden truncate text-body-small text-text-secondary sm:inline">{meta}</span>
      </div>
      <p
        className={`text-right text-title sm:min-w-24 [grid-area:price] sm:self-end ${muted ? 'text-text-secondary' : ''}`}
      >
        {price}
      </p>
      <div className="flex min-w-0 justify-start [grid-area:line] sm:justify-end sm:self-start">
        {line}
      </div>
    </article>
  )
}
