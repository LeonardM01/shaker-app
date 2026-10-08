import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'

import { homeQueryOptions } from '#/features/home/home.functions'
import { reportCopy } from '#/features/report/copy'
import { ReportScreen } from '#/features/report/report-screen'
import type { ReportActions } from '#/features/report/report-screen'
import { useStartCheck } from '#/features/report/use-start-check'
import {
  checkMessageFn,
  claimListingFn,
  markHelpfulFn,
  replyToReviewFn,
  reportQueryOptions,
  reportReviewFn,
  setTickFn,
  setTrackedFn,
  writeReviewFn,
} from '#/features/report/report.functions'
import { brandName } from '#/components/ui/copy'

export const Route = createFileRoute('/app/listing/$listingId')({
  loader: async ({ context, params }) => {
    const report = await context.queryClient.ensureQueryData(reportQueryOptions(params.listingId))
    if (!report) throw notFound()
    return { title: report.listing.title }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? reportCopy.pageTitle(loaderData.title) : brandName }],
  }),
  pendingComponent: () => <div aria-busy className="min-h-dvh" />,
  errorComponent: ReportMissing,
  notFoundComponent: ReportMissing,
  component: ReportRoute,
})

function ReportMissing() {
  return (
    <div className="mx-auto flex max-w-180 flex-col gap-2 px-4 pt-10 md:px-0">
      <p className="text-body text-text-secondary">{reportCopy.notFound}</p>
    </div>
  )
}

function ReportRoute() {
  const { listingId } = Route.useParams()
  const startCheck = useStartCheck()
  const queryClient = useQueryClient()
  const { data: report } = useSuspenseQuery(reportQueryOptions(listingId))
  if (!report) return <ReportMissing />

  const refetch = () => queryClient.invalidateQueries({ queryKey: reportQueryOptions(listingId).queryKey })
  /** Runs a write, then refreshes the report so it shows the server's state. */
  const thenRefetch = async <T,>(write: Promise<T>): Promise<T> => {
    const result = await write
    await refetch()
    return result
  }

  const actions: ReportActions = {
    // A failure to start leaves the report as it is.
    onRefresh: () => void startCheck(report.listing.url).catch(() => undefined),
    onSetTracked: async (tracked) => {
      await thenRefetch(setTrackedFn({ data: { listingId, tracked } }))
      await queryClient.invalidateQueries({ queryKey: homeQueryOptions().queryKey })
    },
    onTick: (itemKey, ticked) => setTickFn({ data: { listingId, itemKey, ticked } }),
    onClaim: () => thenRefetch(claimListingFn({ data: { listingId } })),
    onWriteReview: (review) => thenRefetch(writeReviewFn({ data: { listingId, ...review } })),
    onReply: (reviewId, text) => thenRefetch(replyToReviewFn({ data: { reviewId, text } })),
    onHelpful: (reviewId) => thenRefetch(markHelpfulFn({ data: { reviewId } })),
    onReportReview: (reviewId) =>
      reportReviewFn({ data: { reviewId, reason: reportCopy.seller.reportReason } }),
    onCheckMessage: (message) => checkMessageFn({ data: { message } }),
    copyText: (text) => navigator.clipboard.writeText(text),
  }

  return <ReportScreen report={report} actions={actions} />
}
