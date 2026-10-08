# 0007: Listing photos are copied into our bucket

- Status: accepted
- Date: 2026-10-08

## Context

The report, the watchlist, Gemini extraction and the duplicate-photo check all need a checked listing's photos. Facebook photo URLs are signed (`oh=`) with an expiry (`oe=`); one sampled on 2026-10-08 expired in about 16 days, so hotlinked Facebook photos would break in watchlists. Photos are other people's content and can show faces, licence plates and homes.

## Decision

- The "store photos" check step copies every photo of a checked listing, from every marketplace, into the private `listing-photos` bucket (declared in `neon.ts`).
- Store one resized copy (longest edge 1280 px, WebP); originals are not kept. Gemini reads this copy.
- Compute a perceptual hash (pHash) per photo and store it in Postgres. The same photo (small Hamming distance) on a different listing or seller is `duplicate_photo` risk evidence ("Fotografije se ne pojavljuju u drugim oglasima"). Only our own database is searched; web-wide reverse image search is out of scope.
- Comparable observations get no photos.
- Photos are deleted 90 days after the listing's last check unless someone tracks it. pHashes are kept longer.
- Browsers get photos only through short-lived presigned URLs.

## Consequences

- Storage grows with checks, bounded by the 90-day retention.
- One rule for all marketplaces, even where source URLs don't expire (Njuškalo, Index, unverified).
