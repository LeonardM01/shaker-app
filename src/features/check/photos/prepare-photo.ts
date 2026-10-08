import sharp from 'sharp'

import { perceptualHash } from '#/features/check/photos/phash'

/** ADR 0007: one resized copy, longest edge 1280 px; originals are not kept. */
const longestEdge = 1280

/** The copy we store and the pHash of it. Throws when the bytes aren't an image. */
export async function preparePhoto(original: Buffer): Promise<{ webp: Buffer; phash: string }> {
  const webp = await sharp(original)
    .rotate()
    .resize({ width: longestEdge, height: longestEdge, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
  return { webp, phash: await perceptualHash(webp) }
}
