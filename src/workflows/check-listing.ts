// A check as a durable Vercel Workflow (ADR 0006). This file only maps each
// stage to a durable step; the order lives in `orchestrateCheck` and the work
// in check-stages.ts, both tested in process through `runCheck`.

import { checkDeps } from '#/features/check/check-deps.server'
import { createCheckStages } from '#/features/check/check-stages'
import type { CheckStages } from '#/features/check/check-stages'
import { orchestrateCheck } from '#/features/check/run-check'
import type { Marketplace } from '#/lib/listing'

const stages = () => createCheckStages(checkDeps())

async function read(...args: Parameters<CheckStages['read']>) {
  'use step'
  return stages().read(...args)
}

async function photos(...args: Parameters<CheckStages['photos']>) {
  'use step'
  return stages().photos(...args)
}

async function extract(...args: Parameters<CheckStages['extract']>) {
  'use step'
  return stages().extract(...args)
}

async function comparables(...args: Parameters<CheckStages['comparables']>) {
  'use step'
  return stages().comparables(...args)
}

async function seller(...args: Parameters<CheckStages['seller']>) {
  'use step'
  return stages().seller(...args)
}

async function finalizeComparables(...args: Parameters<CheckStages['finalizeComparables']>) {
  'use step'
  return stages().finalizeComparables(...args)
}

async function scam(...args: Parameters<CheckStages['scam']>) {
  'use step'
  return stages().scam(...args)
}

async function score(...args: Parameters<CheckStages['score']>) {
  'use step'
  return stages().score(...args)
}

async function write(...args: Parameters<CheckStages['write']>) {
  'use step'
  return stages().write(...args)
}

async function finish(...args: Parameters<CheckStages['finish']>) {
  'use step'
  return stages().finish(...args)
}

/** Runs a check that `startCheck` created. Survives the user closing the tab. */
export async function checkListing(check: {
  checkId: string
  marketplace: Marketplace
  canonicalUrl: string
}) {
  'use workflow'
  await orchestrateCheck(
    { read, photos, extract, comparables, seller, finalizeComparables, scam, score, write, finish },
    check,
  )
}
