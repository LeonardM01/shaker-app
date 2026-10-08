// Which titles count as comparables (ADR 0002): every search-key token
// present as a whole word, no excluded word present. The Postgres store runs
// the same rule as LIKE patterns over `normalizeTitle` output.

/**
 * Words that mark another model, an accessory, a swap or a parts listing.
 * Multi-word entries match as phrases.
 */
export const excludedWords = [
  'max',
  'plus',
  'mini',
  'ultra',
  'lite',
  'maska',
  'maskica',
  'futrola',
  'staklo',
  'folija',
  'punjac',
  'kabel',
  'kutija',
  'zamjena',
  'mijenjam',
  'menjam',
  'za dijelove',
  'neispravan',
  'trazim',
  'kupujem',
] as const

/**
 * Lowercase, diacritics folded, digits split from letters ("128GB" → "128 gb"),
 * punctuation to spaces, with one space on each side so `' tok '` matches whole
 * words in SQL `LIKE` and in `includes` alike.
 */
export function normalizeTitle(title: string): string {
  const words = title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/([a-z])(\d{3,})/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return ` ${words} `
}

export function searchKeyTokens(searchKey: string): string[] {
  return normalizeTitle(searchKey).trim().split(' ').filter(Boolean)
}

/** Excluded words that the search key doesn't itself contain. */
export function exclusionsFor(tokens: readonly string[]): string[] {
  const key = ` ${tokens.join(' ')} `
  return excludedWords.filter((word) => !key.includes(` ${word} `))
}

export function isComparableTitle(title: string, tokens: readonly string[]): boolean {
  const normalized = normalizeTitle(title)
  return (
    tokens.every((token) => normalized.includes(` ${token} `)) &&
    exclusionsFor(tokens).every((word) => !normalized.includes(` ${word} `))
  )
}

const storageUnits = new Set(['gb', 'tb'])

/**
 * The search key without its storage size ("128 gb"), for the widened match
 * (ADR 0002 step 4). Null when the key has no storage token to drop.
 */
export function widenSearchKey(tokens: readonly string[]): string[] | null {
  const unitIndex = tokens.findIndex(
    (token, index) => storageUnits.has(token) && /^\d+$/.test(tokens[index - 1] ?? ''),
  )
  if (unitIndex === -1) return null
  return tokens.filter((_, index) => index !== unitIndex && index !== unitIndex - 1)
}
