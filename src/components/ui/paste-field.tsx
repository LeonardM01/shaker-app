import { Link2 } from 'lucide-react'
import { useId } from 'react'
import type { SubmitEvent } from 'react'

import { buttonStyles } from '#/components/ui/button-styles'

type PasteFieldTone = 'default' | 'recognised' | 'invalid'

type PasteFieldProps = {
  label: string
  placeholder: string
  submitLabel: string
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  tone: PasteFieldTone
  /** IDs of the messages that describe the field (error, info). */
  describedBy?: string | undefined
}

// The pill's border and ring sit on the whole field (input + button) from
// `sm` up, and on the input row alone below `sm`, where the button stacks.
const pillTones: Record<PasteFieldTone, string> = {
  default:
    'sm:border-border-strong sm:focus-within:border-border-focus sm:focus-within:ring-2 sm:focus-within:ring-border-focus sm:focus-within:ring-offset-2',
  recognised: 'sm:border-border-focus sm:ring-2 sm:ring-border-focus sm:ring-offset-2',
  invalid: 'sm:border-border-danger sm:ring-1 sm:ring-border-danger',
}

const rowTones: Record<PasteFieldTone, string> = {
  default:
    'max-sm:border-border-strong max-sm:focus-within:border-border-focus max-sm:focus-within:ring-2 max-sm:focus-within:ring-border-focus max-sm:focus-within:ring-offset-2',
  recognised: 'max-sm:border-border-focus max-sm:ring-2 max-sm:ring-border-focus max-sm:ring-offset-2',
  invalid: 'max-sm:border-border-danger max-sm:ring-1 max-sm:ring-border-danger',
}

/**
 * The 64px pill paste field with the Primary inside it. Below `sm` the field
 * stacks and the button goes full width underneath.
 */
export function PasteField({
  label,
  placeholder,
  submitLabel,
  value,
  onValueChange,
  onSubmit,
  tone,
  describedBy,
}: PasteFieldProps) {
  const inputId = useId()

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div
        className={`flex flex-col gap-3 transition-shadow sm:h-16 sm:flex-row sm:items-center sm:rounded-full sm:border sm:bg-bg-elevated sm:py-2 sm:pr-2 sm:pl-6 ${pillTones[tone]}`}
      >
        <div
          className={`flex flex-1 items-center gap-3 transition-shadow max-sm:h-16 max-sm:rounded-full max-sm:border max-sm:bg-bg-elevated max-sm:px-6 ${rowTones[tone]}`}
        >
          <Link2 aria-hidden size={20} className="shrink-0 text-icon-secondary" />
          <input
            id={inputId}
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={value}
            placeholder={placeholder}
            aria-invalid={tone === 'invalid'}
            aria-describedby={describedBy}
            onChange={(event) => {
              onValueChange(event.target.value)
            }}
            className="h-12 min-w-0 flex-1 bg-transparent text-body text-text-primary outline-none placeholder:text-text-tertiary"
          />
        </div>
        <button type="submit" className={`w-full sm:w-auto ${buttonStyles({ variant: 'primary' })}`}>
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
