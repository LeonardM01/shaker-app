// Facebook server-renders its Relay data as `<script type="application/json">`
// blocks. Parsers walk every object in them and pick out what they need.

import { parse } from 'node-html-parser'
import { z } from 'zod'

type FacebookPage = {
  /** Every JSON value embedded in the page. */
  data: unknown[]
  /** Facebook rendered its "This content isn't available right now" route. */
  isUnavailable: boolean
  /**
   * A bare login page instead of a Marketplace route. Readable logged-out
   * pages also carry a login form (in the header), so the form alone says nothing.
   */
  isLoginWall: boolean
}

const routeSchema = z.object({
  route: z.object({ rootView: z.object({ resource: z.object({ __dr: z.string() }) }) }),
})

/** Calls `visit` for every object nested anywhere in `value`. */
export function forEachObject(value: unknown, visit: (object: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) forEachObject(item, visit)
  } else if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>
    visit(object)
    for (const child of Object.values(object)) forEachObject(child, visit)
  }
}

export function readFacebookPage(html: string): FacebookPage {
  const root = parse(html)
  const data: unknown[] = []
  for (const script of root.querySelectorAll('script[type="application/json"]')) {
    try {
      data.push(JSON.parse(script.rawText))
    } catch {
      // Not every block is data we read; a broken one is skipped, not fatal.
    }
  }
  // The component the page's route renders, e.g. "CometMarketplaceSearchContentContainer.react".
  let routeRoot = null as string | null
  forEachObject(data, (object) => {
    const route = routeSchema.safeParse(object['initialRouteInfo'])
    if (route.success) routeRoot ??= route.data.route.rootView.resource.__dr
  })
  return {
    data,
    isUnavailable: routeRoot === 'CometErrorRoot.react',
    isLoginWall: routeRoot === null && root.querySelector('#login_form') !== null,
  }
}
