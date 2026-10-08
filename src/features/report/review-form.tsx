import { Star } from 'lucide-react'
import { useId, useState } from 'react'
import type { SubmitEvent } from 'react'

import { buttonStyles } from '#/components/ui/button-styles'
import { reportCopy } from '#/features/report/copy'
import type { ReviewResult } from '#/features/report/report-actions'

const copy = reportCopy.seller.reviewForm

const resultMessages: Record<ReviewResult['kind'], string> = {
  created: copy.done,
  already_reviewed: copy.alreadyReviewed,
  own_seller: copy.ownSeller,
  no_seller: copy.error,
}

/** "Napiši recenziju": stars and text, about this listing. One per seller. */
export function ReviewForm({
  sellerName,
  onSubmit,
}: {
  sellerName: string
  onSubmit: (review: { stars: number; text: string }) => Promise<ReviewResult>
}) {
  const [stars, setStars] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const headingId = useId()
  const textId = useId()

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (stars === null) {
      setMessage(copy.chooseStars)
      return
    }
    if (text.trim() === '') {
      setMessage(copy.writeText)
      return
    }
    try {
      const result = await onSubmit({ stars, text: text.trim() })
      setMessage(resultMessages[result.kind])
      setDone(result.kind === 'created')
    } catch {
      setMessage(copy.error)
    }
  }

  if (done) {
    return (
      <p role="status" className="rounded-lg bg-bg-positive-subtle px-4 py-3 text-body-small">
        {message}
      </p>
    )
  }

  return (
    <form
      aria-labelledby={headingId}
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-4 rounded-xl border border-border-default p-6"
    >
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="text-title">
          {copy.heading}
        </h3>
        <p className="text-body-small text-text-secondary">{copy.intro(sellerName)}</p>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-label">{copy.stars}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <label
              key={value}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-border-focus"
            >
              <input
                type="radio"
                name="stars"
                value={value}
                checked={stars === value}
                aria-label={copy.starLabel(value)}
                onChange={() => {
                  setStars(value)
                  setMessage(null)
                }}
                className="sr-only"
              />
              <Star
                aria-hidden
                size={24}
                className={
                  stars !== null && value <= stars
                    ? 'fill-bg-haggle text-border-warning'
                    : 'fill-transparent text-icon-secondary'
                }
              />
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <label htmlFor={textId} className="text-label">
          {copy.text}
        </label>
        <textarea
          id={textId}
          rows={4}
          maxLength={2000}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setMessage(null)
          }}
          className="rounded-md border border-border-strong bg-bg-elevated p-3 text-body outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus"
        />
      </div>
      {message && (
        <p role="alert" className="text-caption text-text-secondary">
          {message}
        </p>
      )}
      <button type="submit" className={`self-start ${buttonStyles({ variant: 'secondary' })}`}>
        {copy.submit}
      </button>
    </form>
  )
}
