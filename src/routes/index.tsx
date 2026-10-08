import { createFileRoute } from '@tanstack/react-router'

import { loadLandingPageFromServer, serveLandingPage } from '#/features/landing/landing-page'

export const Route = createFileRoute('/')({
  beforeLoad: loadLandingPageFromServer,
  server: {
    handlers: {
      GET: serveLandingPage,
    },
  },
})
