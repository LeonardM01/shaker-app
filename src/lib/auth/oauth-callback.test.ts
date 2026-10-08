import { describe, expect, it, vi } from 'vitest'

import { oauthCallbackResponse } from '#/lib/auth/oauth-callback'

const SESSION_COOKIE = '__Secure-neon-auth.session_token=abc; Path=/; HttpOnly; Secure; SameSite=Lax'
const DATA_COOKIE = '__Secure-neon-auth.local.session_data=xyz; Path=/; HttpOnly; Secure; SameSite=Lax'

const callback = () => new Request('https://shaker.test/app?neon_auth_session_verifier=v123')

describe('oauthCallbackResponse', () => {
  it('leaves requests without a verifier alone', async () => {
    const exchange = vi.fn()

    const response = await oauthCallbackResponse(new Request('https://shaker.test/app'), exchange)

    expect(response).toBeNull()
    expect(exchange).not.toHaveBeenCalled()
  })

  it('redirects to the clean URL with the session cookies once the verifier is exchanged', async () => {
    const response = await oauthCallbackResponse(callback(), () =>
      Promise.resolve({
        action: 'redirect_oauth',
        redirectUrl: new URL('https://shaker.test/app'),
        cookies: [SESSION_COOKIE, DATA_COOKIE],
      }),
    )

    expect(response?.status).toBe(302)
    expect(response?.headers.get('location')).toBe('https://shaker.test/app')
    expect(response?.headers.getSetCookie()).toEqual([SESSION_COOKIE, DATA_COOKIE])
  })

  it('renders the page as usual when the exchange fails', async () => {
    const response = await oauthCallbackResponse(callback(), () => Promise.resolve({ action: 'allow' }))

    expect(response).toBeNull()
  })
})
