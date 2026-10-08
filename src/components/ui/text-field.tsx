import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'
import type { ComponentProps, ReactNode, Ref } from 'react'

type TextFieldProps = Omit<
  ComponentProps<'input'>,
  'id' | 'className' | 'aria-invalid' | 'aria-describedby' | 'ref'
> & {
  label: string
  icon: LucideIcon
  /** Always-visible guidance under the field. An error replaces it. */
  helper?: string | undefined
  /** Names the problem and how to fix it; marks the field invalid. */
  error?: ReactNode
  /** An action inside the field's right edge, such as show/hide. */
  trailing?: ReactNode
  ref?: Ref<HTMLInputElement>
}

/**
 * DESIGN.md Input: 48px, 12px radius, label above, leading icon, helper or
 * error text below. The message is tied to the input through
 * `aria-describedby`.
 */
export function TextField({ label, icon: Icon, helper, error, trailing, ref, ...input }: TextFieldProps) {
  const inputId = useId()
  const messageId = useId()
  const invalid = Boolean(error)
  const message = invalid ? error : helper

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-label">
        {label}
      </label>
      <div
        className={`flex h-12 items-center gap-2 rounded-md border bg-bg-screen px-4 transition-shadow ${
          invalid
            ? 'border-border-danger ring-1 ring-border-danger'
            : 'border-border-strong has-[input:focus]:border-border-focus has-[input:focus]:ring-1 has-[input:focus]:ring-border-focus'
        }`}
      >
        <Icon aria-hidden size={20} className="shrink-0 text-icon-secondary" />
        <input
          ref={ref}
          id={inputId}
          aria-invalid={invalid}
          aria-describedby={message ? messageId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-body text-text-primary outline-none placeholder:text-text-tertiary"
          {...input}
        />
        {trailing}
      </div>
      {message && (
        <p id={messageId} className={`text-caption ${invalid ? 'text-text-danger' : 'text-text-tertiary'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
