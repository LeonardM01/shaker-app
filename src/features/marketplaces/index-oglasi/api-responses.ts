// Index oglasi is a client-rendered app: its HTML shell has no listing data,
// and the rendered DOM shows only the first few photos and day-level dates.
// So its parsers read the JSON the page fetches from Index's own API while
// it loads in our browser session; we never call that API ourselves (ADR 0003).

import type { z } from 'zod'

import { parseFailed, validated } from '#/features/marketplaces/parsing'

/** A response the page received while loading, kept by the Steel adapter. */
export type CapturedResponse = { url: string; status: number; body: string }

type Matcher = (url: URL) => boolean

/** The endpoints Index oglasi pages call that the parsers read. */
export const indexApi = {
  /** `/aditem/single-ad?code=<code>`: one listing (404 when it's gone). */
  singleAd: (url) => url.pathname === '/oglasi/api/aditem/single-ad',
  /** `/aditem?text=…`: search results. */
  adSearch: (url) => url.pathname === '/oglasi/api/aditem' && url.searchParams.has('text'),
  /** `/aditem?userId=…`: a seller's active listings (with a total count). */
  sellerAds: (url) => url.pathname === '/oglasi/api/aditem' && url.searchParams.has('userId'),
  /** `/user/<id or username>`: public account data. */
  user: (url) => /^\/oglasi\/api\/user\/[^/]+$/.test(url.pathname),
  /** `/user-rating/overall-count/<id>`: rating average and count. */
  userRating: (url) => url.pathname.startsWith('/oglasi/api/user-rating/overall-count/'),
  /** The category tree, used to build listing URLs from search results. */
  categories: (url) => url.pathname === '/oglasi/api/configuration/category',
} satisfies Record<string, Matcher>

/** Whether a captured response came from one of `indexApi`'s endpoints. */
export function matches(response: CapturedResponse, matcher: Matcher): boolean {
  try {
    const url = new URL(response.url)
    return url.hostname === 'www.index.hr' && matcher(url)
  } catch {
    return false
  }
}

/** The last response from an endpoint, if the page made that call. */
export function findResponse(responses: CapturedResponse[], matcher: Matcher): CapturedResponse | undefined {
  for (let index = responses.length - 1; index >= 0; index--) {
    const response = responses[index]
    if (response && matches(response, matcher)) return response
  }
  return undefined
}

/** A successful response's JSON body, validated. */
export function readJson<T extends z.ZodType>(response: CapturedResponse, schema: T, what: string): z.output<T> {
  if (response.status !== 200) parseFailed(`${what} answered HTTP ${String(response.status)}`)
  let body: unknown
  try {
    body = JSON.parse(response.body)
  } catch (error) {
    return parseFailed(`${what} is not JSON`, error)
  }
  return validated(schema, body, what)
}

const zagrebCounty = 'Grad Zagreb'

/** Index names Zagreb by district ("Trnje") with county "Grad Zagreb". */
export function indexPlace(location: {
  countyName?: string | null | undefined
  cityName?: string | null | undefined
  settlementName?: string | null | undefined
}): { city: string | null; neighbourhood: string | null } {
  if (location.countyName === zagrebCounty) {
    return { city: 'Zagreb', neighbourhood: location.settlementName ?? location.cityName ?? null }
  }
  const city = location.cityName ?? null
  const settlement = location.settlementName ?? null
  return { city, neighbourhood: settlement === city ? null : settlement }
}
