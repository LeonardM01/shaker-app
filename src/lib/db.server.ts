import { PrismaNeon } from '@prisma/adapter-neon'
import { createServerOnlyFn } from '@tanstack/react-start'

import { PrismaClient } from '#/generated/prisma/client'
import { getServerEnv } from '#/lib/env.server'

let prisma: PrismaClient | undefined

export const getDb = createServerOnlyFn((): PrismaClient => {
  prisma ??= new PrismaClient({
    adapter: new PrismaNeon({ connectionString: getServerEnv().DATABASE_URL }),
  })
  return prisma
})
