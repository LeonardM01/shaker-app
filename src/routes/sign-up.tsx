import { createFileRoute } from '@tanstack/react-router'

import { shellCopy } from '#/components/ui/copy'
import { redirectSearchSchema } from '#/lib/auth/redirect-search'

/**
 * Navigation target for "Registracija". The auth screens themselves (Google and
 * e-mail + password) are specified separately; this route fixes the URL and its
 * `redirect` search param so Početna can link here.
 */
export const Route = createFileRoute('/sign-up')({
  validateSearch: redirectSearchSchema,
  head: () => ({ meta: [{ title: `${shellCopy.pendingScreens.signUp} · Shaker` }] }),
  component: () => (
    <main className="mx-auto max-w-100 px-4 pt-16">
      <h1 className="font-display text-heading-large">{shellCopy.pendingScreens.signUp}</h1>
    </main>
  ),
})
