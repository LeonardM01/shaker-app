import { createFileRoute } from '@tanstack/react-router'
import { start } from 'workflow/api'

import { createPrismaRecheckStore } from '#/features/check/prisma-job-stores.server'
import { recheckTrackedListings } from '#/features/check/scheduled-jobs'
import { isCronRequest } from '#/lib/cron.server'
import { getDb } from '#/lib/db.server'
import { checkListing } from '#/workflows/check-listing'

/** Daily (vercel.json): a fresh check of every tracked listing, as durable workflows. */
export const Route = createFileRoute('/api/cron/recheck')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isCronRequest(request)) return new Response(null, { status: 401 })
        const result = await recheckTrackedListings(
          { store: createPrismaRecheckStore(getDb()), clock: () => new Date() },
          async (check) => {
            await start(checkListing, [check])
          },
        )
        console.info('[recheck] done', result)
        return Response.json(result)
      },
    },
  },
})
