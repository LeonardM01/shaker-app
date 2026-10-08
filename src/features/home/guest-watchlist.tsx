import { Link } from '@tanstack/react-router'
import { Bookmark } from 'lucide-react'

import { buttonStyles } from '#/components/ui/button-styles'
import { VerdictBadge } from '#/components/ui/verdict-badge'
import { WatchlistRow } from '#/components/ui/watchlist-row'
import { homeCopy } from '#/features/home/copy'

const copy = homeCopy.guest

/**
 * The guest teaser: fixed placeholder rows, blurred and hidden from assistive
 * tech, under the sign-up card. No real listing data ever reaches a guest.
 */
export function GuestWatchlist() {
  return (
    <div className="relative">
      <ul aria-hidden inert className="pointer-events-none flex flex-col gap-2 blur-md select-none">
        {copy.placeholderRows.map((row) => (
          <li key={row.id}>
            <WatchlistRow
              accessibleName={row.title}
              title={row.title}
              photoUrl={null}
              badge={<VerdictBadge verdict={row.verdict} />}
              meta={row.meta}
              price={copy.placeholderPrice}
              line={null}
            />
          </li>
        ))}
      </ul>
      <div className="absolute inset-x-4 top-1/2 mx-auto flex max-w-md -translate-y-1/2 flex-col items-center gap-2 rounded-xl bg-bg-elevated p-5 text-center shadow-overlay sm:p-6">
        <span className="flex size-10 items-center justify-center rounded-full bg-bg-brand-subtle">
          <Bookmark aria-hidden size={20} />
        </span>
        <h3 className="text-title sm:text-heading-small">{copy.heading}</h3>
        <p className="hidden text-body-small text-text-secondary sm:block">{copy.body}</p>
        <p className="text-body-small text-text-secondary sm:hidden">{copy.bodyShort}</p>
        <Link
          to="/sign-up"
          search={{ redirect: '/app' }}
          className={`mt-2 ${buttonStyles({ variant: 'secondary' })}`}
        >
          {copy.signUp}
        </Link>
        <p className="text-body-small text-text-secondary">
          {copy.haveAccount}{' '}
          <Link
            to="/sign-in"
            search={{ redirect: '/app' }}
            className="font-semibold text-text-brand underline underline-offset-2 focus-ring"
          >
            {copy.signIn}
          </Link>
        </p>
      </div>
    </div>
  )
}
