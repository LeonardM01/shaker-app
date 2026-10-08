import { createServerFn } from '@tanstack/react-start'

import { getAuthServer } from '#/lib/auth/auth.server'

export type SessionUser = {
  id: string
  name: string
  email: string
  image: string | null
}

/**
 * The signed-in user, or `null` when signed out. Use for UI. Server functions
 * that touch user data must read the session themselves through
 * `getAuthServer().getSession()` and scope queries by its user ID.
 */
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionUser | null> => {
    const { data } = await getAuthServer().getSession()
    if (!data?.user) return null
    const { id, name, email, image } = data.user
    return { id, name, email, image: image ?? null }
  },
)
