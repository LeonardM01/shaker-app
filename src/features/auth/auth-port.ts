export type AuthFailure = 'email_taken' | 'invalid_credentials' | 'rate_limited' | 'unavailable'

export type AuthOutcome = { ok: true } | { ok: false; reason: AuthFailure }

/**
 * What the auth screens need from the auth service. The screens never touch
 * Better Auth directly; better-auth-port.ts is the production adapter.
 */
export type AuthPort = {
  signUp: (input: { username: string; email: string; password: string }) => Promise<AuthOutcome>
  signIn: (input: { email: string; password: string }) => Promise<AuthOutcome>
  /** Starts the Google redirect. Resolves only if starting it failed. */
  signInWithGoogle: (input: { callbackURL: string; errorCallbackURL: string }) => Promise<AuthOutcome>
}
