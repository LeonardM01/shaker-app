import { redirect } from '@tanstack/react-router'

import type { AuthContext } from '#/features/auth/auth-context'
import type { AuthMode } from '#/features/auth/auth-form'
import { AuthScreen } from '#/features/auth/auth-screen'
import type { AuthSearch } from '#/features/auth/auth-search'
import { destinationOf } from '#/features/auth/auth-search'
import { betterAuthPort } from '#/features/auth/better-auth-port'
import { useSessionChanged } from '#/features/auth/use-session-changed'
import { getCurrentUser } from '#/lib/auth/session'

/**
 * `beforeLoad` guard for both auth screens: someone already signed in goes
 * straight on. A failed session lookup still shows the form.
 */
export async function skipIfSignedIn(search: AuthSearch): Promise<void> {
  let signedIn: boolean
  try {
    signedIn = (await getCurrentUser()) !== null
  } catch (error) {
    console.error('[auth] session lookup failed', { error })
    return
  }
  if (signedIn) throw redirect({ href: destinationOf(search) })
}

/** An auth screen wired to Neon Auth and to the app's caches. */
export function AuthRoutePage({
  mode,
  search,
  context,
}: {
  mode: AuthMode
  search: AuthSearch
  context: AuthContext
}) {
  // Everything cached so far was fetched as a guest (Početna's ['home']
  // among it).
  const onSignedIn = useSessionChanged()

  return (
    <AuthScreen
      mode={mode}
      auth={betterAuthPort}
      context={context}
      search={search}
      onSignedIn={onSignedIn}
    />
  )
}
