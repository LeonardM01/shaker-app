import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { shellCopy } from '#/components/ui/copy'
import { marketplaceNames } from '#/features/home/copy'
import { recognizeListingLink } from '#/features/home/link-recognition'

/**
 * "Provjera u tijeku": the navigation target for a recognised link. Running
 * the check (DB lookup, scraping, writing listing_check rows) is the check
 * flow's job; this route only re-validates the link it was given.
 */
export const Route = createFileRoute('/app/check')({
  validateSearch: z.object({ url: z.string().max(2048) }),
  beforeLoad: ({ search }) => {
    const recognition = recognizeListingLink(search.url)
    if (recognition.kind !== 'recognised') throw redirect({ to: '/app' })
    return { recognition }
  },
  head: () => ({ meta: [{ title: `${shellCopy.pendingScreens.check} · Shaker` }] }),
  component: CheckPage,
})

function CheckPage() {
  const { recognition } = Route.useRouteContext()
  return (
    <div className="mx-auto flex max-w-180 flex-col gap-2 px-4 pt-10 md:px-12">
      <h1 className="font-display text-heading-large">{shellCopy.pendingScreens.check}</h1>
      <p className="text-body text-text-secondary">
        {marketplaceNames[recognition.marketplace]} · {recognition.canonicalUrl}
      </p>
    </div>
  )
}
