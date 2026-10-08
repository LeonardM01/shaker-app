import {
  createAuthServer,
  extractNeonAuthCookies,
  handleAuthProxyRequest,
} from '@neondatabase/auth/server'
import type { NeonAuthServer, RequestContext } from '@neondatabase/auth/server'
import { createServerOnlyFn } from '@tanstack/react-start'
import { getRequest, getRequestHeader, setCookie } from '@tanstack/react-start/server'

import { getServerEnv } from '#/lib/env.server'

// TanStack Start adapter for Neon Auth, built on the framework-agnostic
// toolkit in `@neondatabase/auth/server` (see BUILDING-AN-ADAPTER.md in that
// package). The toolkit is beta: keep `@neondatabase/auth` pinned.

// `lax` so the session cookie survives the redirect back from OAuth providers.
const SAME_SITE = 'lax'

function createRequestContext(): RequestContext {
  return {
    getCookies: () => extractNeonAuthCookies(getRequestHeader('cookie') ?? ''),
    setCookie: (name, value, options) => {
      setCookie(name, value, options)
    },
    getHeader: (name) => getRequestHeader(name as never) ?? null,
    getOrigin: () => getRequestHeader('origin') ?? new URL(getRequest().url).origin,
    getFramework: () => 'tanstack-start',
  }
}

let server: NeonAuthServer | undefined

/** Better Auth server methods (`getSession`, …) bound to the current request's cookies. */
export const getAuthServer = createServerOnlyFn((): NeonAuthServer => {
  const env = getServerEnv()
  server ??= createAuthServer({
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookieSecret: env.NEON_AUTH_COOKIE_SECRET,
    sameSite: SAME_SITE,
    context: createRequestContext,
  })
  return server
})

/** Forwards a browser request under `/api/auth/*` to Neon Auth. */
export const proxyAuthRequest = createServerOnlyFn((request: Request, path: string) => {
  const env = getServerEnv()
  return handleAuthProxyRequest({
    request,
    path,
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookieSecret: env.NEON_AUTH_COOKIE_SECRET,
    sameSite: SAME_SITE,
  })
})
