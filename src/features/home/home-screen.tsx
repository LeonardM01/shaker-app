import { Link } from '@tanstack/react-router'

import { Avatar } from '#/components/ui/avatar'
import { buttonStyles } from '#/components/ui/button-styles'
import { Logo } from '#/components/ui/logo'
import { CheckForm } from '#/features/home/check-form'
import { homeCopy } from '#/features/home/copy'
import { GuestWatchlist } from '#/features/home/guest-watchlist'
import type { HomeResult } from '#/features/home/home-result'
import { UpdateBanner } from '#/features/home/update-banner'
import { Watchlist } from '#/features/home/watchlist'
import { WatchlistUnavailable } from '#/features/home/watchlist-unavailable'

type HomeScreenProps = {
  home: HomeResult
  onRetry: () => void
  /** Rejects when the listing couldn't be removed. */
  onUntrack: (listingId: string) => Promise<void>
}

function AccountControls({ home }: { home: HomeResult }) {
  if (home.kind === 'guest') {
    return (
      <Link
        to="/sign-in"
        search={{ redirect: '/app' }}
        className={buttonStyles({ variant: 'secondary', size: 'medium' })}
      >
        {homeCopy.account.signIn}
      </Link>
    )
  }
  return home.viewer && <Avatar initials={home.viewer.initials} label={homeCopy.account.label} />
}

function WatchlistSection({ home, onRetry, onUntrack }: HomeScreenProps) {
  switch (home.kind) {
    case 'guest':
      return <GuestWatchlist />
    case 'unavailable':
      return <WatchlistUnavailable onRetry={onRetry} />
    case 'signed_in':
      return (
        <Watchlist
          changed={home.changed}
          unchanged={home.unchanged}
          now={home.now}
          onUntrack={onUntrack}
        />
      )
  }
}

/** Početna: paste a listing link, then see what changed on tracked listings. */
export function HomeScreen(props: HomeScreenProps) {
  const { home } = props
  return (
    <div className="flex flex-col items-center gap-6 px-4 pt-4 pb-24 md:gap-8 md:px-12 md:pt-6 md:pb-24">
      <header className="flex min-h-10 w-full items-center justify-between md:justify-end">
        <div className="md:hidden">
          <Logo />
        </div>
        <AccountControls home={home} />
      </header>
      <div className="flex w-full max-w-180 flex-col gap-10 md:gap-12">
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-heading-large">{homeCopy.heading}</h1>
            <p className="hidden text-body-large text-text-secondary sm:block">{homeCopy.intro}</p>
            <p className="text-body text-text-secondary sm:hidden">{homeCopy.introShort}</p>
          </div>
          <CheckForm />
        </section>
        {home.kind === 'signed_in' && home.banner && (
          <UpdateBanner banner={home.banner} now={home.now} />
        )}
        <section aria-labelledby="watchlist-heading" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 id="watchlist-heading" className="text-heading-small">
              {homeCopy.watchlist.heading}
            </h2>
            {home.kind === 'guest' && (
              <span className="text-body-small text-text-tertiary">{homeCopy.guest.example}</span>
            )}
          </div>
          <WatchlistSection {...props} />
        </section>
      </div>
    </div>
  )
}
