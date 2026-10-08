// The writer's guardrail (ADR 0009): generated text may only use numbers that
// are in its inputs. Anything else (a guessed price, a leaked offer) means
// the text is regenerated.

/** "1.200" and "12.520" (Croatian thousands), "4,6" and "4.6" (decimals), "91". */
const numberPattern = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g

function canonical(match: string): string {
  const isThousands = /^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(match)
  const plain = isThousands ? match.replaceAll('.', '').replace(',', '.') : match.replace(',', '.')
  return String(Number(plain))
}

function numbersIn(text: string): string[] {
  return (text.match(numberPattern) ?? []).map(canonical)
}

/** Numbers in `text` that appear nowhere in `inputs`, in order of appearance. */
export function unknownNumbers(text: string, inputs: unknown): string[] {
  const allowed = new Set(numbersIn(JSON.stringify(inputs)))
  return numbersIn(text).filter((value) => !allowed.has(value))
}
