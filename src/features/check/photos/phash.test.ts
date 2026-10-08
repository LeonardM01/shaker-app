// @vitest-environment node
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { hammingDistance, isSamePhoto, perceptualHash } from '#/features/check/photos/phash'

/** A synthetic "photo": diagonal bands with a bright square, so it has structure. */
function pattern(width: number, height: number, invert = false) {
  const pixels = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const band = Math.floor(((x + y) / (width + height)) * 8) % 2 === 0 ? 40 : 200
      const square = x > width * 0.6 && y < height * 0.3 ? 255 : band
      const value = invert ? 255 - square : square
      pixels.fill(value, (y * width + x) * 3, (y * width + x) * 3 + 3)
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } })
}

describe('perceptualHash', () => {
  it('is a 16-character hex string', async () => {
    const hash = await perceptualHash(await pattern(400, 300).png().toBuffer())
    expect(hash).toMatch(/^[0-9a-f]{16}$/)
  })

  it('treats a resized, recompressed copy as the same photo', async () => {
    const original = await perceptualHash(await pattern(1200, 900).png().toBuffer())
    const copy = await perceptualHash(await pattern(1200, 900).resize(500).jpeg({ quality: 40 }).toBuffer())
    expect(isSamePhoto(original, copy)).toBe(true)
  })

  it('tells different photos apart', async () => {
    const one = await perceptualHash(await pattern(800, 600).png().toBuffer())
    const other = await perceptualHash(await pattern(800, 600, true).png().toBuffer())
    expect(isSamePhoto(one, other)).toBe(false)
  })
})

describe('hammingDistance', () => {
  it('counts differing bits', () => {
    expect(hammingDistance('0000000000000000', '000000000000000f')).toBe(4)
    expect(hammingDistance('ffffffffffffffff', 'ffffffffffffffff')).toBe(0)
  })
})
