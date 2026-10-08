import { z } from 'zod'

// Build-time `VITE_*` variables, safe for the browser bundle. The only reader
// of `import.meta.env`; server secrets go through env.server.ts.
const publicEnvSchema = z.object({
  /** "Vrijedi.Ly u Chromeu" links here; the card is hidden while it's unset. */
  VITE_CHROME_WEB_STORE_URL: z
    .union([z.literal(''), z.url()])
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
})

type PublicEnv = z.infer<typeof publicEnvSchema>

let cached: PublicEnv | undefined

/** Throws on the first call if a variable is set but invalid. */
export function getPublicEnv(): PublicEnv {
  cached ??= publicEnvSchema.parse(import.meta.env)
  return cached
}
