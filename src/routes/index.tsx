import { createFileRoute } from '@tanstack/react-router'

import { landingPage } from '#/features/landing/landing-page'

export const Route = createFileRoute('/')({
  server: {
    handlers: {
      GET: () => landingPage(),
    },
  },
})
