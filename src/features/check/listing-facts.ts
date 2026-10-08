// What the extractor reads out of a listing (ADR 0004): English keys, with
// the few Croatian labels the report shows verbatim. Also the schema the
// Gemini call is constrained to, so keep descriptions model-readable.

import { z } from 'zod'

/** Marketplace categories. Comparables only match within one. */
export const categories = [
  'phones',
  'computers',
  'tablets',
  'game_consoles',
  'audio_video',
  'cameras',
  'cars',
  'motorcycles',
  'bicycles',
  'furniture',
  'appliances',
  'clothing',
  'sports',
  'tools',
  'other',
] as const
export type Category = (typeof categories)[number]

/**
 * Model text is capped, not rejected: one over-long description must not
 * throw away a whole extraction. The bound is in the description because
 * Gemini gets the schema without length keywords (adapters/gemini.ts).
 */
const capped = (max: number, description: string) =>
  z
    .string()
    .trim()
    .min(1)
    .describe(`${description} (at most ${String(max)} characters)`)
    .transform((value) => value.slice(0, max))

/** Lists keep their first `max` items, most important first. */
const atMost = <T extends z.ZodType>(item: T, max: number, description: string) =>
  z
    .array(item)
    .describe(`${description} (at most ${String(max)})`)
    .transform((items) => items.slice(0, max))

const key = capped(48, 'English snake_case key, e.g. battery_health')
const labelHr = capped(80, 'Short Croatian label as a buyer would say it')
const evidence = z
  .string()
  .nullable()
  .describe('Verbatim quote from the text that shows the signal, or null when absent (at most 300 characters)')
  .transform((value) => value?.slice(0, 300) ?? null)

const scamSignal = z.object({ present: z.boolean(), evidence })

/** Patterns 2, 4, 5 and 6 of ADR 0010, as read from text. Shared with the message check. */
export const scamSignalsSchema = z.object({
  offPlatformPaymentLink: scamSignal.describe(
    'An actual link (URL) or named website for payment or delivery outside the marketplace, such as fake "dostava" or "sigurna kupnja" pages. Paying in advance without a link is advancePaymentOnly, not this.',
  ),
  offPlatformContact: scamSignal.describe('Asks to move to WhatsApp, Telegram, Viber or e-mail'),
  advancePaymentOnly: scamSignal.describe(
    'Only advance payment (including paying shipping first), no pickup and no cash on delivery',
  ),
  urgency: scamSignal.describe('Urgency or pressure, e.g. "danas zadnji dan", "već imam kupca"'),
})
export type ScamSignals = z.output<typeof scamSignalsSchema>

export const listingFactsSchema = z.object({
  searchKey: capped(
    80,
    'Short normalized item name used as a marketplace search query, brand + model + storage/variant, e.g. "iPhone 13 Pro 128 GB"',
  ),
  category: z.enum(categories),
  statedSpecs: atMost(
    z.object({ key, label: labelHr, value: capped(80, 'The stated value') }),
    20,
    'Specs the text states',
  ),
  missingFacts: atMost(
    z.object({
      key,
      label: capped(80, 'Croatian, e.g. "račun ili jamstvo"'),
      whyItMatters: capped(160, 'One Croatian sentence'),
    }),
    8,
    'Facts a buyer of this category needs that the listing does not state, most important first',
  ),
  contradictions: atMost(
    z.object({
      key,
      label: capped(80, 'Croatian, e.g. "Baterija"'),
      textValue: capped(80, 'What the text says, e.g. "91 %"'),
      photoValue: capped(80, 'What the photo shows, e.g. "86 %"'),
      photoIndex: z.number().int().min(1).max(40).describe('1-based index of the photo'),
      photoDescription: capped(80, 'Croatian, e.g. "Snimka zaslona iz Postavki"'),
    }),
    8,
    'Facts where the text and a photo disagree',
  ),
  confirmedFacts: atMost(
    z.object({ key, label: labelHr }),
    8,
    'Facts where text and photos agree, e.g. model, storage, colour',
  ),
  photos: atMost(
    z.object({
      index: z.number().int().min(1).max(40).describe('1-based index of the photo'),
      description: capped(200, 'English: what the photo shows, including visible wear, defects or screenshots'),
    }),
    40,
    'One entry per photo, in order',
  ),
  conditionNotes: z
    .string()
    .nullable()
    .describe('English summary of what the text says about condition, wear or defects; null if nothing (at most 300 characters)')
    .transform((value) => value?.slice(0, 300) ?? null),
  scamSignals: scamSignalsSchema,
})
export type ListingFacts = z.output<typeof listingFactsSchema>
