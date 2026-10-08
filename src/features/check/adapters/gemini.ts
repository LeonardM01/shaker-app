// The extractor and the writer on Gemini through the Vercel AI SDK (ADR 0004,
// ADR 0009). `generateText` with `Output.object` is the SDK 7 form of
// `generateObject`: output is validated against the Zod schema.

import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { Output, generateText, jsonSchema } from 'ai'
import type { LanguageModel, Schema } from 'ai'
import { z } from 'zod'

import { offerPlaceholder } from '#/features/check/check-outcome'
import type { WrittenText } from '#/features/check/check-outcome'
import type { Extractor, ExtractorInput, Writer, WriterInput } from '#/features/check/check-ports'
import { listingFactsSchema, scamSignalsSchema } from '#/features/check/listing-facts'

/** The one place the model is chosen. Paid tier only (ADR 0004). */
export const geminiModelId = 'gemini-3.1-flash-lite-preview'

const timeoutMs = 60_000

/** JSON Schema keywords Gemini's response schema rejects when a schema is this large. */
const boundKeywords = new Set(['$schema', 'minLength', 'maxLength', 'minItems', 'maxItems', 'minimum', 'maximum', 'pattern'])

function withoutBounds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutBounds)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([keyword]) => !boundKeywords.has(keyword))
      .map(([keyword, child]) => [keyword, withoutBounds(child)]),
  )
}

/**
 * Gemini gets the schema without length and size bounds (the full one is
 * rejected as too complex, checked 2026-10-08); the answer is still validated
 * against the full Zod schema, bounds included.
 */
function geminiSchema<T>(schema: z.ZodType<T, unknown>): Schema<T> {
  // `io: 'input'`: the model writes the raw shape; caps and slices run after.
  const wire = withoutBounds(z.toJSONSchema(schema, { io: 'input' }))
  return jsonSchema<T>(wire as Parameters<typeof jsonSchema>[0], {
    validate: (value) => {
      const result = schema.safeParse(value)
      return result.success ? { success: true, value: result.data } : { success: false, error: result.error }
    },
  })
}

export function createGeminiModel(apiKey: string): LanguageModel {
  return createGoogleGenerativeAI({ apiKey })(geminiModelId)
}

const extractorSystem = `You read one second-hand listing from a Croatian marketplace (Njuškalo, Facebook Marketplace or Index oglasi): its Croatian title and description, its asking price and its photos, in order.
Return facts only. Never guess: if something is not stated or not visible, it is missing, not assumed.
- searchKey: brand + model + the variant that changes the price (storage, engine, size). No condition words, no colour unless it changes the price.
- missingFacts: facts a buyer of this category needs before paying that the listing does not state (e.g. phones: battery health, receipt or warranty, IMEI, iCloud lock). At most 8, most important first.
- contradictions: only where a photo clearly shows something different from the text (e.g. a battery-health screenshot showing 86 % while the text says 91 %). Give the 1-based photo index.
- confirmedFacts: facts where the text and the photos agree.
- photos: one English description per photo.
- scamSignals: only when the text itself shows the signal; quote the exact words as evidence.
Croatian labels and sentences are short and plain, as a buyer would say them. English fields are English.`

const messageSystem = `You read one message a seller sent a buyer on a Croatian marketplace. Report only the scam signals the message itself shows, quoting the exact words as evidence. A message without a signal has none.`

function writerSystem(attempt: number): string {
  const retry =
    attempt > 1
      ? '\nYour previous draft used a number that is not in the input. Use no numbers at all unless you copy them from the input.'
      : ''
  return `You write the text of a Shaker listing report in Croatian, for a buyer. Plain words, one idea per sentence, friendly and calm. Address the buyer informally (ti). Questions and the offer message are sent to the seller, so they address the seller politely (Vi): "Možete li…", "Biste li prihvatili…".
Rules:
- Use only numbers that appear in the input. Never write a price, an amount of money or an offer.
- The summary is 2–3 sentences and agrees with the verdict and reasons in the input.
- Never call the seller a scammer, dishonest or guilty. Describe what the listing shows or lacks, and what to check.
- questions: about 5 questions to send the seller. Each question about a missing fact or a contradiction sets sourceKey to that fact's key; other questions use null.
- checklist: 5 things to check in person before paying, specific to the category.
- offerMessage: a short, polite message offering to buy, containing the placeholder ${offerPlaceholder} exactly once where the offer goes, and no other number.${retry}`
}

/** Over-long model text is cut, not rejected (see listing-facts.ts). */
const cut = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.slice(0, max))

const writtenTextSchema = z.object({
  summary: cut(800),
  questions: z
    .array(
      z.object({
        key: cut(48).describe('Short English snake_case id'),
        text: cut(300),
        sourceKey: z.string().nullable(),
      }),
    )
    .min(1)
    .transform((items) => items.slice(0, 8)),
  checklist: z
    .array(z.object({ key: cut(48).describe('Short English snake_case id'), text: cut(200) }))
    .min(3)
    .transform((items) => items.slice(0, 8)),
  offerMessage: cut(500),
}) satisfies z.ZodType<WrittenText, unknown>

function extractorPrompt(input: ExtractorInput) {
  const price = input.priceCents === null ? 'not stated' : `${String(input.priceCents / 100)} EUR`
  return [
    {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: `Title: ${input.title}\nAsking price: ${price}\nDescription:\n${input.description}`,
        },
        ...input.photos.map((data) => ({ type: 'file' as const, mediaType: 'image/webp', data })),
      ],
    },
  ]
}

export function createGeminiExtractor(model: LanguageModel): Extractor {
  return {
    async extractListing(input) {
      const { output } = await generateText({
        model,
        system: extractorSystem,
        messages: extractorPrompt(input),
        output: Output.object({ schema: geminiSchema(listingFactsSchema) }),
        abortSignal: AbortSignal.timeout(timeoutMs),
      })
      return output
    },
    async extractMessage(message) {
      const { output } = await generateText({
        model,
        system: messageSystem,
        prompt: message,
        output: Output.object({ schema: geminiSchema(scamSignalsSchema) }),
        abortSignal: AbortSignal.timeout(timeoutMs),
      })
      return output
    },
  }
}

export function createGeminiWriter(model: LanguageModel): Writer {
  return {
    async write(input: WriterInput, attempt: number) {
      const { output } = await generateText({
        model,
        system: writerSystem(attempt),
        prompt: JSON.stringify(input),
        output: Output.object({ schema: geminiSchema(writtenTextSchema) }),
        abortSignal: AbortSignal.timeout(timeoutMs),
      })
      return output
    },
  }
}
