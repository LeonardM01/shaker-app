// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { parseFacebookSellerPage } from '#/features/marketplaces/facebook-marketplace/parse-seller-page'

// Facebook's login page, where logged-out profile visits end up (saved 2026-10-08).
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

describe('parseFacebookSellerPage', () => {
  it('reports the login wall as blocked', () => {
    expect(() => parseFacebookSellerPage(fixture('login-wall.html'))).toThrow(
      expect.objectContaining({ name: 'ReaderError', code: 'blocked' }),
    )
  })

  it('fails with parse_failed on any other page', () => {
    expect(() => parseFacebookSellerPage('<html><body>Nešto</body></html>')).toThrow(
      expect.objectContaining({ name: 'ReaderError', code: 'parse_failed' }),
    )
    expect(() => parseFacebookSellerPage(fixture('listing-page.html'))).toThrow(
      expect.objectContaining({ code: 'parse_failed' }),
    )
  })
})
