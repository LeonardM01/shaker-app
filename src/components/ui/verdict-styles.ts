import { CircleHelp, Equal, ShieldAlert, Tag, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { Verdict } from '#/lib/listing'

/** The One Meaning Rule in one place: each verdict's icon and fill. */
export const verdictStyles: Record<Verdict, { icon: LucideIcon; className: string }> = {
  great_price: { icon: TrendingDown, className: 'bg-bg-accent text-text-on-brand' },
  fair_price: { icon: Equal, className: 'bg-bg-info text-text-on-brand' },
  room_to_haggle: { icon: Tag, className: 'bg-bg-haggle text-text-on-brand' },
  risk: { icon: ShieldAlert, className: 'bg-bg-danger text-text-on-danger' },
  no_data: { icon: CircleHelp, className: 'bg-bg-neutral text-text-secondary' },
}
