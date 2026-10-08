import { createFileRoute } from '@tanstack/react-router'

import { shellCopy } from '#/components/ui/copy'

/** Pravila privatnosti. A placeholder so the auth screens' legal line has a target. */
export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: `${shellCopy.pendingScreens.privacy} · Vrijedi.Ly` }] }),
  component: () => (
    <main className="mx-auto max-w-180 px-4 pt-16">
      <h1 className="font-display text-heading-large">{shellCopy.pendingScreens.privacy}</h1>
    </main>
  ),
})
