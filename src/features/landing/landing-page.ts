import { redirect } from '@tanstack/react-router'

import landingHtml from './landing.html?raw'

// The landing page is a finished static page, not a React route: it is served
// as-is so it stays byte-for-byte what was designed. Without cache headers a
// server response skips the CDN, so cache it there like the static file it was;
// a new deployment starts with an empty cache.
export function serveLandingPage(): Response {
  return new Response(landingHtml, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}

// The landing page used to live at /landing; keep old links working.
export function redirectOldLandingUrl(request: Request): Response {
  return Response.redirect(new URL('/', request.url), 301)
}

// The landing page only exists on the server. A client-side navigation to it
// would render an empty page, so turn it into a full page load instead.
export function loadLandingPageFromServer(): never {
  throw redirect({ to: '/', reloadDocument: true })
}
