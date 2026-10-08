import { Outlet, createFileRoute } from '@tanstack/react-router'

import { AppSidebar } from '#/components/ui/app-sidebar'
import { shellCopy } from '#/components/ui/copy'
import { MobileTabBar } from '#/components/ui/mobile-tab-bar'
import { getPublicEnv } from '#/lib/env.public'

export const Route = createFileRoute('/app')({ component: AppShell })

/** Web app shell: sidebar on desktop, bottom tab bar on mobile. */
function AppShell() {
  return (
    <div className="flex min-h-dvh bg-bg-screen">
      <a
        href="#main"
        className="sr-only z-20 rounded-full bg-bg-elevated px-4 py-2 text-label shadow-overlay focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus-ring"
      >
        {shellCopy.skipLink}
      </a>
      <AppSidebar chromeWebStoreUrl={getPublicEnv().VITE_CHROME_WEB_STORE_URL} />
      <main id="main" className="min-w-0 flex-1">
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  )
}
