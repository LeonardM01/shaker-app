// Index oglasi URL shapes: listing pages are recognised in
// src/features/home/link-recognition.ts; this covers search and seller pages.

export const indexOrigin = 'https://www.index.hr'

/** Index's "Najrelevantniji" order, the one its own search box uses for text queries. */
const mostRelevant = 7

/**
 * The search results page for a free-text query. Index keeps the search in a
 * JSON `searchQuery` parameter that it URI-encodes before putting it in the
 * query string, so it ends up encoded twice; this mirrors its search box.
 */
export function indexSearchUrl(query: string): string {
  const url = new URL('/oglasi/pretraga', indexOrigin)
  url.searchParams.set('searchQuery', encodeURIComponent(JSON.stringify({ text: query.trim(), sortOption: mostRelevant })))
  return url.href
}

/** `/oglasi/<module>/<category>/oglas/<slug>/<code>`, with the Croatian module and category names. */
export function indexListingUrl(listing: { module: string; category: string; smartLink: string; code: number }): string {
  const path = [listing.module, listing.category, 'oglas', listing.smartLink, String(listing.code)]
  return `${indexOrigin}/oglasi/${path.map(encodeURIComponent).join('/')}`
}

/** A seller's public page, keyed by username. */
export function indexSellerUrl(username: string): string {
  return `${indexOrigin}/oglasi/korisnik/${encodeURIComponent(username)}`
}

/** Full-size photo URL for an image path from the API ("<user id>/<image id>.jpg"). */
export function indexPhotoUrl(path: string): string | null {
  return /^[\w-]+\/[\w-]+\.(?:jpe?g|png|webp)$/i.test(path) ? `${indexOrigin}/oglasi/api/image/direct/${path}` : null
}
