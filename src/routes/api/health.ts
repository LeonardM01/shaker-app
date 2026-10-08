import { HeadBucketCommand } from '@aws-sdk/client-s3'
import { createFileRoute } from '@tanstack/react-router'

import { getAuthServer } from '#/lib/auth/auth.server'
import { getDb } from '#/lib/db.server'
import { ASSETS_BUCKET, getStorage } from '#/lib/storage.server'

type Check = 'ok' | 'error'

async function check(run: () => Promise<unknown>): Promise<Check> {
  try {
    await run()
    return 'ok'
  } catch (error) {
    console.error('[health]', error)
    return 'error'
  }
}

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        const [database, storage, auth] = await Promise.all([
          check(() => getDb().$queryRaw`SELECT 1`),
          check(() => getStorage().send(new HeadBucketCommand({ Bucket: ASSETS_BUCKET }))),
          check(async () => {
            const { error } = await getAuthServer().getSession()
            if (error) throw new Error(error.message)
          }),
        ])
        const healthy = database === 'ok' && storage === 'ok' && auth === 'ok'
        return Response.json({ database, storage, auth }, { status: healthy ? 200 : 503 })
      },
    },
  },
})
