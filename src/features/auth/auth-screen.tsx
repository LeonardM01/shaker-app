import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { buttonStyles } from '#/components/ui/button-styles'
import { shellCopy } from '#/components/ui/copy'
import { Logo } from '#/components/ui/logo'
import type { AuthContext } from '#/features/auth/auth-context'
import { AuthForm } from '#/features/auth/auth-form'
import type { AuthMode } from '#/features/auth/auth-form'
import type { AuthPort } from '#/features/auth/auth-port'
import type { AuthSearch } from '#/features/auth/auth-search'
import { destinationOf } from '#/features/auth/auth-search'
import { ContextPanel } from '#/features/auth/context-panel'
import { authCopy } from '#/features/auth/copy'
import { MobileContextCard } from '#/features/auth/mobile-context-card'

type AuthScreenProps = {
  mode: AuthMode
  auth: AuthPort
  context: AuthContext
  search: AuthSearch
  onSignedIn: () => Promise<void> | void
}

/**
 * Registracija and Prijava. Desktop: the form column beside the sand context
 * panel. Mobile: an app bar, the context as a compact card, then the form.
 * "Natrag" always leads to where the visitor would have landed.
 */
export function AuthScreen({ mode, auth, context, search, onSignedIn }: AuthScreenProps) {
  const destination = destinationOf(search)
  return (
    <div className="min-h-dvh bg-bg-screen lg:flex lg:gap-4 lg:p-4">
      <a
        href="#main"
        className="sr-only z-20 rounded-full bg-bg-elevated px-4 py-2 text-label shadow-overlay focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus-ring"
      >
        {shellCopy.skipLink}
      </a>
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col lg:min-h-0 lg:px-12 lg:pt-4 lg:pb-8">
        <header className="flex h-16 items-center gap-2 px-4 py-3 lg:hidden">
          <Link
            href={destination}
            aria-label={authCopy.back}
            className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-neutral focus-ring before:absolute before:-inset-0.5 before:content-['']"
          >
            <ArrowLeft aria-hidden size={20} />
          </Link>
          <div className="flex flex-1 justify-center">
            <Logo />
          </div>
          <span aria-hidden className="size-10 shrink-0" />
        </header>
        <header className="hidden items-center justify-between lg:flex">
          <Logo />
          <Link href={destination} className={buttonStyles({ variant: 'tertiary', size: 'medium' })}>
            <ArrowLeft aria-hidden size={16} />
            {context.kind === 'listing' ? authCopy.backToReport : authCopy.back}
          </Link>
        </header>
        <main
          id="main"
          className="flex flex-1 flex-col items-center px-4 pt-2 pb-8 lg:justify-center lg:p-0 lg:pt-8"
        >
          <div className="flex w-full max-w-100 flex-col gap-6">
            {context.kind === 'listing' && (
              <div className="lg:hidden">
                <MobileContextCard listing={context.listing} />
              </div>
            )}
            <AuthForm mode={mode} auth={auth} search={search} onSignedIn={onSignedIn} />
          </div>
        </main>
      </div>
      <div className="hidden shrink-0 lg:block lg:basis-120 xl:basis-150">
        <ContextPanel context={context} />
      </div>
    </div>
  )
}
