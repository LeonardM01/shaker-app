import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { authContextQueryOptions } from '#/features/auth/auth-context.functions'
import { AuthRoutePage, skipIfSignedIn } from '#/features/auth/auth-route'
import { authSearchSchema } from '#/features/auth/auth-search'
import { authCopy } from '#/features/auth/copy'

/** Prijava: Google, or e-mail + password. */
export const Route = createFileRoute('/sign-in')({
  validateSearch: authSearchSchema,
  loaderDeps: ({ search }) => ({ listing: search.listing }),
  beforeLoad: ({ search }) => skipIfSignedIn(search),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(authContextQueryOptions(deps.listing)),
  head: () => ({ meta: [{ title: authCopy.signIn.pageTitle }] }),
  pendingComponent: () => <div aria-busy className="min-h-dvh" />,
  // Signing in must never depend on the context panel.
  errorComponent: SignInFallback,
  component: SignInPage,
})

function SignInPage() {
  const search = Route.useSearch()
  const { data } = useSuspenseQuery(authContextQueryOptions(search.listing))
  return <AuthRoutePage mode="sign-in" search={search} context={data} />
}

function SignInFallback() {
  return <AuthRoutePage mode="sign-in" search={Route.useSearch()} context={{ kind: 'generic' }} />
}
