import { createAuthClient } from '@neondatabase/auth'
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters'

// Browser-side Better Auth client. It talks to our same-origin `/api/auth`
// proxy (src/routes/api/auth/$.ts), never to Neon Auth directly, so session
// cookies stay first-party.
function createClient() {
  return createAuthClient(new URL('/api/auth', window.location.origin).href, {
    adapter: BetterAuthReactAdapter(),
  })
}

let client: ReturnType<typeof createClient> | undefined

/** Call from event handlers and effects only; it needs `window`. */
export function getAuthClient() {
  client ??= createClient()
  return client
}
