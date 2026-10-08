import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { CircleAlert, LoaderCircle, Mail, User } from 'lucide-react'
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { SubmitEvent } from 'react'

import googleMarkUrl from '#/assets/google-g.svg'
import { buttonStyles } from '#/components/ui/button-styles'
import { TextField } from '#/components/ui/text-field'
import type { AuthFailure, AuthOutcome, AuthPort } from '#/features/auth/auth-port'
import type { AuthSearch } from '#/features/auth/auth-search'
import { destinationOf } from '#/features/auth/auth-search'
import { authCopy } from '#/features/auth/copy'
import { fieldErrorsOf, signInSchema, signUpSchema } from '#/features/auth/form-rules'
import type { FieldName } from '#/features/auth/form-rules'
import { PasswordField } from '#/features/auth/password-field'

export type AuthMode = 'sign-up' | 'sign-in'

type FormAlert = Exclude<AuthFailure, 'email_taken'> | 'google'

/** Idle, waiting on the e-mail submit, or handing over to Google. */
type Status = 'idle' | 'submitting' | 'google'

const paths = { 'sign-up': '/sign-up', 'sign-in': '/sign-in' } as const
const otherMode = { 'sign-up': 'sign-in', 'sign-in': 'sign-up' } as const
const fieldOrder: FieldName[] = ['username', 'email', 'password']

const linkClass = 'font-semibold text-text-brand underline underline-offset-2 focus-ring'

type AuthFormProps = {
  mode: AuthMode
  auth: AuthPort
  search: AuthSearch
  onSignedIn: () => Promise<void> | void
}

/**
 * Registracija or Prijava: Google, or the e-mail form. Validates on submit,
 * then on every change; on success hands over to `onSignedIn` and returns the
 * visitor to where they came from.
 */
export function AuthForm({ mode, auth, search, onSignedIn }: AuthFormProps) {
  const navigate = useNavigate()
  const router = useRouter()
  const copy = mode === 'sign-up' ? authCopy.signUp : authCopy.signIn
  const schema = mode === 'sign-up' ? signUpSchema : signInSchema
  const destination = destinationOf(search)
  const keep = { redirect: search.redirect, listing: search.listing }

  const [values, setValues] = useState<Record<FieldName, string>>({
    username: '',
    email: '',
    password: '',
  })
  const [attempted, setAttempted] = useState(false)
  const [emailTaken, setEmailTaken] = useState(false)
  const [alert, setAlert] = useState<FormAlert | null>(search.error ?? null)
  const [status, setStatus] = useState<Status>('idle')
  const inputs = useRef<Partial<Record<FieldName, HTMLInputElement | null>>>({})

  const errors = attempted ? fieldErrorsOf(schema, values) : {}

  function setValue(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field === 'email') setEmailTaken(false)
  }

  function handleOutcome(outcome: AuthOutcome) {
    if (outcome.ok) return
    setStatus('idle')
    switch (outcome.reason) {
      case 'email_taken':
        // Render the message first, so moving focus reads it out as the
        // field's description.
        flushSync(() => {
          setEmailTaken(true)
        })
        inputs.current.email?.focus()
        return
      case 'invalid_credentials':
        setValues((current) => ({ ...current, password: '' }))
        setAlert(outcome.reason)
        return
      case 'rate_limited':
      case 'unavailable':
        setAlert(outcome.reason)
        return
    }
  }

  async function submit() {
    if (status !== 'idle') return
    const invalid = fieldErrorsOf(schema, values)
    const firstInvalid = fieldOrder.find((field) => invalid[field])
    if (firstInvalid) {
      setAttempted(true)
      inputs.current[firstInvalid]?.focus()
      return
    }
    setStatus('submitting')
    setAlert(null)
    setEmailTaken(false)
    const outcome =
      mode === 'sign-up'
        ? await auth.signUp(signUpSchema.parse(values))
        : await auth.signIn(signInSchema.parse(values))
    if (!outcome.ok) {
      handleOutcome(outcome)
      return
    }
    await onSignedIn()
    await navigate({ href: destination })
  }

  async function startGoogle() {
    if (status !== 'idle') return
    setStatus('google')
    setAlert(null)
    const here = router.buildLocation({ to: paths[mode], search: { ...keep, error: 'google' } })
    const outcome = await auth.signInWithGoogle({
      callbackURL: new URL(destination, window.location.origin).href,
      errorCallbackURL: new URL(here.href, window.location.origin).href,
    })
    if (outcome.ok) return
    setStatus('idle')
    setAlert(outcome.reason === 'email_taken' ? 'unavailable' : outcome.reason)
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    // Errors become state inside submit(); nothing to catch here.
    void submit()
  }

  const register = (field: FieldName) => ({
    ref: (element: HTMLInputElement | null) => {
      inputs.current[field] = element
    },
    name: field,
    value: values[field],
    onChange: (event: { target: { value: string } }) => {
      setValue(field, event.target.value)
    },
    autoCapitalize: 'off',
    spellCheck: false,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-heading-large">{copy.heading}</h1>
        <p className="text-body text-text-secondary">{copy.subtitle}</p>
      </div>

      <button
        type="button"
        disabled={status === 'submitting'}
        aria-busy={status === 'google'}
        onClick={() => {
          // Failures become state inside startGoogle(); nothing to catch here.
          void startGoogle()
        }}
        className={`w-full disabled:cursor-not-allowed disabled:opacity-60 ${buttonStyles({ variant: 'secondary' })}`}
      >
        <img src={googleMarkUrl} alt="" width={20} height={20} className="size-5" />
        {authCopy.google}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border-default" />
        <span className="text-caption text-text-tertiary">{authCopy.divider}</span>
        <span className="h-px flex-1 bg-border-default" />
      </div>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {mode === 'sign-up' && (
            <TextField
              {...register('username')}
              label={authCopy.fields.username.label}
              icon={User}
              placeholder={authCopy.fields.username.placeholder}
              helper={authCopy.fields.username.helper}
              error={errors.username}
              autoComplete="nickname"
            />
          )}
          <TextField
            {...register('email')}
            label={authCopy.fields.email.label}
            icon={Mail}
            type="email"
            placeholder={authCopy.fields.email.placeholder}
            autoComplete="email"
            error={
              emailTaken ? (
                <>
                  {authCopy.emailTaken}{' '}
                  <Link to="/sign-in" search={keep} className={linkClass}>
                    {authCopy.emailTakenAction}
                  </Link>
                </>
              ) : (
                errors.email
              )
            }
          />
          <PasswordField
            {...register('password')}
            placeholder={
              mode === 'sign-up'
                ? authCopy.fields.password.placeholderNew
                : authCopy.fields.password.placeholderCurrent
            }
            autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
            error={errors.password}
          />
        </div>

        {alert && (
          <p role="alert" className="flex gap-2 rounded-md bg-bg-neutral p-3 text-body-small text-text-primary">
            <CircleAlert aria-hidden size={20} className="shrink-0 text-icon-secondary" />
            {authCopy.alerts[alert]}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'google'}
          aria-busy={status === 'submitting'}
          className={`w-full disabled:cursor-not-allowed disabled:opacity-60 aria-busy:cursor-wait ${buttonStyles({ variant: 'primary' })}`}
        >
          {status === 'submitting' && <LoaderCircle aria-hidden size={20} className="animate-spin" />}
          {copy.submit}
        </button>
      </form>

      <p className="text-caption text-text-secondary">
        {authCopy.legal.before}
        <Link to="/terms" className={linkClass}>
          {authCopy.legal.terms}
        </Link>
        {authCopy.legal.between}
        <Link to="/privacy" className={linkClass}>
          {authCopy.legal.privacy}
        </Link>
        {authCopy.legal.after}
      </p>

      <p className="text-body-small text-text-secondary">
        {copy.toggleQuestion}{' '}
        <Link to={paths[otherMode[mode]]} search={keep} className={linkClass}>
          {copy.toggleAction}
        </Link>
      </p>
    </div>
  )
}
