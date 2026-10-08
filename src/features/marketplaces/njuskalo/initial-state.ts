import type { HTMLElement } from 'node-html-parser'

import { jsonObjectAt, parseFailed } from '#/features/marketplaces/parsing'

const marker = 'window.__INITIAL_STATE__='

/**
 * The Nuxt state Njuškalo embeds in listing and search pages. Read from the
 * `<script>` element itself, so text a seller typed into the page can't pose as it.
 */
export function readInitialState(root: HTMLElement): unknown {
  for (const script of root.querySelectorAll('script')) {
    const source = script.rawText.trimStart()
    if (!source.startsWith(marker)) continue
    const state = jsonObjectAt(source, marker.length)
    if (state === null) parseFailed('Njuškalo initial state is not valid JSON')
    return state
  }
  return parseFailed('Njuškalo page has no initial state')
}
