// Njuškalo URL shapes: listing pages are recognised in
// src/features/home/link-recognition.ts; this covers search and seller pages.

const njuskaloOrigin = 'https://www.njuskalo.hr'

/** The search results page for a free-text query, in Njuškalo's default order. */
export function njuskaloSearchUrl(query: string): string {
  const url = new URL('/search/', njuskaloOrigin)
  url.searchParams.set('keywords', query.trim())
  return url.href
}

/** `/<category>/<slug>-oglas-<id>`, the shape listing pages and search results use. */
export function njuskaloListingUrl(categorySlug: string, titleSlug: string, id: number): string {
  return new URL(`/${categorySlug}/${titleSlug}-oglas-${String(id)}`, njuskaloOrigin).href
}

// Private sellers live under /korisnik/, stores under /trgovina/, agencies under /agencija/.
const sellerPath = /^\/(?:korisnik|trgovina|agencija)\/[^/]+\/?$/

/**
 * The absolute profile URL for a seller path or URL taken from a Njuškalo
 * page, or null when it isn't a Njuškalo seller profile.
 */
export function njuskaloSellerUrl(profileUrl: string): string | null {
  let url: URL
  try {
    url = new URL(profileUrl, njuskaloOrigin)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '')
  if (host !== 'njuskalo.hr' || !sellerPath.test(url.pathname)) return null
  return `${njuskaloOrigin}${url.pathname.replace(/\/$/, '')}`
}
