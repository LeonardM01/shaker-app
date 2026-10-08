import { describe, expect, it } from 'vitest'

import { landingPage, redirectToLanding } from './landing-page'

describe('landingPage', () => {
  it('serves the landing page as HTML', async () => {
    const response = landingPage()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    const html = await response.text()
    expect(html).toContain('<title>Vrijedi.Ly · Je li ovaj oglas dobar?</title>')
    expect(html).toContain('Dodaj u Chrome')
  })

  it('links its icon from the site root, since the page now lives at /', async () => {
    const html = await landingPage().text()

    expect(html).toContain('<link rel="icon" href="/landing/icon.svg"')
  })
})

describe('redirectToLanding', () => {
  it('permanently redirects the old /landing address to /', () => {
    const response = redirectToLanding(new Request('https://shaker.test/landing/'))

    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://shaker.test/')
  })
})
