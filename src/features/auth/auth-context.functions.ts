import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import type { AuthContext } from '#/features/auth/auth-context'
import { loadAuthContext } from '#/features/auth/load-auth-context'
import { createPrismaAuthContextStore } from '#/features/auth/prisma-auth-context-store.server'
import { getDb } from '#/lib/db.server'
import { signListingPhotoUrl } from '#/lib/storage.server'

/**
 * The auth screens' context panel. Listings are shared marketplace data that
 * guests can already check, so this reads no session.
 */
export const getAuthContext = createServerFn({ method: 'GET' })
  .validator(z.object({ listingId: z.uuid().optional() }))
  .handler(
    ({ data }): Promise<AuthContext> =>
      loadAuthContext(
        { store: createPrismaAuthContextStore(getDb()), signPhotoUrl: signListingPhotoUrl },
        data.listingId,
      ),
  )

export const authContextQueryOptions = (listingId: string | undefined) =>
  queryOptions({
    queryKey: ['auth-context', listingId],
    queryFn: () => getAuthContext({ data: { listingId } }),
  })
