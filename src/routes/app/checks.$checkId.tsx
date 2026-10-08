import { useSuspenseQuery } from '@tanstack/react-query'
import { Navigate, createFileRoute, notFound } from '@tanstack/react-router'

import { shellCopy } from '#/components/ui/copy'
import { progressCopy } from '#/features/report/copy'
import { ProgressScreen } from '#/features/report/progress-screen'
import { checkProgressQueryOptions } from '#/features/report/check.functions'
import { useStartCheck } from '#/features/report/use-start-check'

/** "Provjera u tijeku": polls the check and opens the report by itself when it's done. */
export const Route = createFileRoute('/app/checks/$checkId')({
  loader: async ({ context, params }) => {
    const progress = await context.queryClient.ensureQueryData(checkProgressQueryOptions(params.checkId))
    if (!progress) throw notFound()
  },
  head: () => ({ meta: [{ title: progressCopy.pageTitle }] }),
  pendingComponent: () => <div aria-busy className="min-h-dvh" />,
  errorComponent: ProgressMissing,
  notFoundComponent: ProgressMissing,
  component: ProgressRoute,
})

function ProgressMissing() {
  return (
    <div className="mx-auto flex max-w-180 flex-col gap-2 px-4 pt-10 md:px-0">
      <h1 className="font-display text-heading-large">{shellCopy.pendingScreens.check}</h1>
      <p className="text-body text-text-secondary">{progressCopy.notFound}</p>
    </div>
  )
}

function ProgressRoute() {
  const { checkId } = Route.useParams()
  const startCheck = useStartCheck()
  const { data: progress } = useSuspenseQuery(checkProgressQueryOptions(checkId))
  if (!progress) return <ProgressMissing />
  if (progress.status === 'completed' && progress.listing) {
    return <Navigate to="/app/listing/$listingId" params={{ listingId: progress.listing.listingId }} replace />
  }
  return (
    <ProgressScreen
      progress={progress}
      // "Pokušaj ponovo" starts a fresh check of the same link; a failure to
      // start leaves this screen as it is.
      onRetry={() => void startCheck(progress.canonicalUrl).catch(() => undefined)}
    />
  )
}
