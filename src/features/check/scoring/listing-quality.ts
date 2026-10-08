// Kvaliteta oglasa (ADR 0005): Jev's answers to atomic questions plus the
// extractor's facts, combined by a weighted formula. Parts Jev wasn't
// confident about are dropped and shown as unknown, never guessed.

import type { ListingFacts } from '#/features/check/listing-facts'

/** The atomic questions Jev answers about a listing's English facts. */
export const qualityQuestions = [
  'photos_show_condition',
  'description_complete',
  'defects_stated',
] as const
export type QualityQuestion = (typeof qualityQuestions)[number]

/** One Jev answer scaled to 0–1 (a Score level or a Noul probability). */
export type JevAnswer = { value: number; confidence: number }
export type JevAnswers = Partial<Record<QualityQuestion, JevAnswer>>

export type QualityLevel = 'good' | 'fair' | 'poor' | 'unknown'

export type ListingQuality =
  | { kind: 'no_data' }
  | {
      kind: 'score'
      /** 0–100. */
      value: number
      photos: QualityLevel
      description: QualityLevel
      defects: 'stated' | 'not_stated' | 'unknown'
      missingCount: number
      contradictionCount: number
    }

/** Initial weights; tuned during the model eval (ADR 0004). */
export const listingQualityRules = {
  minJevConfidence: 0.6,
  weights: {
    photos: 0.3,
    description: 0.3,
    defects: 0.1,
    missing: 0.15,
    contradictions: 0.15,
  },
  pointsPerMissingFact: 20,
  pointsPerContradiction: 50,
}

function levelOf(points: number | null): QualityLevel {
  if (points === null) return 'unknown'
  if (points >= 70) return 'good'
  if (points >= 40) return 'fair'
  return 'poor'
}

export function listingQuality({
  facts,
  photoCount,
  jev,
}: {
  facts: ListingFacts | null
  photoCount: number
  jev: JevAnswers
}): ListingQuality {
  if (!facts) return { kind: 'no_data' }
  const { weights, minJevConfidence } = listingQualityRules
  const confident = (question: QualityQuestion) => {
    const answer = jev[question]
    return answer && answer.confidence >= minJevConfidence ? answer.value * 100 : null
  }

  const photos = photoCount === 0 ? 0 : confident('photos_show_condition')
  const description = confident('description_complete')
  const defects = confident('defects_stated')
  const missingCount = facts.missingFacts.length
  const contradictionCount = facts.contradictions.length
  const parts: [points: number | null, weight: number][] = [
    [photos, weights.photos],
    [description, weights.description],
    [defects, weights.defects],
    [
      Math.max(0, 100 - missingCount * listingQualityRules.pointsPerMissingFact),
      weights.missing,
    ],
    [
      Math.max(0, 100 - contradictionCount * listingQualityRules.pointsPerContradiction),
      weights.contradictions,
    ],
  ]

  let total = 0
  let knownWeight = 0
  for (const [points, weight] of parts) {
    if (points === null) continue
    total += points * weight
    knownWeight += weight
  }

  return {
    kind: 'score',
    value: Math.round(total / knownWeight),
    photos: levelOf(photos),
    description: levelOf(description),
    defects: defects === null ? 'unknown' : defects >= 50 ? 'stated' : 'not_stated',
    missingCount,
    contradictionCount,
  }
}
