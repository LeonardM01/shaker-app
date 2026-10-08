import { describe, expect, it } from 'vitest'

import { redirectOldLandingUrl, serveLandingPage } from './landing-page'

describe('serveLandingPage', () => {
  it('serves the landing page as HTML', async () => {
    const response = serveLandingPage()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    const html = await response.text()
    expect(html).toContain('<title>Vrijedi.Ly · Je li ovaj oglas dobar?</title>')
    expect(html).toContain('Dodaj u Chrome')
  })

  it('lets the CDN cache the page, as it did when it was a static file', () => {
    expect(serveLandingPage().headers.get('cache-control')).toContain('s-maxage=')
  })

  it('links its icon from the site root, since the page now lives at /', async () => {
    const html = await serveLandingPage().text()

    expect(html).toContain('<link rel="icon" href="/landing/icon.svg"')
  })

  it('sends visitors to the app on the same origin, not a fixed deployment', async () => {
    const html = await serveLandingPage().text()

    expect(html).toContain('href="/app"')
    expect(html).not.toContain('vercel.app')
  })
})

describe('redirectOldLandingUrl', () => {
  it('permanently redirects the old /landing address to /', () => {
    const response = redirectOldLandingUrl(new Request('https://vrijedi.test/landing/'))

    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://vrijedi.test/')
  })
})
