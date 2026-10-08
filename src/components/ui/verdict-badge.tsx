import { verdictLabels } from '#/components/ui/copy'
import { verdictStyles } from '#/components/ui/verdict-styles'
import type { Verdict } from '#/lib/listing'

/** DESIGN.md Verdict Badge, Compact size: always an icon and a word. */
export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const { icon: Icon, className } = verdictStyles[verdict]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full py-1 pr-2.5 pl-2 text-label-small ${className}`}
    >
      <Icon aria-hidden size={14} strokeWidth={2} />
      {verdictLabels[verdict]}
    </span>
  )
}
