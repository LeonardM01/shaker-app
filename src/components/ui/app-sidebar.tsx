import { Link } from '@tanstack/react-router'
import { House, Puzzle } from 'lucide-react'

import { buttonStyles } from '#/components/ui/button-styles'
import { shellCopy } from '#/components/ui/copy'
import { Logo } from '#/components/ui/logo'

/**
 * Desktop app sidebar (256px): logo, text nav with the active item on a
 * `bg/neutral` pill, and the extension card at the bottom. Items whose screens
 * don't exist yet are left out.
 */
export function AppSidebar({ chromeWebStoreUrl }: { chromeWebStoreUrl: string | undefined }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 px-4 pt-8 pb-6 md:flex">
      <Link to="/app" className="self-start rounded-sm px-4 focus-ring">
        <Logo />
      </Link>
      <nav aria-label={shellCopy.nav}>
        <ul className="flex flex-col gap-1">
          <li>
            <Link
              to="/app"
              activeOptions={{ exact: true }}
              className="flex h-11 items-center gap-3 rounded-full px-4 text-body text-text-secondary hover:bg-bg-neutral focus-ring data-[status=active]:bg-bg-neutral data-[status=active]:font-semibold data-[status=active]:text-text-primary"
            >
              <House aria-hidden size={20} />
              {shellCopy.home}
            </Link>
          </li>
        </ul>
      </nav>
      {chromeWebStoreUrl && (
        <section className="mt-auto flex flex-col items-start gap-2 rounded-xl bg-bg-sand p-4">
          <Puzzle aria-hidden size={20} />
          <h2 className="text-title">{shellCopy.extension.title}</h2>
          <p className="text-body-small text-text-secondary">{shellCopy.extension.body}</p>
          <a
            href={chromeWebStoreUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonStyles({ variant: 'tertiary', size: 'medium' })}
          >
            {shellCopy.extension.action}
          </a>
        </section>
      )}
    </aside>
  )
}
