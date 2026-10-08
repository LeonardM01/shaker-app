import { createFileRoute } from '@tanstack/react-router'

import { shellCopy } from '#/components/ui/copy'

/** Uvjeti korištenja. A placeholder so the auth screens' legal line has a target. */
export const Route = createFileRoute('/terms')({
  head: () => ({ meta: [{ title: `${shellCopy.pendingScreens.terms} · Shaker` }] }),
  component: () => (
    <main className="mx-auto max-w-180 px-4 pt-16">
      <h1 className="font-display text-heading-large">{shellCopy.pendingScreens.terms}</h1>
    </main>
  ),
})
