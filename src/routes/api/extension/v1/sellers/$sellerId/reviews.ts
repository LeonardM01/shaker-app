import { createFileRoute } from '@tanstack/react-router'

import { getSellerReviews, handle, preflight } from '#/features/extension/extension-api'
import { extensionApiDeps } from '#/features/extension/extension-deps.server'

/** ADR 0014: a seller's real reviews, newest first, `?cursor=` for the next page. */
export const Route = createFileRoute('/api/extension/v1/sellers/$sellerId/reviews')({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: ({ request, params }) =>
        handle('reviews setup', {}, () => getSellerReviews(extensionApiDeps(), params.sellerId, request)),
    },
  },
})
