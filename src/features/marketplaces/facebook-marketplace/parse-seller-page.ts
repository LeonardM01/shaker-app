import { readFacebookPage } from '#/features/marketplaces/facebook-marketplace/embedded-json'
import { ReaderError } from '#/features/marketplaces/marketplace-reader'
import type { SellerProfile } from '#/features/marketplaces/marketplace-reader'
import { parseFailed } from '#/features/marketplaces/parsing'

/**
 * Facebook Marketplace seller profiles (`/marketplace/profile/<id>/`) can't be
 * read logged out: on 2026-10-08 Facebook redirected them to themselves until
 * the browser gave up, and item pages don't name the seller at all. A login
 * wall is `blocked`; anything else is a page we have never seen, so it's
 * `parse_failed` rather than a guess.
 */
export function parseFacebookSellerPage(html: string): SellerProfile | null {
  if (readFacebookPage(html).isLoginWall) {
    throw new ReaderError('blocked', 'Facebook requires login to show a seller profile')
  }
  return parseFailed('Facebook seller page has no profile data we know how to read')
}
