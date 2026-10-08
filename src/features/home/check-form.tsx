import { useNavigate } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { useId, useState } from 'react'

import { PasteField } from '#/components/ui/paste-field'
import { Tag } from '#/components/ui/tag'
import { marketplaces } from '#/lib/listing'
import { marketplaceNames, homeCopy } from '#/features/home/copy'
import { recognizeListingLink } from '#/features/home/link-recognition'

type Rejection = 'not_a_listing' | 'unsupported_site'

/**
 * "Provjeri oglas": recognises the link as it's typed, and only scolds on
 * submit. A recognised link goes to the check route, which owns the check.
 */
export function CheckForm() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [rejection, setRejection] = useState<Rejection | null>(null)
  const messageId = useId()
  const recognition = recognizeListingLink(value)

  function handleSubmit() {
    switch (recognition.kind) {
      case 'recognised':
        // Navigation errors surface through the router; nothing to do here.
        void navigate({ to: '/app/check', search: { url: recognition.canonicalUrl } })
        return
      case 'empty':
        return
      case 'not_a_listing':
      case 'unsupported_site':
        setRejection(recognition.kind)
        return
    }
  }

  const tone = rejection === 'not_a_listing' ? 'invalid' : recognition.kind === 'recognised' ? 'recognised' : 'default'

  return (
    <div className="flex flex-col gap-3">
      <PasteField
        label={homeCopy.field.label}
        placeholder={homeCopy.field.placeholder}
        submitLabel={homeCopy.field.submit}
        value={value}
        onValueChange={(next) => {
          setValue(next)
          setRejection(null)
        }}
        onSubmit={handleSubmit}
        tone={tone}
        describedBy={rejection ? messageId : undefined}
      />
      <p role="status" className="px-6 text-caption text-text-secondary empty:hidden">
        {recognition.kind === 'recognised' ? homeCopy.field.recognised(recognition.marketplace) : ''}
      </p>
      {rejection === 'not_a_listing' && (
        <p id={messageId} className="px-6 text-caption text-text-danger">
          {homeCopy.field.notAListing}
        </p>
      )}
      {rejection === 'unsupported_site' && (
        <div id={messageId} className="flex gap-3 rounded-lg bg-bg-info-subtle p-4">
          <Info aria-hidden size={20} className="mt-0.5 shrink-0 text-icon-info" />
          <div>
            <p className="text-title">{homeCopy.field.unsupportedTitle}</p>
            <p className="text-body-small text-text-secondary">{homeCopy.field.unsupportedBody}</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden className="hidden text-body-small text-text-tertiary sm:inline">
          {homeCopy.field.supportedLabel}
        </span>
        <ul aria-label={homeCopy.field.supportedLabel} className="flex flex-wrap gap-2">
          {marketplaces.map((marketplace) => (
            <li key={marketplace}>
              <Tag>{marketplaceNames[marketplace]}</Tag>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
