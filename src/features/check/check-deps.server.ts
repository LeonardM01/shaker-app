import { createServerOnlyFn } from '@tanstack/react-start'

import { createGeminiExtractor, createGeminiModel, createGeminiWriter } from '#/features/check/adapters/gemini'
import { createJevClient } from '#/features/check/adapters/jev-client'
import type { CheckDeps } from '#/features/check/check-ports'
import { createS3PhotoStore } from '#/features/check/photos/s3-photo-store.server'
import { createPrismaCheckStore } from '#/features/check/prisma-check-store.server'
import { createSteelMarketplaceReader } from '#/features/marketplaces/steel-marketplace-reader.server'
import { getDb } from '#/lib/db.server'
import { getPipelineEnv } from '#/lib/env.server'
import { getStorage } from '#/lib/storage.server'

/** The production ports of a check. */
export const checkDeps = createServerOnlyFn((): CheckDeps => {
  const env = getPipelineEnv()
  const model = createGeminiModel(env.GOOGLE_AI_API_KEY)
  return {
    reader: createSteelMarketplaceReader({ apiKey: env.STEEL_API_KEY }),
    photos: createS3PhotoStore(getStorage()),
    extractor: createGeminiExtractor(model),
    jev: createJevClient({ apiKey: env.JEV_API_KEY }),
    writer: createGeminiWriter(model),
    store: createPrismaCheckStore(getDb()),
    clock: () => new Date(),
  }
})

/** Only what starting or reusing a check needs, without pipeline credentials. */
export const checkStartDeps = createServerOnlyFn(
  (): Pick<CheckDeps, 'store' | 'clock'> => ({
    store: createPrismaCheckStore(getDb()),
    clock: () => new Date(),
  }),
)
