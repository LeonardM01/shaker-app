import { createMiddleware, createStart } from '@tanstack/react-start'

import { finishOAuthSignIn } from '#/lib/auth/auth.server'

/** Completes a Google sign-in on whichever page Neon Auth returns to. */
const oauthCallback = createMiddleware().server(
  async ({ request, next }) => (await finishOAuthSignIn(request)) ?? next(),
)

export const startInstance = createStart(() => ({ requestMiddleware: [oauthCallback] }))
