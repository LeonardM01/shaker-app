import { createFileRoute } from '@tanstack/react-router'

import { getCheck, handle, preflight } from '#/features/extension/extension-api'
import { extensionApiDeps } from '#/features/extension/extension-deps.server'

/** ADR 0013: polled until the check is no longer running. */
export const Route = createFileRoute('/api/extension/v1/checks/$checkId')({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: ({ params }) => handle('check progress setup', { checkId: params.checkId }, () => getCheck(extensionApiDeps(), params.checkId)),
    },
  },
})
