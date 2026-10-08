import landingHtml from './landing.html?raw'

// The landing page is a finished static page, not a React route: it is served
// as-is so it stays byte-for-byte what was designed.
export function landingPage(): Response {
  return new Response(landingHtml, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

// The landing page used to live at /landing; keep old links working.
export function redirectToLanding(request: Request): Response {
  return Response.redirect(new URL('/', request.url), 301)
}
