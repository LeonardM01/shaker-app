import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'

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

function HomeRoute() {
  const queryClient = useQueryClient()
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
    />
  )
}
