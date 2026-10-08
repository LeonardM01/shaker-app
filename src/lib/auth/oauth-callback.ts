import type { MiddlewareResult } from '@neondatabase/auth/server'

/** Neon Auth's query param on the OAuth return URL (not exported by the toolkit). */
const VERIFIER_PARAM = 'neon_auth_session_verifier'

/**
 * Finishes a Google sign-in. Neon Auth sends the browser back to the callback
 * URL with a one-time verifier; exchanging it for our session cookies is the
 * adapter's job. Returns the redirect to the clean URL, or `null` to render
 * the page as usual (no verifier, or a stale one).
 */
export async function oauthCallbackResponse(
  request: Request,
  exchange: (request: Request) => Promise<MiddlewareResult>,
): Promise<Response | null> {
  if (!new URL(request.url).searchParams.has(VERIFIER_PARAM)) return null
  const result = await exchange(request)
  switch (result.action) {
    case 'redirect_oauth': {
      const headers = new Headers({ location: result.redirectUrl.href })
      for (const cookie of result.cookies) headers.append('set-cookie', cookie)
      return new Response(null, { status: 302, headers })
    }
    // The exchange didn't happen. Our own guards decide what the page shows,
    // and its server functions refresh the session cookies themselves.
    case 'allow':
    case 'redirect_login':
      return null
  }
}
