import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import type { HomeResult } from '#/features/home/home-result'
import { loadHome, untrackListing } from '#/features/home/load-home'
import type { HomeDeps, HomeSession } from '#/features/home/load-home'
import { createPrismaHomeStore } from '#/features/home/prisma-home-store.server'
import { getAuthServer } from '#/lib/auth/auth.server'
import { getDb } from '#/lib/db.server'
import { signListingPhotoUrl } from '#/lib/storage.server'

function homeDeps(): HomeDeps {
  return {
    store: createPrismaHomeStore(getDb()),
    now: () => new Date(),
    signPhotoUrl: signListingPhotoUrl,
  }
}

async function readSession(): Promise<HomeSession> {
  const { data, error } = await getAuthServer().getSession()
  if (error) throw new Error(`Session lookup failed: ${error.message}`)
  if (!data?.user) return null
  return { userId: data.user.id, name: data.user.name, email: data.user.email }
}

/** Početna's data. Reads the session itself; the client never sends a user ID. */
export const getHome = createServerFn({ method: 'GET' }).handler(
  async (): Promise<HomeResult> => {
    let session: HomeSession
    try {
      session = await readSession()
    } catch (error) {
      console.error('[home] session lookup failed', { error })
      return { kind: 'unavailable', viewer: null }
    }
    return loadHome(homeDeps(), session)
  },
)

export const homeQueryOptions = () =>
  queryOptions({ queryKey: ['home'], queryFn: () => getHome(), staleTime: 30_000 })

/** "Ukloni s popisa": drops the signed-in user's link to one listing. */
export const untrackListingFn = createServerFn({ method: 'POST' })
  .validator(z.object({ listingId: z.uuid() }))
  .handler(async ({ data }) => {
    await untrackListing(homeDeps(), await readSession(), data.listingId)
  })
