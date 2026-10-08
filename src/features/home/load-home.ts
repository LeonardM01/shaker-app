import type { HomeResult, RowLine, UpdateBanner, Viewer, WatchlistRow } from '#/features/home/home-result'
import type { HomeStore, ListingDetails, TrackedListingState } from '#/features/home/home-store'

/** The signed-in user as the server read it from the session. */
export type HomeSessionUser = { userId: string; name: string; email: string }
export type HomeSession = HomeSessionUser | null

export type HomeDeps = {
  store: HomeStore
  now: () => Date
  /** A short-lived URL for a private listing photo. */
  signPhotoUrl: (photoKey: string) => Promise<string>
}

/** Home shows at most this many tracked listings; "Prikaži sve" has the rest. */
const homeRowLimit = 5

/** Below this many comparable listings there is no market price to speak of. */
const minComparables = 5

/** Builds the home result for the session's user. Never reads another user's data. */
export async function loadHome(deps: HomeDeps, session: HomeSession): Promise<HomeResult> {
  if (!session) return { kind: 'guest' }
  const viewer = viewerOf(session)
  try {
    return await loadWatchlist(deps, session.userId, viewer)
  } catch (error) {
    console.error('[home] watchlist failed to load', { userId: session.userId, error })
    return { kind: 'unavailable', viewer }
  }
}

/** Deletes the session user's link to one listing. */
export async function untrackListing(
  deps: Pick<HomeDeps, 'store'>,
  session: HomeSession,
  listingId: string,
): Promise<void> {
  if (!session) throw new Error('Unauthenticated untrack')
  await deps.store.untrack(session.userId, listingId)
}

async function loadWatchlist(
  deps: HomeDeps,
  userId: string,
  viewer: Viewer,
): Promise<HomeResult> {
  const states = await deps.store.listTrackedStates(userId)
  const newestFirst = [...states].sort(
    (a, b) => b.latest.checkedAt.getTime() - a.latest.checkedAt.getTime(),
  )
  const changed = newestFirst.filter(hasChanged).slice(0, homeRowLimit)
  const unchanged = newestFirst
    .filter((state) => !hasChanged(state))
    .slice(0, homeRowLimit - changed.length)
  const bannerState = pickBannerState(states)

  const visibleIds = [...changed, ...unchanged].map((state) => state.listingId)
  const detailIds = bannerState ? [...new Set([...visibleIds, bannerState.listingId])] : visibleIds
  const details = new Map(
    (await deps.store.getListingDetails(detailIds)).map((listing) => [listing.id, listing]),
  )
  const toRows = (group: TrackedListingState[]) =>
    Promise.all(
      group.flatMap((state) => {
        const listing = details.get(state.listingId)
        return listing ? [toRow(deps, state, listing)] : []
      }),
    )

  const bannerListing = bannerState && details.get(bannerState.listingId)
  return {
    kind: 'signed_in',
    now: deps.now().toISOString(),
    viewer,
    banner: bannerState && bannerListing ? toBanner(bannerState, bannerListing) : null,
    changed: await toRows(changed),
    unchanged: await toRows(unchanged),
    totalCount: states.length,
  }
}

function hasChanged({ status, latest, previous }: TrackedListingState): boolean {
  if (status === 'removed') return true
  if (!previous) return false
  return (
    latest.priceCents !== previous.priceCents ||
    latest.verdict !== previous.verdict ||
    hasNewRiskEvidence({ latest, previous })
  )
}

function hasNewRiskEvidence({
  latest,
  previous,
}: Pick<TrackedListingState, 'latest' | 'previous'>): boolean {
  if (!latest.riskEvidence || !previous) return false
  return previous.riskEvidence?.kind !== latest.riskEvidence.kind
}

function lineOf(state: TrackedListingState): RowLine {
  const { status, removedAt, latest, previous } = state
  if (status === 'removed') {
    return { kind: 'removed', removedAt: (removedAt ?? latest.checkedAt).toISOString() }
  }
  // A risk verdict always shows its evidence: red never appears without it.
  if (latest.riskEvidence && (hasNewRiskEvidence(state) || latest.verdict === 'risk')) {
    return { kind: 'risk_evidence', evidence: latest.riskEvidence }
  }
  if (previous && latest.priceCents !== previous.priceCents) {
    return { kind: 'price_change', deltaCents: latest.priceCents - previous.priceCents }
  }
  if (latest.comparableCount < minComparables) return { kind: 'too_few_comparables' }
  return { kind: 'unchanged' }
}

async function toRow(
  deps: HomeDeps,
  state: TrackedListingState,
  listing: ListingDetails,
): Promise<WatchlistRow> {
  return {
    listingId: listing.id,
    title: listing.title,
    marketplace: listing.marketplace,
    city: listing.city,
    photoUrl: listing.photoKey ? await deps.signPhotoUrl(listing.photoKey) : null,
    verdict: state.latest.verdict,
    priceCents: state.latest.priceCents,
    line: lineOf(state),
  }
}

/** The active listing with the largest drop between its last two checks; ties go to the newest check. */
function pickBannerState(states: TrackedListingState[]): TrackedListingState | null {
  let best: { state: TrackedListingState; drop: number } | null = null
  for (const state of states) {
    if (state.status === 'removed' || !state.previous) continue
    const drop = state.previous.priceCents - state.latest.priceCents
    if (drop <= 0) continue
    const isNewer = best && state.latest.checkedAt > best.state.latest.checkedAt
    if (!best || drop > best.drop || (drop === best.drop && isNewer)) best = { state, drop }
  }
  return best?.state ?? null
}

function toBanner(state: TrackedListingState, listing: ListingDetails): UpdateBanner {
  const { latest, previous } = state
  const average = latest.marketAverageCents
  const belowMarket =
    average !== null && latest.priceCents < average && latest.comparableCount >= minComparables
  return {
    listingId: listing.id,
    title: listing.title,
    dropCents: (previous?.priceCents ?? latest.priceCents) - latest.priceCents,
    priceCents: latest.priceCents,
    marketAverageCents: belowMarket ? average : null,
    checkedAt: latest.checkedAt.toISOString(),
  }
}

function viewerOf({ name, email }: HomeSessionUser): Viewer {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 0 ? words.slice(0, 2).map((word) => word[0]) : [email[0]]
  return { initials: letters.join('').toLocaleUpperCase('hr-HR') }
}
