import { useId, useState } from 'react'
import type { SubmitEvent } from 'react'

import { buttonStyles } from '#/components/ui/button-styles'
import { Rating } from '#/components/ui/rating'
import { Tag } from '#/components/ui/tag'
import type { ReplyResult } from '#/features/report/report-actions'
import { marketplaceTags, reportCopy } from '#/features/report/copy'
import type { ReviewItem } from '#/features/report/report-result'
import { formatDate } from '#/lib/format'
import { initialsOf } from '#/lib/initials'

const copy = reportCopy.seller


function ReplyForm({ onReply }: { onReply: (text: string) => Promise<ReplyResult> }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fieldId = useId()

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
        className={`self-start ${buttonStyles({ variant: 'tertiary', size: 'medium' })}`}
      >
        {copy.replyForm.open}
      </button>
    )
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (text.trim() === '') return
    try {
      const result = await onReply(text.trim())
      if (result.kind === 'replied') setOpen(false)
      else setError(result.kind === 'already_replied' ? copy.replyForm.alreadyReplied : copy.replyForm.error)
    } catch {
      setError(copy.replyForm.error)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-2 rounded-lg bg-bg-sand p-4">
      <label htmlFor={fieldId} className="text-label">
        {copy.replyForm.label}
      </label>
      <textarea
        id={fieldId}
        rows={3}
        maxLength={2000}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
        }}
        className="rounded-md border border-border-strong bg-bg-elevated p-3 text-body outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus"
      />
      {error && (
        <p role="alert" className="text-caption text-text-secondary">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className={buttonStyles({ variant: 'primary', size: 'medium' })}>
          {copy.replyForm.submit}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
          }}
          className={buttonStyles({ variant: 'tertiary', size: 'medium' })}
        >
          {copy.replyForm.cancel}
        </button>
      </div>
    </form>
  )
}

/** DESIGN.md Review Card: author, date and platform, stars, text, and the seller's reply on sand. */
export function ReviewCard({
  review,
  sellerName,
  signedIn,
  onHelpful,
  onReport,
  onReply,
}: {
  review: ReviewItem
  sellerName: string
  signedIn: boolean
  onHelpful: () => Promise<void>
  onReport: () => Promise<void>
  onReply: (text: string) => Promise<ReplyResult>
}) {
  const [reported, setReported] = useState(false)
  return (
    <article
      aria-label={review.reviewerName}
      className="flex flex-col gap-4 rounded-xl border border-border-default bg-bg-screen p-6"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-brand-muted text-label"
        >
          {initialsOf(review.reviewerName)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-title">{review.reviewerName}</p>
          <p className="text-caption text-text-tertiary">{formatDate(review.createdAt)}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          {review.isDemo && <Tag>{copy.demo}</Tag>}
          <Tag>{marketplaceTags[review.marketplace]}</Tag>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Rating stars={review.stars} />
        <span className="sr-only">{copy.reviewForm.starLabel(review.stars)}</span>
        <p className="text-label">{review.listingTitle}</p>
        {review.verifiedPurchase && <Tag>{copy.verified}</Tag>}
      </div>
      <p className="text-body">{review.text}</p>
      {review.reply && (
        <div className="flex flex-col gap-1 rounded-lg bg-bg-sand px-4 py-3">
          <p className="text-caption text-text-secondary">{copy.reply(sellerName)}</p>
          <p className="text-body-small">{review.reply.text}</p>
        </div>
      )}
      {review.viewerCanReply && <ReplyForm onReply={onReply} />}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={!signedIn || review.markedHelpfulByViewer}
          aria-pressed={review.markedHelpfulByViewer}
          // The refetch after a mark updates the count; a failed mark leaves it as it was.
          onClick={() => void onHelpful().catch(() => undefined)}
          className="-ml-2 min-h-11 rounded-full px-2 text-label text-text-brand focus-ring disabled:cursor-default disabled:text-text-secondary"
        >
          {review.markedHelpfulByViewer ? copy.helpfulDone(review.helpfulCount) : copy.helpful(review.helpfulCount)}
        </button>
        {signedIn && (
          <button
            type="button"
            disabled={reported}
            // A failed report leaves the button as it was, ready to try again.
            onClick={() => {
              onReport()
                .then(() => {
                  setReported(true)
                })
                .catch(() => undefined)
            }}
            className="-mr-2 min-h-11 rounded-full px-2 text-body-small text-text-tertiary focus-ring"
          >
            {reported ? copy.reported : copy.report}
          </button>
        )}
      </div>
    </article>
  )
}
