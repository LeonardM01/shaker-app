import { createFileRoute } from '@tanstack/react-router'

import { handle, postReview, preflight } from '#/features/extension/extension-api'
import { extensionApiDeps } from '#/features/extension/extension-deps.server'

/** ADR 0014: an anonymous review, one per seller per install. */
export const Route = createFileRoute('/api/extension/v1/reviews')({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: ({ request }) => handle('review setup', {}, () => postReview(extensionApiDeps(), request)),
    },
  },
})
