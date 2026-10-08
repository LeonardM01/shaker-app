// The production MarketplaceReader (ADR 0003). Every read opens one logged-out
// Steel browser session (Croatian proxy, captcha solving), loads one page,
// hands it to that marketplace's deterministic parser, and releases the session.

import { chromium, errors } from 'playwright-core'
import type { Browser, Page } from 'playwright-core'
import Steel from 'steel-sdk'

import { recognizeListingLink } from '#/features/home/link-recognition'
import { parseFacebookListingPage } from '#/features/marketplaces/facebook-marketplace/parse-listing-page'
import { parseFacebookSearchPage } from '#/features/marketplaces/facebook-marketplace/parse-search-page'
import { parseFacebookSellerPage } from '#/features/marketplaces/facebook-marketplace/parse-seller-page'
import { facebookSearchUrl, facebookSellerUrl } from '#/features/marketplaces/facebook-marketplace/facebook-urls'
import { findResponse, indexApi, matches } from '#/features/marketplaces/index-oglasi/api-responses'
import type { CapturedResponse } from '#/features/marketplaces/index-oglasi/api-responses'
import { indexOrigin, indexSearchUrl } from '#/features/marketplaces/index-oglasi/index-urls'
import { parseIndexListingPage } from '#/features/marketplaces/index-oglasi/parse-listing-page'
import { parseIndexSearchPage } from '#/features/marketplaces/index-oglasi/parse-search-page'
import { parseIndexSellerPage } from '#/features/marketplaces/index-oglasi/parse-seller-page'
import { ReaderError } from '#/features/marketplaces/marketplace-reader'
import type { MarketplaceReader } from '#/features/marketplaces/marketplace-reader'
import { njuskaloSearchUrl, njuskaloSellerUrl } from '#/features/marketplaces/njuskalo/njuskalo-urls'
import { parseNjuskaloListingPage } from '#/features/marketplaces/njuskalo/parse-listing-page'
import { parseNjuskaloSearchPage } from '#/features/marketplaces/njuskalo/parse-search-page'
import { parseNjuskaloSellerPage } from '#/features/marketplaces/njuskalo/parse-seller-page'
import type { Marketplace } from '#/lib/listing'

/** A whole read: session start, page load, captcha, parse. */
const defaultTimeoutMs = 60_000
/** How long Steel's solver gets to clear Njuškalo's ShieldSquare challenge. */
const captchaTimeoutMs = 30_000
/** Extra wait for Index responses we use but can do without (seller name, rating). */
const optionalResponseWaitMs = 5_000

/** Njuškalo's bot protection (Radware ShieldSquare) redirects here. */
const captchaHosts = new Set(['validate.perfdrive.com'])

/** Images, fonts and video are never read; skipping them saves proxy bandwidth (ADR 0002). */
const blockedResourceTypes = new Set(['image', 'font', 'media'])

type IndexNeeds = { required: ((url: URL) => boolean)[]; optional: ((url: URL) => boolean)[] }

const indexNeeds = {
  listing: { required: [indexApi.singleAd], optional: [indexApi.user] },
  search: { required: [indexApi.adSearch, indexApi.categories], optional: [] },
  seller: { required: [indexApi.user], optional: [indexApi.userRating, indexApi.sellerAds] },
} satisfies Record<string, IndexNeeds>

type SteelMarketplaceReaderOptions = {
  apiKey: string
  /** Per read, from creating the session to the parsed result. */
  timeoutMs?: number
}

function isCaptchaUrl(url: string): boolean {
  try {
    return captchaHosts.has(new URL(url).hostname)
  } catch {
    return false
  }
}

/** Maps whatever a read threw to the port's error codes. */
function toReaderError(error: unknown): ReaderError {
  if (error instanceof ReaderError) return error
  if (error instanceof errors.TimeoutError) return new ReaderError('timeout', error.message, { cause: error })
  const message = error instanceof Error ? error.message : String(error)
  // Facebook answers logged-out profile visits with a redirect to the same URL, forever.
  if (message.includes('ERR_TOO_MANY_REDIRECTS')) {
    return new ReaderError('blocked', 'The marketplace redirected in a loop (login wall)', { cause: error })
  }
  return new ReaderError('session_failed', message, { cause: error })
}

/** Rejects with `timeout` once `ms` pass; the abandoned work is cleaned up by its session. */
async function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ReaderError('timeout', `Marketplace read took longer than ${String(ms)} ms`))
    }, ms)
  })
  try {
    return await Promise.race([work, deadline])
  } finally {
    clearTimeout(timer)
    // After a timeout the work fails once its browser closes; that failure is expected.
    void work.catch(() => undefined)
  }
}

async function passCaptcha(page: Page): Promise<void> {
  if (!isCaptchaUrl(page.url())) return
  try {
    await page.waitForURL((url) => !isCaptchaUrl(url.href), { timeout: captchaTimeoutMs, waitUntil: 'domcontentloaded' })
  } catch (error) {
    throw new ReaderError('blocked', 'The captcha did not clear', { cause: error })
  }
}

/** Server-rendered pages (Njuškalo, Facebook): the data is in the HTML once it's parsed. */
async function loadHtml(page: Page, url: string): Promise<string> {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await passCaptcha(page)
  return page.content()
}

/** Index oglasi renders client-side: collect the API responses its page fetches. */
async function loadIndexResponses(page: Page, url: string, needs: IndexNeeds): Promise<CapturedResponse[]> {
  const captured: CapturedResponse[] = []
  const matchers = Object.values(indexApi)
  page.on('response', (response) => {
    const meta = { url: response.url(), status: response.status(), body: '' }
    if (!matchers.some((matcher) => matches(meta, matcher))) return
    void response.text().then(
      (body) => captured.push({ ...meta, body }),
      // The body can vanish when the page navigates on; that response is simply missing.
      () => undefined,
    )
  })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  const has = (matcher: (url: URL) => boolean) => findResponse(captured, matcher) !== undefined
  // The overall deadline bounds this loop.
  while (!needs.required.every(has)) await page.waitForTimeout(200)
  const failed = needs.required.some((matcher) => findResponse(captured, matcher)?.status !== 200)
  const optionalUntil = Date.now() + optionalResponseWaitMs
  while (!failed && !needs.optional.every(has) && Date.now() < optionalUntil) await page.waitForTimeout(200)
  return [...captured]
}

/** Only seller pages on the marketplace itself are ever opened. */
function indexSellerPageUrl(profileUrl: string | null): string | null {
  if (!profileUrl) return null
  try {
    const url = new URL(profileUrl)
    return url.origin === indexOrigin && /^\/oglasi\/korisnik\/[^/]+$/.test(url.pathname) ? url.href : null
  } catch {
    return null
  }
}

export function createSteelMarketplaceReader({
  apiKey,
  timeoutMs = defaultTimeoutMs,
}: SteelMarketplaceReaderOptions): MarketplaceReader {
  const steel = new Steel({ steelAPIKey: apiKey, maxRetries: 1, timeout: 20_000 })

  /** One session per read, always released. */
  async function inSession<T>(work: (page: Page) => Promise<T>): Promise<T> {
    let sessionId = undefined as string | undefined
    let browser = undefined as Browser | undefined
    let finished = false
    const release = async () => {
      await browser?.close().catch(() => undefined)
      // A failed release only means Steel ends the session at its timeout instead.
      if (sessionId) await steel.sessions.release(sessionId).catch(() => undefined)
    }
    const read = async () => {
      const session = await steel.sessions.create({
        useProxy: { geolocation: { country: 'HR' } },
        solveCaptcha: true,
        blockAds: true,
        // Steel ends the session itself if we never get to release it.
        timeout: timeoutMs + 30_000,
      })
      sessionId = session.id
      browser = await chromium.connectOverCDP(`${session.websocketUrl}&apiKey=${apiKey}`, { timeout: 20_000 })
      if (finished) {
        // The read timed out while the session was starting; nobody else will release it.
        await release()
        throw new ReaderError('timeout', 'Steel session started after the read timed out')
      }
      const context = browser.contexts()[0] ?? (await browser.newContext())
      const page = context.pages()[0] ?? (await context.newPage())
      await page.route('**/*', (route) =>
        blockedResourceTypes.has(route.request().resourceType()) ? route.abort() : route.continue(),
      )
      return work(page)
    }
    try {
      return await withDeadline(read(), timeoutMs)
    } catch (error) {
      throw toReaderError(error)
    } finally {
      finished = true
      await release()
    }
  }

  return {
    readListing(marketplace, canonicalUrl) {
      const link = recognizeListingLink(canonicalUrl)
      if (link.kind !== 'recognised' || link.marketplace !== marketplace) {
        return Promise.reject(new ReaderError('parse_failed', `${canonicalUrl} is not a ${marketplace} listing URL`))
      }
      return inSession(async (page) => {
        switch (marketplace) {
          case 'njuskalo':
            return parseNjuskaloListingPage(await loadHtml(page, link.canonicalUrl))
          case 'facebook_marketplace':
            return parseFacebookListingPage(await loadHtml(page, link.canonicalUrl), link.canonicalUrl)
          case 'index_oglasi':
            return parseIndexListingPage(await loadIndexResponses(page, link.canonicalUrl, indexNeeds.listing))
        }
      })
    },

    search(marketplace, query) {
      return inSession(async (page) => {
        switch (marketplace) {
          case 'njuskalo':
            return parseNjuskaloSearchPage(await loadHtml(page, njuskaloSearchUrl(query)))
          case 'facebook_marketplace':
            return parseFacebookSearchPage(await loadHtml(page, facebookSearchUrl(query)))
          case 'index_oglasi':
            return parseIndexSearchPage(await loadIndexResponses(page, indexSearchUrl(query), indexNeeds.search))
        }
      })
    },

    readSeller(marketplace: Marketplace, seller) {
      const url = sellerPageUrl(marketplace, seller)
      // No profile page we may open: nothing to read, not a failure.
      if (!url) return Promise.resolve(null)
      return inSession(async (page) => {
        switch (marketplace) {
          case 'njuskalo':
            return parseNjuskaloSellerPage(await loadHtml(page, url))
          case 'facebook_marketplace':
            return parseFacebookSellerPage(await loadHtml(page, url))
          case 'index_oglasi':
            return parseIndexSellerPage(await loadIndexResponses(page, url, indexNeeds.seller))
        }
      })
    },
  }
}

function sellerPageUrl(marketplace: Marketplace, seller: { externalId: string; profileUrl: string | null }) {
  switch (marketplace) {
    case 'njuskalo':
      return seller.profileUrl ? njuskaloSellerUrl(seller.profileUrl) : null
    case 'facebook_marketplace':
      return facebookSellerUrl(seller.externalId)
    case 'index_oglasi':
      return indexSellerPageUrl(seller.profileUrl)
  }
}
