import { CircleHelp, Equal, ShieldAlert, Tag, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { verdictLabels } from '#/components/ui/copy'
import type { Verdict } from '#/lib/listing'

const verdictStyles: Record<Verdict, { icon: LucideIcon; className: string }> = {
  great_price: { icon: TrendingDown, className: 'bg-bg-accent text-text-on-brand' },
  fair_price: { icon: Equal, className: 'bg-bg-info text-text-on-brand' },
  room_to_haggle: { icon: Tag, className: 'bg-bg-haggle text-text-on-brand' },
  risk: { icon: ShieldAlert, className: 'bg-bg-danger text-text-on-danger' },
  no_data: { icon: CircleHelp, className: 'bg-bg-neutral text-text-secondary' },
}

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
