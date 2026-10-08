import { Link } from '@tanstack/react-router'
import { House } from 'lucide-react'

import { shellCopy } from '#/components/ui/copy'

/** Mobile bottom tab bar, shown below `md` in place of the sidebar. */
export function MobileTabBar() {
  return (
    <nav
      aria-label={shellCopy.nav}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border-default bg-bg-screen pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex justify-around">
        <li>
          <Link
            to="/app"
            activeOptions={{ exact: true }}
            className="flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 px-3 text-label-small text-text-secondary focus-ring data-[status=active]:text-text-primary"
          >
            <House aria-hidden size={24} />
            {shellCopy.home}
          </Link>
        </li>
      </ul>
    </nav>
  )
}
