import { Link } from '@tanstack/react-router'
import { Bell, Copy, Lock, Store } from 'lucide-react'
import { useState } from 'react'

import { buttonStyles } from '#/components/ui/button-styles'
import { reportCopy } from '#/features/report/copy'
import type { ClaimResult } from '#/features/report/report-actions'
import type { Report } from '#/features/report/report-result'
import { useCopied } from '#/features/report/use-copied'
import { formatPrice } from '#/lib/format'

const copy = reportCopy.offer

/** The haggle helper on sand: the offer, the saving, a ready message and "Kopiraj ponudu". */
function HaggleHelper({ report, copyText }: { report: Report; copyText: (text: string) => Promise<void> }) {
  const { copiedKey, copy: copyItem } = useCopied(copyText)
  const { offer } = report
  const redirect = `/app/listing/${report.listing.id}`

  return (
    <section aria-label={copy.heading} className="flex flex-col gap-4 rounded-xl bg-bg-sand p-6">
      <p className="text-label text-text-secondary">{copy.heading}</p>
      {offer.kind === 'none' && <p className="text-body-small text-text-secondary">{copy.none}</p>}
      {offer.kind === 'unlocked' && (
        <>
          <div className="flex flex-col gap-1">
            <p className="font-display text-price-xl opsz-96">{formatPrice(offer.offerCents)}</p>
            <p className="text-label text-text-positive">{copy.saving(offer.savingCents, offer.savingPercent)}</p>
          </div>
          <p className="rounded-lg bg-bg-elevated p-4 text-body-small">{offer.message ?? copy.noMessage}</p>
          <button
            type="button"
            onClick={() => void copyItem('offer', offer.message ?? formatPrice(offer.offerCents))}
            className={`w-full ${buttonStyles({ variant: 'primary' })}`}
          >
            <Copy aria-hidden size={20} />
            {copy.copy}
          </button>
          <p role="status" className="text-caption text-text-secondary empty:hidden">
            {copiedKey === 'offer' ? copy.copied : ''}
          </p>
          <p className="text-caption text-text-secondary">{copy.basis}</p>
        </>
      )}
      {offer.kind === 'locked' && (
        <>
          <div className="flex flex-col gap-1">
            <p aria-hidden className="font-display text-price-xl opsz-96 blur-md select-none">
              {copy.placeholderPrice}
            </p>
            <p className="text-label text-text-positive">{copy.savingLocked(offer.approxSavingCents)}</p>
          </div>
          <p aria-hidden inert className="rounded-lg bg-bg-elevated p-4 text-body-small blur-sm select-none">
            {copy.placeholderMessage}
          </p>
          <p className="flex gap-2 text-body-small text-text-secondary">
            <Lock aria-hidden size={16} className="mt-0.5 shrink-0" />
            {copy.lockLine}
          </p>
          <Link to="/sign-up" search={{ redirect }} className={`w-full ${buttonStyles({ variant: 'primary' })}`}>
            <Lock aria-hidden size={18} />
            {copy.lockAction}
          </Link>
          <p className="text-center text-body-small text-text-secondary">
            {copy.haveAccount}{' '}
            <Link
              to="/sign-in"
              search={{ redirect }}
              className="font-semibold text-text-brand underline underline-offset-2 focus-ring"
            >
              {copy.signIn}
            </Link>
          </p>
        </>
      )}
    </section>
  )
}

/** "Ovo je moj oglas": claims the seller account; a guest goes to sign-up first. */
function ClaimListing({ report, onClaim }: { report: Report; onClaim: () => Promise<ClaimResult> }) {
  const [message, setMessage] = useState<string | null>(null)
  const { seller, viewer } = report
  if (!seller?.claimable && !message) return null

  const button = (
    <span className="inline-flex items-center gap-2">
      <Store aria-hidden size={16} />
      {reportCopy.claim.action}
    </span>
  )

  return (
    <div className="flex flex-col items-start gap-1 px-1">
      {message ? (
        <p role="status" className="text-body-small text-text-secondary">
          {message}
        </p>
      ) : viewer.signedIn ? (
        <button
          type="button"
          onClick={() => {
            onClaim()
              .then((result) => {
                setMessage(
                  result.kind === 'claimed'
                    ? reportCopy.claim.done
                    : result.kind === 'already_claimed'
                      ? reportCopy.claim.alreadyClaimed
                      : reportCopy.claim.error,
                )
              })
              .catch(() => {
                setMessage(reportCopy.claim.error)
              })
          }}
          className={buttonStyles({ variant: 'tertiary', size: 'medium' })}
        >
          {button}
        </button>
      ) : (
        <Link
          to="/sign-up"
          search={{ redirect: `/app/listing/${report.listing.id}` }}
          className={buttonStyles({ variant: 'tertiary', size: 'medium' })}
        >
          {button}
        </Link>
      )}
      {!message && <p className="text-caption text-text-tertiary">{reportCopy.claim.hint}</p>}
    </div>
  )
}

/** The right rail: Predložena ponuda, "Pratimo ovaj oglas" and "Ovo je moj oglas". */
export function OfferRail({
  report,
  copyText,
  onClaim,
}: {
  report: Report
  copyText: (text: string) => Promise<void>
  onClaim: () => Promise<ClaimResult>
}) {
  return (
    <aside aria-label={copy.heading} className="flex flex-col gap-4">
      <HaggleHelper report={report} copyText={copyText} />
      {report.tracked === true && (
        <div className="flex gap-3 rounded-xl border border-border-default p-5">
          <Bell aria-hidden size={20} className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <p className="text-title">{reportCopy.tracking.title}</p>
            <p className="text-body-small text-text-secondary">{reportCopy.tracking.body}</p>
          </div>
        </div>
      )}
      <ClaimListing report={report} onClaim={onClaim} />
    </aside>
  )
}
