// @vitest-environment node
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { preparePhoto } from '#/features/check/photos/prepare-photo'

const image = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#7a9' } }).jpeg().toBuffer()

describe('preparePhoto', () => {
  it('stores one WebP with the longest edge at 1280 px, and its pHash', async () => {
    const { webp, phash } = await preparePhoto(await image(4000, 3000))

    const meta = await sharp(webp).metadata()
    expect(meta.format).toBe('webp')
    expect([meta.width, meta.height]).toEqual([1280, 960])
    expect(phash).toMatch(/^[0-9a-f]{16}$/)
  })

  it('never enlarges a small photo', async () => {
    const { webp } = await preparePhoto(await image(600, 800))

    const meta = await sharp(webp).metadata()
    expect([meta.width, meta.height]).toEqual([600, 800])
  })

  it('rejects bytes that are not an image', async () => {
    await expect(preparePhoto(Buffer.from('<html>captcha</html>'))).rejects.toThrow()
  })
})
