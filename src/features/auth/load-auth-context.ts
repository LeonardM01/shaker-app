import type { AuthContext } from '#/features/auth/auth-context'
import type { AuthContextStore } from '#/features/auth/auth-context-store'

export type AuthContextDeps = {
  store: AuthContextStore
  /** A short-lived URL for a private listing photo. */
  signPhotoUrl: (photoKey: string) => Promise<string>
}

const generic: AuthContext = { kind: 'generic' }

/**
 * The context panel for an auth screen opened from a listing's report. Falls
 * back to the generic panel whenever the listing can't be shown, because the
 * panel must never block signing in.
 */
export async function loadAuthContext(
  deps: AuthContextDeps,
  listingId: string | undefined,
): Promise<AuthContext> {
  if (!listingId) return generic
  try {
    const listing = await deps.store.getListingWithLatestCheck(listingId)
    if (!listing?.latestCheck) return generic
    const { verdict, priceCents } = listing.latestCheck
    return {
      kind: 'listing',
      listing: {
        title: listing.title,
        photoUrl: listing.photoKey ? await deps.signPhotoUrl(listing.photoKey) : null,
        verdict: verdict === 'risk' ? null : verdict,
        priceCents,
      },
    }
  } catch (error) {
    console.error('[auth] context listing failed to load', { listingId, error })
    return generic
  }
}
