import { useState } from 'react'

/** Copies text and remembers which item was copied last, for a "Kopirano" hint. */
export function useCopied(copyText: (text: string) => Promise<void>) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copy = async (key: string, text: string) => {
    await copyText(text)
    setCopiedKey(key)
  }
  return { copiedKey, copy }
}
