import { isAuthError } from '@neondatabase/auth'

import type { AuthFailure, AuthOutcome, AuthPort } from '#/features/auth/auth-port'
import { getAuthClient } from '#/lib/auth/auth-client'

type AuthCallError = { code?: string | undefined; status?: number | undefined; message?: string | undefined }

// Better Auth's codes (returned as `{ error }`) and the normalised codes the
// Neon client throws for a non-2xx response (an AuthApiError).
const emailTakenCodes = new Set([
  'USER_ALREADY_EXISTS',
  'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
  'user_already_exists',
  'email_exists',
])
const invalidCredentialCodes = new Set([
  'INVALID_EMAIL_OR_PASSWORD',
  'INVALID_PASSWORD',
  'invalid_credentials',
])

function failureOf({ code, status }: AuthCallError): AuthFailure {
  if (status === 429 || code === 'over_request_rate_limit') return 'rate_limited'
  if (code && emailTakenCodes.has(code)) return 'email_taken'
  if (code && invalidCredentialCodes.has(code)) return 'invalid_credentials'
  return 'unavailable'
}

function outcomeOf(action: string, error: AuthCallError): AuthOutcome {
  const reason = failureOf(error)
  if (reason === 'unavailable') {
    console.error(`[auth] ${action} failed`, {
      status: error.status,
      code: error.code,
      message: error.message,
    })
  }
  return { ok: false, reason }
}

/**
 * Runs one auth client call and maps its result, whether the failure comes
 * back as `{ error }` or is thrown. Logs unexpected failures with the action
 * name only: inputs (and so passwords) never reach the log.
 */
export async function runAuthCall(
  action: string,
  call: () => Promise<{ error: AuthCallError | null }>,
): Promise<AuthOutcome> {
  try {
    const { error } = await call()
    return error ? outcomeOf(action, error) : { ok: true }
  } catch (error) {
    if (isAuthError(error)) return outcomeOf(action, error)
    console.error(`[auth] ${action} failed`, { error })
    return { ok: false, reason: 'unavailable' }
  }
}

/**
 * The production AuthPort: the browser Better Auth client behind our
 * `/api/auth` proxy. Browser only; every method reads `window`.
 */
export const betterAuthPort: AuthPort = {
  signUp: ({ username, email, password }) =>
    // Neon Auth has no username plugin: the username is the user's `name`.
    runAuthCall('sign-up', () => getAuthClient().signUp.email({ name: username, email, password })),
  signIn: ({ email, password }) =>
    runAuthCall('sign-in', () => getAuthClient().signIn.email({ email, password })),
  signInWithGoogle: ({ callbackURL, errorCallbackURL }) =>
    // On success the client sends the browser to Google; the screen stays busy.
    runAuthCall('google', () =>
      getAuthClient().signIn.social({ provider: 'google', callbackURL, errorCallbackURL }),
    ),
}

/** Ends the session through the same proxy. */
export const signOut = () => runAuthCall('sign-out', () => getAuthClient().signOut())
