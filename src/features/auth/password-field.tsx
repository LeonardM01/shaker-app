import { Eye, EyeOff, Lock } from 'lucide-react'
import { useState } from 'react'
import type { ComponentProps } from 'react'

import { TextField } from '#/components/ui/text-field'
import { authCopy } from '#/features/auth/copy'

const copy = authCopy.fields.password

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, 'label' | 'icon' | 'type' | 'trailing'>

/** "Lozinka" with a show/hide toggle that never submits the form. */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye
  return (
    <TextField
      {...props}
      label={copy.label}
      icon={Lock}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          aria-pressed={visible}
          aria-label={visible ? copy.hide : copy.show}
          onClick={() => {
            setVisible(!visible)
          }}
          className="-mr-3 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-icon-secondary focus-ring"
        >
          <Icon aria-hidden size={20} />
        </button>
      }
    />
  )
}
