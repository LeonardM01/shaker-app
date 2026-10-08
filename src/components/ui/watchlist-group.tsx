import type { ReactNode } from 'react'

/**
 * A labelled group of watchlist rows. `shortLabel` replaces the visible
 * heading on mobile; the list keeps the full label as its name.
 */
export function WatchlistGroup({
  label,
  shortLabel = label,
  children,
}: {
  label: string
  shortLabel?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <p aria-hidden className="px-1 text-label text-text-secondary">
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{shortLabel}</span>
      </p>
      <ul aria-label={label} className="flex flex-col gap-2">
        {children}
      </ul>
    </div>
  )
}
