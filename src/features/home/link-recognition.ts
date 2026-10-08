import type { Marketplace } from '#/lib/listing'

/** What a pasted string turned out to be. */
type LinkRecognition =
  | { kind: 'empty' }
  | { kind: 'recognised'; marketplace: Marketplace; canonicalUrl: string }
  /** Free text, or a supported site's page that isn't a listing. */
  | { kind: 'not_a_listing' }
  /** A valid URL on a site we don't read yet (Vinted included, for now). */
  | { kind: 'unsupported_site' }

type ListingPattern = {
  marketplace: Marketplace
  host: string
  /** Returns the canonical URL when `path` is a listing page. */
  match: (path: string) => string | null
}

const listingPatterns: ListingPattern[] = [
  {
    // njuskalo.hr/<category>/<slug>-oglas-<id>
    marketplace: 'njuskalo',
    host: 'njuskalo.hr',
    match: (path) =>
      /^\/(?:[^/]+\/)*[^/]*-oglas-\d+$/.test(path) ? `https://www.njuskalo.hr${path}` : null,
  },
  {
    // facebook.com/marketplace/item/<id>
    marketplace: 'facebook_marketplace',
    host: 'facebook.com',
    match: (path) => {
      const id = /^\/marketplace\/item\/(\d+)$/.exec(path)?.[1]
      return id ? `https://www.facebook.com/marketplace/item/${id}/` : null
    },
  },
  {
    // index.hr/oglasi/<category>/<subcategory>/oglas/<slug>/<id>
    marketplace: 'index_oglasi',
    host: 'index.hr',
    match: (path) =>
      /^\/oglasi\/(?:[^/]+\/)+oglas\/[^/]+\/\d+$/.test(path) ? `https://www.index.hr${path}` : null,
  },
]

/**
 * Classifies a pasted link. Tolerates a missing scheme, `www.`/`m.`
 * subdomains, trailing slashes and query strings; the canonical URL drops the
 * query, which on these sites only carries tracking parameters.
 */
export function recognizeListingLink(input: string): LinkRecognition {
  const text = input.trim()
  if (text === '') return { kind: 'empty' }

  const url = parseUrl(text)
  if (!url) return { kind: 'not_a_listing' }

  const host = url.hostname.toLowerCase().replace(/^(?:www|m)\./, '')
  const pattern = listingPatterns.find((candidate) => candidate.host === host)
  if (!pattern) return { kind: 'unsupported_site' }

  const path = url.pathname.replace(/\/+$/, '')
  const canonicalUrl = pattern.match(path)
  return canonicalUrl
    ? { kind: 'recognised', marketplace: pattern.marketplace, canonicalUrl }
    : { kind: 'not_a_listing' }
}

function parseUrl(text: string): URL | null {
  if (/\s/.test(text)) return null
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`
  try {
    const url = new URL(withScheme)
    // A host without a dot ("iphone") is a word, not a site.
    return url.hostname.includes('.') ? url : null
  } catch {
    return null
  }
}
