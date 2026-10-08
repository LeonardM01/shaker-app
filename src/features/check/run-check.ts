// A check end to end (ADR 0006). `startCheck` reuses a recent check or
// creates one; `orchestrateCheck` runs the stages in order. In production the
// Workflow wrapper (src/workflows/check-listing.ts) runs the same orchestration with each
// stage as a durable step; tests and scripts call `runCheck` in process.

import { createCheckStages } from '#/features/check/check-stages'
import type { CheckStages, MarketplaceComparables } from '#/features/check/check-stages'
import type { CheckDeps } from '#/features/check/check-ports'
import type { CheckStore } from '#/features/check/check-store'
import { recognizeListingLink } from '#/features/home/link-recognition'
import type { Marketplace } from '#/lib/listing'

/** A check of the same listing this recent is reused unless forced. */
export const checkReuseMs = 6 * 60 * 60 * 1000

/** A check still running after this long is presumed stuck and not waited on. */
export const runningCheckReuseMs = 10 * 60 * 1000

/**
 * Even a forced check ("Provjeri ponovo", the daily re-check) reuses one this
 * fresh, so repeated clicks can't run up scraping and model costs.
 */
export const forcedRefreshFloorMs = 10 * 60 * 1000

export type StartedCheck = { checkId: string; reused: boolean }

/** The stage functions the orchestration needs, in process or as durable steps. */
export type OrchestrationStages = {
  [K in keyof CheckStages]: (...args: Parameters<CheckStages[K]>) => ReturnType<CheckStages[K]>
}

export async function startCheck(
  deps: { store: Pick<CheckStore, 'findReusableCheck' | 'createCheck'>; clock: () => Date },
  canonicalUrl: string,
  options: { force?: boolean } = {},
): Promise<StartedCheck & { marketplace: Marketplace; canonicalUrl: string }> {
  const recognition = recognizeListingLink(canonicalUrl)
  if (recognition.kind !== 'recognised') throw new Error(`Not a listing link: ${canonicalUrl}`)
  const { marketplace, canonicalUrl: url } = recognition
  const now = deps.clock()
  // Forcing only shortens how old a finished check may be; it still joins one
  // that is running.
  const reusable = await deps.store.findReusableCheck(url, {
    completed: new Date(now.getTime() - (options.force ? forcedRefreshFloorMs : checkReuseMs)),
    running: new Date(now.getTime() - runningCheckReuseMs),
  })
  if (reusable) return { checkId: reusable, reused: true, marketplace, canonicalUrl: url }
  const checkId = await deps.store.createCheck({
    canonicalUrl: url,
    marketplace,
    startedAt: now,
  })
  return { checkId, reused: false, marketplace, canonicalUrl: url }
}

/**
 * The order of a check. Plain glue between stages, with no I/O of its own,
 * so it can run inside a durable workflow.
 */
export async function orchestrateCheck(
  stages: OrchestrationStages,
  check: { checkId: string; marketplace: Marketplace; canonicalUrl: string },
): Promise<void> {
  const { checkId, marketplace } = check
  const read = await stages.read(checkId, marketplace, check.canonicalUrl)
  if (read.kind !== 'found') return
  const { listing } = read

  const photos = await stages.photos(checkId, listing)
  const facts = await stages.extract(checkId, listing, photos)

  const [njuskalo, facebook, index] = await Promise.all([
    stages.comparables(checkId, 'njuskalo', listing, facts),
    stages.comparables(checkId, 'facebook_marketplace', listing, facts),
    stages.comparables(checkId, 'index_oglasi', listing, facts),
    stages.seller(checkId, marketplace, listing),
  ])
  const found: MarketplaceComparables = {
    njuskalo,
    facebook_marketplace: facebook,
    index_oglasi: index,
  }
  const snapshot = await stages.finalizeComparables(checkId, listing, facts, found)
  const scam = await stages.scam(checkId, listing, photos, facts, snapshot)
  const outcome = await stages.score(checkId, {
    listing,
    photoCount: photos?.length ?? listing.photoUrls.length,
    facts,
    snapshot,
    scam,
  })
  await stages.write(checkId, facts, outcome)
  await stages.finish(checkId, outcome)
}

/** Starts (or reuses) a check and runs it to the end in this process. */
export async function runCheck(
  deps: CheckDeps,
  canonicalUrl: string,
  options: { force?: boolean } = {},
): Promise<StartedCheck> {
  const started = await startCheck(deps, canonicalUrl, options)
  if (started.reused) return { checkId: started.checkId, reused: true }
  await orchestrateCheck(createCheckStages(deps), started)
  return { checkId: started.checkId, reused: false }
}
