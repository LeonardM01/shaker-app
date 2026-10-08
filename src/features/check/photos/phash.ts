// Perceptual hash (pHash) for the duplicate-photo pattern (ADR 0007): a
// 32×32 grayscale DCT, the 8×8 lowest frequencies against their median.
// Survives resizing and recompression; a different photo flips about half the
// bits.

import sharp from 'sharp'

const size = 32
const lowSize = 8

/** At most this many differing bits still counts as the same photo. */
export const samePhotoMaxDistance = 10

const cosines = Array.from({ length: lowSize }, (_, u) =>
  Array.from({ length: size }, (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / (2 * size))),
)

function lowFrequencies(pixels: Uint8Array): number[] {
  const coefficients: number[] = []
  for (let u = 0; u < lowSize; u++) {
    for (let v = 0; v < lowSize; v++) {
      let sum = 0
      for (let y = 0; y < size; y++) {
        const rowCos = cosines[u]?.[y] ?? 0
        for (let x = 0; x < size; x++) {
          sum += (pixels[y * size + x] ?? 0) * rowCos * (cosines[v]?.[x] ?? 0)
        }
      }
      coefficients.push(sum)
    }
  }
  return coefficients
}

/** 64-bit pHash as 16 hex characters. */
export async function perceptualHash(image: Buffer): Promise<string> {
  const pixels = await sharp(image)
    .grayscale()
    .resize(size, size, { fit: 'fill' })
    .raw()
    .toBuffer()
  const coefficients = lowFrequencies(pixels)
  // The DC term is overall brightness, not structure: leave it out of the median.
  const sorted = coefficients.slice(1).sort((a, b) => a - b)
  const median = ((sorted[31] ?? 0) + (sorted[32] ?? 0)) / 2
  let bits = 0n
  for (const coefficient of coefficients) bits = (bits << 1n) | (coefficient > median ? 1n : 0n)
  return bits.toString(16).padStart(16, '0')
}

export function hammingDistance(a: string, b: string): number {
  let diff = BigInt(`0x${a}`) ^ BigInt(`0x${b}`)
  let count = 0
  while (diff > 0n) {
    count += Number(diff & 1n)
    diff >>= 1n
  }
  return count
}

export function isSamePhoto(a: string, b: string): boolean {
  return hammingDistance(a, b) <= samePhotoMaxDistance
}
