import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'

import { signOut } from '#/features/auth/better-auth-port'
import { useSessionChanged } from '#/features/auth/use-session-changed'
import { homeCopy } from '#/features/home/copy'
import { HomeScreen } from '#/features/home/home-screen'
import { homeQueryOptions, untrackListingFn } from '#/features/home/home.functions'

export const Route = createFileRoute('/app/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQueryOptions()),
  head: () => ({ meta: [{ title: homeCopy.pageTitle }] }),
  pendingComponent: () => <div aria-busy className="min-h-dvh" />,
  // Even when the home query itself fails, the paste field keeps working.
  errorComponent: HomeError,
  component: HomeRoute,
})

/** "Odjavi se": ends the session, then Početna re-renders as a guest. */
function useSignOut() {
  const sessionChanged = useSessionChanged()
  return async () => {
    // A failed sign-out is logged by the adapter; the viewer stays signed in.
    if ((await signOut()).ok) await sessionChanged()
  }
}

function HomeRoute() {
  const queryClient = useQueryClient()
  const signOutAndRefresh = useSignOut()
  const { data, refetch } = useSuspenseQuery(homeQueryOptions())
  const untrack = useMutation({
    mutationFn: (listingId: string) => untrackListingFn({ data: { listingId } }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: homeQueryOptions().queryKey }),
  })

  return (
    <HomeScreen
      home={data}
      // Fire and forget: the query's own state re-renders the screen.
      onRetry={() => void refetch()}
      onUntrack={untrack.mutateAsync}
      // Fire and forget: the session change re-renders the screen.
      onSignOut={() => void signOutAndRefresh()}
    />
  )
}

function HomeError() {
  const router = useRouter()
  return (
    <HomeScreen
      home={{ kind: 'unavailable', viewer: null }}
      // Fire and forget: invalidating re-runs the loader and re-renders.
      onRetry={() => void router.invalidate()}
      onUntrack={() => Promise.resolve()}
      // No viewer here, so there is no account menu to sign out from.
      onSignOut={() => undefined}
    />
  )
}
