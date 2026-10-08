import { createFileRoute } from '@tanstack/react-router'

import { redirectToLanding } from '#/features/landing/landing-page'

export const Route = createFileRoute('/landing')({
  server: {
    handlers: {
      GET: ({ request }) => redirectToLanding(request),
    },
  },
})
