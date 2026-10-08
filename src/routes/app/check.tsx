import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { shellCopy } from '#/components/ui/copy'
import { recognizeListingLink } from '#/features/home/link-recognition'
import { startCheckFn } from '#/features/report/check.functions'

/**
 * "Provjeri" lands here: a recognised link starts a check, or reuses one from
 * the last 6 hours, then moves on to its progress or straight to the report.
 * Preloading never starts a check.
 */
export const Route = createFileRoute('/app/check')({
  validateSearch: z.object({ url: z.string().max(2048) }),
  beforeLoad: async ({ search, preload }) => {
    const recognition = recognizeListingLink(search.url)
    if (recognition.kind !== 'recognised') throw redirect({ to: '/app' })
    if (preload) return
    // Never forced here: loading a URL may run more than once, and a repeat
    // only reuses the check this one started.
    const started = await startCheckFn({ data: { url: recognition.canonicalUrl, force: false } })
    if (started.kind === 'report') {
      throw redirect({ to: '/app/listing/$listingId', params: { listingId: started.listingId } })
    }
    throw redirect({ to: '/app/checks/$checkId', params: { checkId: started.checkId } })
  },
  head: () => ({ meta: [{ title: `${shellCopy.pendingScreens.check} · Shaker` }] }),
  pendingComponent: () => <div aria-busy className="min-h-dvh" />,
  errorComponent: CheckStartFailed,
})

function CheckStartFailed() {
  return (
    <div className="mx-auto flex max-w-180 flex-col gap-2 px-4 pt-10 md:px-0">
      <h1 className="font-display text-heading-large">{shellCopy.pendingScreens.check}</h1>
      <p className="text-body text-text-secondary">{shellCopy.checkStartFailed}</p>
    </div>
  )
}
