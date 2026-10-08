import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createServerOnlyFn } from '@tanstack/react-start'

import { getServerEnv } from '#/lib/env.server'

/** Declared in neon.ts. `public_read`: anyone can read, only the server writes. */
export const ASSETS_BUCKET = 'assets'

/** Declared in neon.ts. `private`: served only through short-lived presigned URLs. */
const listingPhotosBucket = 'listing-photos'

const photoUrlTtlSeconds = 15 * 60

let client: S3Client | undefined

export const getStorage = createServerOnlyFn((): S3Client => {
  const env = getServerEnv()
  client ??= new S3Client({
    region: env.AWS_REGION,
    endpoint: env.AWS_ENDPOINT_URL_S3,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    // Neon Object Storage only supports path-style addressing.
    forcePathStyle: true,
  })
  return client
})

/** A short-lived read URL for a listing photo. Call only after the auth check. */
export const signListingPhotoUrl = createServerOnlyFn((photoKey: string) =>
  getSignedUrl(getStorage(), new GetObjectCommand({ Bucket: listingPhotosBucket, Key: photoKey }), {
    expiresIn: photoUrlTtlSeconds,
  }),
)
