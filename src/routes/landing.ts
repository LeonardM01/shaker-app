import { createFileRoute } from '@tanstack/react-router'

import { loadLandingPageFromServer, redirectOldLandingUrl } from '#/features/landing/landing-page'

export const Route = createFileRoute('/landing')({
  beforeLoad: loadLandingPageFromServer,
  server: {
    handlers: {
      GET: ({ request }) => redirectOldLandingUrl(request),
    },
  },
})
