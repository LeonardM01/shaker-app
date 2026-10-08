import { AuthApiError } from '@neondatabase/auth'
import { describe, expect, it, vi } from 'vitest'

import { runAuthCall } from '#/features/auth/better-auth-port'

// The Neon client throws a normalised AuthApiError for a non-2xx response;
// plain Better Auth returns `{ error }` instead. Both must map the same way.

const thrown = (error: unknown) => () => Promise.reject(error)
const returned = (error: { code?: string; status: number; message?: string }) => () =>
  Promise.resolve({ error })

describe('runAuthCall', () => {
  it('is ok when the call returns no error', async () => {
    expect(await runAuthCall('sign-in', () => Promise.resolve({ error: null }))).toEqual({ ok: true })
  })

  it.each([
    ['a thrown invalid_credentials', thrown(new AuthApiError('Invalid', 400, 'invalid_credentials')), 'invalid_credentials'],
    ['a returned INVALID_EMAIL_OR_PASSWORD', returned({ code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 }), 'invalid_credentials'],
    ['a thrown user_already_exists', thrown(new AuthApiError('Exists', 422, 'user_already_exists')), 'email_taken'],
    ['a thrown email_exists', thrown(new AuthApiError('Exists', 422, 'email_exists')), 'email_taken'],
    ['a returned USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', returned({ code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', status: 422 }), 'email_taken'],
    ['a thrown 429', thrown(new AuthApiError('Slow down', 429, 'over_request_rate_limit')), 'rate_limited'],
    ['a returned 429', returned({ status: 429 }), 'rate_limited'],
  ] as const)('maps %s', async (_, call, reason) => {
    expect(await runAuthCall('sign-in', call)).toEqual({ ok: false, reason })
  })

  it('treats anything else, including a network failure, as unavailable and logs it', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(await runAuthCall('sign-up', thrown(new TypeError('Failed to fetch')))).toEqual({
      ok: false,
      reason: 'unavailable',
    })
    expect(await runAuthCall('sign-up', returned({ code: 'FAILED_TO_CREATE_USER', status: 500 }))).toEqual({
      ok: false,
      reason: 'unavailable',
    })
    expect(error).toHaveBeenCalledTimes(2)
    error.mockRestore()
  })
})
