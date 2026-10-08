// Facebook Marketplace URL shapes: listing pages are recognised in
// src/features/home/link-recognition.ts; this covers search and seller pages.

const facebookOrigin = 'https://www.facebook.com'

/**
 * The logged-out search results page for a query. Facebook scopes search to a
 * location; Zagreb's page searched within 65 km of the city on 2026-10-08.
 */
export function facebookSearchUrl(query: string): string {
  const url = new URL('/marketplace/zagreb/search/', facebookOrigin)
  url.searchParams.set('query', query.trim())
  return url.href
}

export function facebookItemUrl(itemId: string): string {
  return `${facebookOrigin}/marketplace/item/${itemId}/`
}

/** The item ID of a `/marketplace/item/<id>/` URL, or null. */
export function facebookItemId(url: string): string | null {
  try {
    return /^\/marketplace\/item\/(\d+)\/?$/.exec(new URL(url).pathname)?.[1] ?? null
  } catch {
    return null
  }
}

/** A seller's Marketplace profile. Logged out, Facebook never shows it (see parse-seller-page.ts). */
export function facebookSellerUrl(sellerId: string): string | null {
  return /^\d+$/.test(sellerId) ? `${facebookOrigin}/marketplace/profile/${sellerId}/` : null
}
