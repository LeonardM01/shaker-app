import type { AuthContextListing } from '#/features/auth/auth-context'
import { authCopy } from '#/features/auth/copy'

const copy = authCopy.context

/** The context panel collapsed to one sand card above the form on mobile. */
export function MobileContextCard({ listing }: { listing: AuthContextListing }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-bg-sand p-4">
      <div className="size-12 shrink-0 overflow-hidden rounded-md bg-border-default">
        {listing.photoUrl && <img src={listing.photoUrl} alt="" className="size-full object-cover" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="line-clamp-2 text-title">{copy.mobileHeading(listing.title)}</p>
        <p className="text-body-small text-text-secondary">{copy.mobileSubtitle}</p>
      </div>
    </div>
  )
}
