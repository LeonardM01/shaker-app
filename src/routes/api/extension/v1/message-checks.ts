import { createFileRoute } from '@tanstack/react-router'

import { checkDeps } from '#/features/check/check-deps.server'
import { handle, postMessageCheck, preflight } from '#/features/extension/extension-api'

/** ADR 0013: "Provjeri poruku" from the extension. The message is never stored or logged. */
export const Route = createFileRoute('/api/extension/v1/message-checks')({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: ({ request }) => handle('message check setup', {}, () => postMessageCheck(checkDeps(), request)),
    },
  },
})
