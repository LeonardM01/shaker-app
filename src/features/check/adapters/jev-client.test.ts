// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { createJevClient } from '#/features/check/adapters/jev-client'
import { phoneFacts } from '#/features/check/testing/fake-ports'

type Sent = { url: string; init: RequestInit }

function fakeFetch(status: number, body: unknown) {
  const sent: Sent[] = []
  const fetch = (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), init: init ?? {} })
    return Promise.resolve(new Response(JSON.stringify(body), { status }))
  }
  return { fetch, sent }
}

const answers = {
  model: 'jev-1.13.0',
  answers: {
    photos_show_condition: { type: 'score', score: 3, legend: {}, probabilities: {}, confidence: 0.82 },
    description_complete: { type: 'score', score: 2, legend: {}, probabilities: {}, confidence: 0.4 },
    defects_stated: { type: 'noul', noul: 0.9 },
  },
  usage: { input_tokens: 400, output_tokens: 30 },
}

describe('createJevClient', () => {
  it("asks the quality questions over the extractor's facts with the API key", async () => {
    const { fetch, sent } = fakeFetch(200, answers)
    const jev = createJevClient({ apiKey: 'test-key', fetch })

    await jev.answerQualityQuestions({ facts: phoneFacts(), photoCount: 6 })

    const [request] = sent
    expect(request?.url).toBe('https://api.typesafe.ai/v1/systemone')
    expect(new Headers(request?.init.headers).get('authorization')).toBe('Bearer test-key')
    const body = JSON.parse(String(request?.init.body)) as {
      model: string
      state: { listing: { photo_count: number; missing_facts: string[] } }
      questions: Record<string, { type: string }>
    }
    expect(body.model).toBe('jev-latest')
    expect(body.state.listing).toMatchObject({ photo_count: 6, missing_facts: ['receipt_or_warranty'] })
    expect(Object.keys(body.questions)).toEqual([
      'photos_show_condition',
      'description_complete',
      'defects_stated',
    ])
  })

  it('scales Score levels to 0–1 and gives a Noul the confidence of its distance from 0.5', async () => {
    const jev = createJevClient({ apiKey: 'k', fetch: fakeFetch(200, answers).fetch })

    const result = await jev.answerQualityQuestions({ facts: phoneFacts(), photoCount: 6 })

    // Five levels: score 3 of 0–4 is 0.75.
    expect(result).toEqual({
      photos_show_condition: { value: 0.75, confidence: 0.82 },
      description_complete: { value: 0.5, confidence: 0.4 },
      defects_stated: { value: 0.9, confidence: 0.8 },
    })
  })

  it('throws on an error status or a malformed answer', async () => {
    const failing = createJevClient({ apiKey: 'k', fetch: fakeFetch(529, { error: 'overloaded' }).fetch })
    await expect(failing.answerQualityQuestions({ facts: phoneFacts(), photoCount: 1 })).rejects.toThrow(
      /529/,
    )
    const malformed = createJevClient({ apiKey: 'k', fetch: fakeFetch(200, { answers: {} }).fetch })
    await expect(malformed.answerQualityQuestions({ facts: phoneFacts(), photoCount: 1 })).rejects.toThrow()
  })
})
