import { z } from 'zod'

/**
 * `?redirect=` for the auth screens: where to return after signing in. Only
 * same-site paths, so it can't become an open redirect.
 */
export const redirectSearchSchema = z.object({
  redirect: z
    .string()
    .regex(/^\/(?!\/)/)
    .optional()
    .catch(undefined),
})
