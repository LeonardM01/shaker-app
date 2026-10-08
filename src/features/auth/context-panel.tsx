import { Bell, Copy, ExternalLink, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { VerdictBadge } from '#/components/ui/verdict-badge'
import type { AuthContext, AuthContextListing } from '#/features/auth/auth-context'
import { authCopy } from '#/features/auth/copy'
import { formatPrice } from '#/lib/format'

const copy = authCopy.context

const benefitIcons: Record<(typeof copy.benefits)[number]['id'], LucideIcon> = {
  'copy-offer': Copy,
  'track-prices': Bell,
  comparables: ExternalLink,
}

function ListingCard({ listing }: { listing: AuthContextListing }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-bg-elevated p-5">
      <div className="flex items-center gap-4">
        <div className="size-14 shrink-0 overflow-hidden rounded-md bg-border-default">
          {listing.photoUrl && <img src={listing.photoUrl} alt="" className="size-full object-cover" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          <p className="line-clamp-2 text-title">{listing.title}</p>
          {listing.verdict && <VerdictBadge verdict={listing.verdict} />}
        </div>
        <p className="shrink-0 text-title">{formatPrice(listing.priceCents)}</p>
      </div>
      <div className="flex items-center gap-3 rounded-lg bg-bg-sand px-4 py-3">
        <Lock aria-hidden size={18} className="shrink-0 text-icon-primary" />
        <p className="flex-1 text-label">{copy.offerLabel}</p>
        {/* A fixed placeholder: the real offer never reaches a guest. */}
        <span aria-hidden className="font-display text-price blur-[5px] select-none">
          {copy.offerPlaceholder}
        </span>
      </div>
    </div>
  )
}

/**
 * The sand panel beside the auth form on desktop: the listing the visitor
 * came from (when known) and what an account unlocks.
 */
export function ContextPanel({ context }: { context: AuthContext }) {
  return (
    <aside
      aria-labelledby="auth-context-heading"
      className="flex h-full flex-col justify-center gap-8 rounded-2xl bg-bg-sand p-10 xl:p-16"
    >
      <div className="flex flex-col gap-2">
        <h2 id="auth-context-heading" className="font-display text-heading-large">
          {context.kind === 'listing' ? copy.listingHeading : copy.genericHeading}
        </h2>
        {context.kind === 'listing' && (
          <p className="text-body text-text-secondary">{copy.listingSubtitle}</p>
        )}
      </div>
      {context.kind === 'listing' && <ListingCard listing={context.listing} />}
      <ul className="flex flex-col gap-5">
        {copy.benefits.map((benefit) => {
          const Icon = benefitIcons[benefit.id]
          return (
            <li key={benefit.id} className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-elevated">
                <Icon aria-hidden size={20} className="text-icon-primary" />
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-title">{benefit.title}</p>
                <p className="text-body-small text-text-secondary">{benefit.body}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
