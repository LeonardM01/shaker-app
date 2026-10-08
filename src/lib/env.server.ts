import { createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'

const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  NEON_AUTH_BASE_URL: z.url(),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_ENDPOINT_URL_S3: z.url(),
  AWS_REGION: z.string().min(1),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let cached: ServerEnv | undefined

/** The only reader of `process.env`. Throws on the first call if a variable is missing. */
export const getServerEnv = createServerOnlyFn((): ServerEnv => {
  cached ??= serverEnvSchema.parse(process.env)
  return cached
})
