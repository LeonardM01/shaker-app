import { createFileRoute } from '@tanstack/react-router'

import { createS3PhotoStore } from '#/features/check/photos/s3-photo-store.server'
import { createPrismaPhotoRetentionStore } from '#/features/check/prisma-job-stores.server'
import { sweepListingPhotos } from '#/features/check/scheduled-jobs'
import { isCronRequest } from '#/lib/cron.server'
import { getDb } from '#/lib/db.server'
import { getStorage } from '#/lib/storage.server'

/** Daily (vercel.json): photo files of untracked listings go 90 days after their last check. */
export const Route = createFileRoute('/api/cron/photo-retention')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isCronRequest(request)) return new Response(null, { status: 401 })
        const result = await sweepListingPhotos({
          store: createPrismaPhotoRetentionStore(getDb()),
          deleteObjects: createS3PhotoStore(getStorage()).deletePhotos,
          clock: () => new Date(),
        })
        console.info('[photo-retention] done', result)
        return Response.json(result)
      },
    },
  },
})
