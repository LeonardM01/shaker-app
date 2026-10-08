import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * Renders `ui` at `path` inside a memory router, so `<Link>` works. Every
 * other path renders its own pathname, which tests can assert on.
 */
export async function renderInRouter(ui: () => ReactNode, path = '/app/test') {
  const rootRoute = createRootRoute({ component: Outlet })
  const routeTree = rootRoute.addChildren([
    createRoute({ getParentRoute: () => rootRoute, path, component: ui }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '$',
      component: function Elsewhere() {
        return <p>{`route:${window.location.pathname}`}</p>
      },
    }),
  ])
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  const result = render(<RouterProvider router={router} />)
  return { router, ...result }
}
