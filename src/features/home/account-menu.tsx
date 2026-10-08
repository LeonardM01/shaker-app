import { LogOut } from 'lucide-react'
import { useId } from 'react'

import { Avatar } from '#/components/ui/avatar'
import { homeCopy } from '#/features/home/copy'
import type { Viewer } from '#/features/home/home-result'

/**
 * The signed-in viewer's avatar, disclosing "Odjavi se". A native popover:
 * it closes on Esc and on a click outside.
 */
export function AccountMenu({ viewer, onSignOut }: { viewer: Viewer; onSignOut: () => void }) {
  const menuId = useId()
  return (
    <>
      <button
        type="button"
        popoverTarget={menuId}
        aria-label={homeCopy.account.label}
        className="flex size-11 cursor-pointer items-center justify-center rounded-full focus-ring"
      >
        <Avatar initials={viewer.initials} />
      </button>
      <div
        id={menuId}
        popover="auto"
        className="inset-auto top-16 right-4 m-0 min-w-48 rounded-lg bg-bg-elevated p-2 shadow-overlay md:top-18 md:right-12"
      >
        <button
          type="button"
          popoverTarget={menuId}
          popoverTargetAction="hide"
          onClick={onSignOut}
          className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-body hover:bg-bg-neutral focus-ring"
        >
          <LogOut aria-hidden size={20} className="text-icon-secondary" />
          {homeCopy.account.signOut}
        </button>
      </div>
    </>
  )
}
