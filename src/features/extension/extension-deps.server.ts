import { createServerOnlyFn } from '@tanstack/react-start'

import { createPrismaCheckStore } from '#/features/check/prisma-check-store.server'
import type { ExtensionApiDeps } from '#/features/extension/extension-api'
import { createPrismaReportStore } from '#/features/report/prisma-report-store.server'
import { getDb } from '#/lib/db.server'
import { getExtensionEnv } from '#/lib/env.server'
import { signListingPhotoUrl } from '#/lib/storage.server'

/**
 * The production ports of the extension API, except starting a workflow:
 * only the check routes import the workflow file (see check.functions.ts).
 */
export const extensionApiDeps = createServerOnlyFn(
  (): Omit<ExtensionApiDeps, 'startWorkflow'> => ({
    reportStore: createPrismaReportStore(getDb()),
    checkStore: createPrismaCheckStore(getDb()),
    clock: () => new Date(),
    signPhotoUrl: signListingPhotoUrl,
    anonymousUserId: getExtensionEnv().EXTENSION_ANONYMOUS_USER_ID,
  }),
)
