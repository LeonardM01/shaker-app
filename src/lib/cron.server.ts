import { createServerOnlyFn } from '@tanstack/react-start'

import { getCronEnv } from '#/lib/env.server'

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; anything else is refused. */
export const isCronRequest = createServerOnlyFn((request: Request): boolean => {
  return request.headers.get('authorization') === `Bearer ${getCronEnv().CRON_SECRET}`
})
