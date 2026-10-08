import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import type { S3Client } from '@aws-sdk/client-s3'

import type { PhotoStore } from '#/features/check/check-ports'
import type { StoredPhoto } from '#/features/check/check-store'
import { preparePhoto } from '#/features/check/photos/prepare-photo'
import { LISTING_PHOTOS_BUCKET } from '#/lib/storage.server'

const downloadTimeoutMs = 15_000
const maxPhotoBytes = 15 * 1024 * 1024
/** Photos copied at the same time; marketplace CDNs don't like bursts. */
const concurrency = 4

/** Keys are built here from our own listing ID, never from scraped input. */
export const photoObjectKey = (listingId: string, position: number) =>
  `${listingId}/${String(position)}.webp`

async function download(url: string): Promise<Buffer> {
  // Photo CDN files, not marketplace pages: plain HTTP, no browser session.
  const response = await fetch(url, { signal: AbortSignal.timeout(downloadTimeoutMs) })
  if (!response.ok) throw new Error(`Photo download answered ${String(response.status)}`)
  const type = response.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) throw new Error(`Photo download returned ${type}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.byteLength > maxPhotoBytes) throw new Error('Photo too large')
  return bytes
}

async function inBatches<T, R>(items: readonly T[], size: number, work: (item: T, index: number) => Promise<R>) {
  const results: R[] = []
  for (let start = 0; start < items.length; start += size) {
    results.push(...(await Promise.all(items.slice(start, start + size).map((item, offset) => work(item, start + offset)))))
  }
  return results
}

/** ADR 0007: every photo copied into the private bucket as one WebP, with its pHash. */
export function createS3PhotoStore(storage: S3Client): PhotoStore {
  return {
    copyPhotos: (listingId, photoUrls) =>
      inBatches(photoUrls, concurrency, async (url, position): Promise<StoredPhoto> => {
        const { webp, phash } = await preparePhoto(await download(url))
        const objectKey = photoObjectKey(listingId, position)
        await storage.send(
          new PutObjectCommand({
            Bucket: LISTING_PHOTOS_BUCKET,
            Key: objectKey,
            Body: webp,
            ContentType: 'image/webp',
          }),
        )
        return { position, objectKey, phash }
      }),

    readPhotos: (objectKeys) =>
      inBatches(objectKeys, concurrency, async (key) => {
        const object = await storage.send(new GetObjectCommand({ Bucket: LISTING_PHOTOS_BUCKET, Key: key }))
        if (!object.Body) throw new Error(`Photo ${key} has no body`)
        return object.Body.transformToByteArray()
      }),

    async deletePhotos(objectKeys) {
      // At most 1000 keys per S3 request.
      for (let start = 0; start < objectKeys.length; start += 1000) {
        await storage.send(
          new DeleteObjectsCommand({
            Bucket: LISTING_PHOTOS_BUCKET,
            Delete: { Objects: objectKeys.slice(start, start + 1000).map((Key) => ({ Key })), Quiet: true },
          }),
        )
      }
    },
  }
}
