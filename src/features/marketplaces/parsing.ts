// Helpers every marketplace parser shares: turning untrusted scraped strings
// into the port's shapes, and failing loudly when a page isn't what we expect.

import { parse } from 'node-html-parser'
import type { z } from 'zod'

import { ReaderError } from '#/features/marketplaces/marketplace-reader'

/** Throws `parse_failed`: the page loaded but didn't have the shape we expect. */
export function parseFailed(what: string, cause?: unknown): never {
  throw new ReaderError('parse_failed', what, cause === undefined ? undefined : { cause })
}

/** Validates against a schema; a mismatch is a parse failure, not a crash. */
export function validated<T extends z.ZodType>(schema: T, value: unknown, what: string): z.output<T> {
  const result = schema.safeParse(value)
  if (!result.success) parseFailed(`${what} did not match the expected shape`, result.error)
  return result.data
}

// Control characters and bidi overrides can disguise text; line breaks and tabs stay.
const unsafeCharacters = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F‪-‮⁦-⁩]/g

/** Cuts to `max` UTF-16 units without splitting a surrogate pair. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut
}

/** One line of untrusted text, or null when nothing is left. */
export function cleanLine(value: string | null | undefined, max: number): string | null {
  if (value == null) return null
  const text = value.replace(unsafeCharacters, ' ').replace(/\s+/g, ' ').trim()
  return text === '' ? null : clip(text, max)
}

/** Multi-line untrusted text (a description). Keeps paragraphs, drops the rest. */
export function cleanText(value: string | null | undefined, max: number): string {
  if (value == null) return ''
  const text = value
    .replace(/\r\n?/g, '\n')
    .replace(unsafeCharacters, ' ')
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return clip(text, max)
}

/** Text content of an HTML fragment (`<br>` becomes a line break, entities decoded). */
export function htmlToText(html: string): string {
  return parse(html).text
}

/** A euro amount (possibly fractional) as integer cents; null if it isn't a usable price. */
export function eurosToCents(euros: number | null | undefined): number | null {
  if (euros == null || !Number.isFinite(euros) || euros < 0) return null
  return Math.round(euros * 100)
}

/** Croatian-formatted euro text ("1.250 €", "600,43 €") as integer cents. */
export function euroTextToCents(text: string | null | undefined): number | null {
  if (text == null) return null
  const match = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?\s*(?:€|EUR)$/.exec(
    text.replace(/[\s  ]+/g, ' ').trim(),
  )
  if (!match?.[1]) return null
  const euros = Number(match[1].replaceAll('.', ''))
  const cents = Number((match[2] ?? '0').padEnd(2, '0'))
  return euros * 100 + cents
}

/** An ISO timestamp, or null when it doesn't parse. */
export function isoDate(text: string | null | undefined): Date | null {
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Unix seconds, or null. */
export function unixDate(seconds: number | null | undefined): Date | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null
  return new Date(seconds * 1000)
}

const zagrebOffset = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Zagreb',
  timeZoneName: 'longOffset',
})

/**
 * A day written the Croatian way ("11.12.2007.") as the moment that day
 * starts in Croatia, in UTC. Null when the text isn't such a date.
 */
export function croatianDay(text: string | null | undefined): Date | null {
  const match = /(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})\.?/.exec(text ?? '')
  if (!match) return null
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const utcMidnight = Date.UTC(year, month - 1, day)
  const check = new Date(utcMidnight)
  if (check.getUTCDate() !== day || check.getUTCMonth() !== month - 1) return null
  // "GMT+02:00" in summer, "GMT+01:00" in winter.
  const offset = zagrebOffset
    .formatToParts(new Date(utcMidnight + 12 * 3_600_000))
    .find((part) => part.type === 'timeZoneName')?.value
  const offsetMatch = /GMT([+-])(\d{2}):(\d{2})/.exec(offset ?? '')
  const offsetMinutes = offsetMatch
    ? (offsetMatch[1] === '-' ? -1 : 1) * (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3]))
    : 0
  return new Date(utcMidnight - offsetMinutes * 60_000)
}

/**
 * Parses the JSON object literal that starts at `text[start]` (a `{`),
 * ignoring whatever script follows it. Null when it isn't valid JSON.
 */
export function jsonObjectAt(text: string, start: number): unknown {
  if (text[start] !== '{') return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < text.length; index++) {
    const char = text[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
    } else if (char === '"') inString = true
    else if (char === '{') depth++
    else if (char === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, index + 1)) as unknown
        } catch {
          return null
        }
      }
    }
  }
  return null
}
