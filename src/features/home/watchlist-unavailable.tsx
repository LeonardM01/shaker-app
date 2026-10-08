import { RefreshCw } from 'lucide-react'

import { buttonStyles } from '#/components/ui/button-styles'
import { homeCopy } from '#/features/home/copy'

const copy = homeCopy.unavailable

/** A neutral block, not a warning: the watchlist failed, nothing else did. */
export function WatchlistUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl bg-bg-neutral p-6">
      <p className="text-title">{copy.body}</p>
      <p className="text-body-small text-text-secondary">{copy.detail}</p>
      <button
        type="button"
        onClick={onRetry}
        className={`-ml-4 ${buttonStyles({ variant: 'tertiary', size: 'medium' })}`}
      >
        <RefreshCw aria-hidden size={16} />
        {copy.retry}
      </button>
    </div>
  )
}
