import { z } from 'zod'

import { redirectSearchSchema } from '#/lib/auth/redirect-search'

/**
 * Search params of `/sign-up` and `/sign-in`. Invalid values are dropped, not
 * errors: a stale or hand-edited link still opens the form.
 */
export const authSearchSchema = redirectSearchSchema.extend({
  /** The listing whose report sent the visitor here; feeds the context panel. */
  listing: z.uuid().optional().catch(undefined),
  /** Set by the Google error callback. */
  error: z.literal('google').optional().catch(undefined),
})

export type AuthSearch = z.infer<typeof authSearchSchema>

/** Where the visitor goes after signing in, or when they leave without it. */
export const destinationOf = ({ redirect }: AuthSearch) => redirect ?? '/app'
