import { createFileRoute } from '@tanstack/react-router'
import { start } from 'workflow/api'

import { handle, postCheck, preflight } from '#/features/extension/extension-api'
import { extensionApiDeps } from '#/features/extension/extension-deps.server'
import { checkListing } from '#/workflows/check-listing'

/** ADR 0013: the extension opens a listing; reuse, join or start its check. */
export const Route = createFileRoute('/api/extension/v1/checks/')({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: ({ request }) =>
        handle('check setup', {}, () =>
          postCheck(
            {
              ...extensionApiDeps(),
              startWorkflow: async (check) => {
                await start(checkListing, [check])
              },
            },
            request,
          ),
        ),
    },
  },
})
