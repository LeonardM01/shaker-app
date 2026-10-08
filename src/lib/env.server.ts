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

/**
 * Credentials only the check pipeline and its scheduled jobs need. Parsed
 * separately so the rest of the app (Početna, auth) runs without them.
 */
const pipelineEnvSchema = z.object({
  /** Steel browser sessions for every marketplace read (ADR 0003). */
  STEEL_API_KEY: z.string().min(1),
  /** Gemini on the paid tier (ADR 0004). */
  GOOGLE_AI_API_KEY: z.string().min(1),
  /** TypeSafe Jev (ADR 0005). */
  JEV_API_KEY: z.string().min(1),
})

/** Vercel Cron sends it as a bearer token to the scheduled-job routes. */
const cronEnvSchema = z.object({ CRON_SECRET: z.string().min(16) })

export type PipelineEnv = z.infer<typeof pipelineEnvSchema>

let cached: ServerEnv | undefined
let cachedPipeline: PipelineEnv | undefined
let cachedCron: z.infer<typeof cronEnvSchema> | undefined

/** The only reader of `process.env`. Throws on the first call if a variable is missing. */
export const getServerEnv = createServerOnlyFn((): ServerEnv => {
  cached ??= serverEnvSchema.parse(process.env)
  return cached
})

/** Throws on the first call if a pipeline credential is missing. */
export const getPipelineEnv = createServerOnlyFn((): PipelineEnv => {
  cachedPipeline ??= pipelineEnvSchema.parse(process.env)
  return cachedPipeline
})

/** Throws on the first call if `CRON_SECRET` is missing. */
export const getCronEnv = createServerOnlyFn(() => {
  cachedCron ??= cronEnvSchema.parse(process.env)
  return cachedCron
})
