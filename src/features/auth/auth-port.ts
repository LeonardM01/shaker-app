import type { SignInInput, SignUpInput } from '#/features/auth/form-rules'

export type AuthFailure = 'email_taken' | 'invalid_credentials' | 'rate_limited' | 'unavailable'

export type AuthOutcome = { ok: true } | { ok: false; reason: AuthFailure }

/**
 * What the auth screens need from the auth service. The screens never touch
 * Better Auth directly; better-auth-port.ts is the production adapter.
 */
export type AuthPort = {
  signUp: (input: SignUpInput) => Promise<AuthOutcome>
  signIn: (input: SignInInput) => Promise<AuthOutcome>
  /**
   * Starts the Google redirect. Only a failure to start matters to the
   * caller; on success the browser is already leaving the page.
   */
  signInWithGoogle: (input: { callbackURL: string; errorCallbackURL: string }) => Promise<AuthOutcome>
}
