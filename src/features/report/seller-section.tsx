import { Link } from '@tanstack/react-router'
import { BadgeCheck, Check, CircleHelp } from 'lucide-react'

import { buttonStyles } from '#/components/ui/button-styles'
import { reportCopy } from '#/features/report/copy'
import type { ReplyResult, ReviewResult } from '#/features/report/report-actions'
import { ReportSection } from '#/features/report/report-section'
import type { Report, SellerSection as SellerData } from '#/features/report/report-result'
import { ReviewCard } from '#/features/report/review-card'
import { ReviewForm } from '#/features/report/review-form'

const copy = reportCopy.seller

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-lg bg-bg-neutral p-3">
      <p className="font-display text-price">{value}</p>
      <p className="text-caption text-text-secondary">{label}</p>
    </div>
  )
}

/** DESIGN.md Seller Card: only what the marketplace publishes, plus Vrijedi.Ly reviews. */
function SellerCard({ seller }: { seller: SellerData }) {
  const year = seller.memberSince ? new Date(seller.memberSince).getUTCFullYear() : null
  const facts = seller.facts.map(copy.fact)
  const tiles = facts.flatMap((fact) => (fact.kind === 'tile' ? [fact] : []))
  const checks = facts.flatMap((fact) => (fact.kind === 'check' ? [fact.text] : []))
  const rating =
    seller.averageStars === null
      ? { value: '–', label: copy.noReviews }
      : {
          value: new Intl.NumberFormat('hr-HR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(
            seller.averageStars,
          ),
          label: copy.reviewCount(seller.reviewCount),
        }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border-default bg-bg-screen p-6">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-bg-brand-muted font-display text-heading-medium"
        >
          {seller.initials}
          {!seller.claimable && (
            <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full border-2 border-bg-screen bg-bg-brand">
              <Check size={12} strokeWidth={3} />
            </span>
          )}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-heading-small">{seller.displayName}</p>
          <p className="text-body-small text-text-secondary">{copy.memberSince(seller.marketplace, year, seller.city)}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <StatTile value={rating.value} label={rating.label} />
        {tiles.map((tile) => (
          <StatTile key={tile.label} value={tile.value} label={tile.label} />
        ))}
      </div>
      {(checks.length > 0 || seller.sameOwnerOn.length > 0 || seller.reviewCount === 0) && (
        <ul className="flex flex-col gap-2">
          {checks.map((check) => (
            <li key={check} className="flex items-center gap-2 text-body-small">
              <Check aria-hidden size={18} className="shrink-0 text-icon-brand" />
              {check}
            </li>
          ))}
          {seller.sameOwnerOn.length > 0 && (
            <li className="flex items-center gap-2 text-body-small">
              <Check aria-hidden size={18} className="shrink-0 text-icon-brand" />
              {copy.sameOwner(seller.marketplace, seller.sameOwnerOn)}
            </li>
          )}
          {seller.reviewCount === 0 && (
            <li className="flex items-center gap-2 text-body-small text-text-secondary">
              <CircleHelp aria-hidden size={18} className="shrink-0 text-icon-secondary" />
              {copy.newSeller}
            </li>
          )}
        </ul>
      )}
      {seller.claimedByViewer && (
        <p className="flex items-center gap-2 text-label text-text-brand">
          <BadgeCheck aria-hidden size={18} />
          {copy.claimedByYou}
        </p>
      )}
    </div>
  )
}

/** Prodavač i recenzije: the seller card, Vrijedi.Ly reviews with replies, and the review form. */
export function SellerSection({
  report,
  onWriteReview,
  onReply,
  onHelpful,
  onReportReview,
}: {
  report: Report
  onWriteReview: (review: { stars: number; text: string }) => Promise<ReviewResult>
  onReply: (reviewId: string, text: string) => Promise<ReplyResult>
  onHelpful: (reviewId: string) => Promise<void>
  onReportReview: (reviewId: string) => Promise<void>
}) {
  const { seller, reviews, viewer } = report
  return (
    <ReportSection id="prodavac" title={copy.heading}>
      {seller ? (
        <>
          <SellerCard seller={seller} />
          {reviews.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  sellerName={seller.displayName}
                  signedIn={viewer.signedIn}
                  onHelpful={() => onHelpful(review.id)}
                  onReport={() => onReportReview(review.id)}
                  onReply={(text) => onReply(review.id, text)}
                />
              ))}
            </div>
          )}
          {report.viewerCanReview && <ReviewForm sellerName={seller.displayName} onSubmit={onWriteReview} />}
          {!viewer.signedIn && (
            <Link
              to="/sign-in"
              search={{ redirect: `/app/listing/${report.listing.id}` }}
              className={`self-start ${buttonStyles({ variant: 'tertiary', size: 'medium' })}`}
            >
              {copy.guestReview}
            </Link>
          )}
        </>
      ) : (
        <p className="rounded-lg bg-bg-neutral px-5 py-4 text-body-small text-text-secondary">{copy.noReviews}</p>
      )}
    </ReportSection>
  )
}
