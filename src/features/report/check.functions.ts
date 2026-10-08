import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { start } from 'workflow/api'
import { z } from 'zod'

import { checkStartDeps } from '#/features/check/check-deps.server'
import { startCheck } from '#/features/check/run-check'
import { loadCheckProgress } from '#/features/report/load-report'
import { createPrismaReportStore } from '#/features/report/prisma-report-store.server'
import type { CheckProgress } from '#/features/report/report-result'
import { getDb } from '#/lib/db.server'
import { signListingPhotoUrl } from '#/lib/storage.server'
import { checkListing } from '#/workflows/check-listing'

// Kept apart from report.functions.ts on purpose: a module that imports the
// workflow file goes through the Workflow plugin's transform, and the auth
// adapter's request helpers stop resolving there. Nothing here reads a session.

const progressDeps = () => ({ store: createPrismaReportStore(getDb()), signPhotoUrl: signListingPhotoUrl })

export type StartedCheckResult =
  | { kind: 'running'; checkId: string }
  /** A finished check from the last 6 hours: go straight to its report. */
  | { kind: 'report'; listingId: string }

/** "Provjeri": reuses a check from the last 6 hours, or starts a durable one. Guests may check. */
export const startCheckFn = createServerFn({ method: 'POST' })
  .validator(z.object({ url: z.string().max(2048), force: z.boolean().default(false) }))
  .handler(async ({ data }): Promise<StartedCheckResult> => {
    const deps = checkStartDeps()
    const started = await startCheck(deps, data.url, { force: data.force })
    if (started.reused) {
      const progress = await loadCheckProgress(progressDeps(), started.checkId)
      if (progress?.status === 'completed' && progress.listing) {
        return { kind: 'report', listingId: progress.listing.listingId }
      }
      return { kind: 'running', checkId: started.checkId }
    }
    try {
      const { checkId, marketplace, canonicalUrl } = started
      await start(checkListing, [{ checkId, marketplace, canonicalUrl }])
    } catch (error) {
      // A check that never started must not block reuse for 6 hours.
      await deps.store.finishCheck(started.checkId, 'failed', deps.clock())
      console.error('[check] workflow failed to start', { url: data.url, checkId: started.checkId, error })
      throw error
    }
    return { kind: 'running', checkId: started.checkId }
  })

/** "Provjera u tijeku": public, since checks are shared and carry no user data. */
export const getCheckProgress = createServerFn({ method: 'GET' })
  .validator(z.object({ checkId: z.uuid() }))
  .handler(async ({ data }): Promise<CheckProgress | null> => loadCheckProgress(progressDeps(), data.checkId))

export const checkProgressQueryOptions = (checkId: string) =>
  queryOptions({
    queryKey: ['check', checkId],
    queryFn: () => getCheckProgress({ data: { checkId } }),
    // Every step shows as soon as it's done; poll while the check runs.
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 1500 : false),
  })

