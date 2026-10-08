// TypeSafe Jev over HTTP (ADR 0005, https://docs.typesafe.ai/api, read
// 2026-10-08). Only Kvaliteta oglasa uses it: atomic questions over the
// extractor's English facts, never the Croatian listing text.

import { z } from 'zod'

import type { JevClient } from '#/features/check/check-ports'
import type { ListingFacts } from '#/features/check/listing-facts'
import type { JevAnswer, JevAnswers, QualityQuestion } from '#/features/check/scoring/listing-quality'

const endpoint = 'https://api.typesafe.ai/v1/systemone'
const model = 'jev-latest'
const timeoutMs = 15_000

type Question =
  | { type: 'score'; instructions: string; criteria: string[] }
  | { type: 'noul'; instructions: string; criteria: { true: string; false: string } }

/** The questions, in one place so they're easy to review and tune. */
export const qualityQuestionDefinitions: Record<QualityQuestion, Question> = {
  photos_show_condition: {
    type: 'score',
    instructions:
      'How well do the photos described in `listing.photos` show the actual condition of the item for sale?',
    criteria: [
      'No photos, or photos that show nothing useful about the item',
      'Stock or distant photos; the condition cannot be judged',
      'Some real photos of the item, but key parts or angles are missing',
      'Clear real photos of most relevant parts of the item',
      'Clear real photos of all relevant parts, including close-ups of any wear or defects',
    ],
  },
  description_complete: {
    type: 'score',
    instructions:
      'How completely does the listing tell a buyer of this `listing.category` what they need to know, judging from `listing.stated_specs` and `listing.missing_facts`?',
    criteria: [
      'Almost nothing a buyer needs is stated',
      'Basic identity only (what the item is); most important facts are missing',
      'Several important facts stated, several important ones missing',
      'Most important facts stated, one or two missing',
      'Everything a buyer of this category typically needs is stated',
    ],
  },
  defects_stated: {
    type: 'noul',
    instructions:
      'Does the seller state the condition of the item, including any wear or defects, in `listing.condition_notes`?',
    criteria: {
      true: 'The condition is stated, with wear or defects named or explicitly ruled out',
      false: 'The condition is not stated or only vaguely ("good condition")',
    },
  },
}

const scoreAnswer = z.object({ type: z.literal('score'), score: z.number(), confidence: z.number() })
const noulAnswer = z.object({ type: z.literal('noul'), noul: z.number() })
const responseSchema = z.object({
  answers: z.object({
    photos_show_condition: scoreAnswer,
    description_complete: scoreAnswer,
    defects_stated: noulAnswer,
  }),
})

function stateOf(facts: ListingFacts, photoCount: number) {
  return {
    listing: {
      category: facts.category,
      item: facts.searchKey,
      photo_count: photoCount,
      photos: facts.photos.map((photo) => ({ index: photo.index, shows: photo.description })),
      stated_specs: facts.statedSpecs.map((spec) => ({ [spec.key]: spec.value })),
      missing_facts: facts.missingFacts.map((fact) => fact.key),
      text_photo_contradictions: facts.contradictions.map((contradiction) => contradiction.key),
      condition_notes: facts.conditionNotes,
    },
  }
}

/** A Score's weighted level, scaled to 0–1. */
function scaleScore(answer: z.infer<typeof scoreAnswer>, levels: number): JevAnswer {
  return { value: answer.score / (levels - 1), confidence: answer.confidence }
}

/** A Noul has no confidence of its own; near 0.5 it means "can't tell". */
function noulOf(answer: z.infer<typeof noulAnswer>): JevAnswer {
  return { value: answer.noul, confidence: Math.round(Math.abs(answer.noul - 0.5) * 2 * 1000) / 1000 }
}

const levelCount = (question: QualityQuestion) => {
  const definition = qualityQuestionDefinitions[question]
  return definition.type === 'score' ? definition.criteria.length : 2
}

export function createJevClient({
  apiKey,
  fetch = globalThis.fetch,
}: {
  apiKey: string
  fetch?: (url: string, init: RequestInit) => Promise<Response>
}): JevClient {
  return {
    async answerQualityQuestions({ facts, photoCount }): Promise<JevAnswers> {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          state: stateOf(facts, photoCount),
          questions: qualityQuestionDefinitions,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) throw new Error(`Jev answered ${String(response.status)}`)
      const { answers } = responseSchema.parse(await response.json())
      return {
        photos_show_condition: scaleScore(answers.photos_show_condition, levelCount('photos_show_condition')),
        description_complete: scaleScore(answers.description_complete, levelCount('description_complete')),
        defects_stated: noulOf(answers.defects_stated),
      }
    },
  }
}
