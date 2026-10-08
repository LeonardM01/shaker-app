import { Bookmark } from 'lucide-react'

import { WatchlistGroup } from '#/components/ui/watchlist-group'
import { homeCopy } from '#/features/home/copy'
import type { WatchlistRow } from '#/features/home/home-result'
import { WatchlistItem } from '#/features/home/watchlist-item'

const copy = homeCopy.watchlist

/** "Praćeni oglasi" for a signed-in buyer: changed rows first, then the rest. */
export function Watchlist({
  changed,
  unchanged,
  now,
  onUntrack,
}: {
  changed: WatchlistRow[]
  unchanged: WatchlistRow[]
  now: string
  onUntrack: (listingId: string) => void
}) {
  if (changed.length === 0 && unchanged.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-bg-neutral px-6 py-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-bg-screen">
          <Bookmark aria-hidden size={24} className="text-icon-secondary" />
        </span>
        <h3 className="text-title">{homeCopy.empty.heading}</h3>
        <p className="max-w-sm text-body-small text-text-secondary">{homeCopy.empty.body}</p>
      </div>
    )
  }

  const groups = [
    { key: 'changed', label: copy.changed, shortLabel: copy.changedShort, rows: changed },
    { key: 'unchanged', label: copy.unchanged, shortLabel: copy.unchanged, rows: unchanged },
  ].filter((group) => group.rows.length > 0)

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <WatchlistGroup key={group.key} label={group.label} shortLabel={group.shortLabel}>
          {group.rows.map((row) => (
            <WatchlistItem key={row.listingId} row={row} now={now} onUntrack={onUntrack} />
          ))}
        </WatchlistGroup>
      ))}
    </div>
  )
}
