import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { authContextQueryOptions } from '#/features/auth/auth-context.functions'
import { AuthRoutePage, skipIfSignedIn } from '#/features/auth/auth-route'
import { authSearchSchema } from '#/features/auth/auth-search'
import { authCopy } from '#/features/auth/copy'

/** Registracija: Google, or username + e-mail + password. */
export const Route = createFileRoute('/sign-up')({
  validateSearch: authSearchSchema,
  loaderDeps: ({ search }) => ({ listing: search.listing }),
  beforeLoad: ({ search }) => skipIfSignedIn(search),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(authContextQueryOptions(deps.listing)),
  head: () => ({ meta: [{ title: authCopy.signUp.pageTitle }] }),
  pendingComponent: () => <div aria-busy className="min-h-dvh" />,
  // Signing up must never depend on the context panel.
  errorComponent: SignUpFallback,
  component: SignUpPage,
})

function SignUpPage() {
  const search = Route.useSearch()
  const { data } = useSuspenseQuery(authContextQueryOptions(search.listing))
  return <AuthRoutePage mode="sign-up" search={search} context={data} />
}

function SignUpFallback() {
  return <AuthRoutePage mode="sign-up" search={Route.useSearch()} context={{ kind: 'generic' }} />
}
