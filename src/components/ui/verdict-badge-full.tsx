import { verdictGroupLabel, verdictLabels } from '#/components/ui/copy'
import { verdictStyles } from '#/components/ui/verdict-styles'
import type { Verdict } from '#/lib/listing'

/**
 * DESIGN.md Verdict Badge, Full size: icon in a tinted circle, the verdict
 * and a one-line reason. Always an icon and a word, never color alone.
 */
export function VerdictBadgeFull({ verdict, reason }: { verdict: Verdict; reason: string | null }) {
  const { icon: Icon, className } = verdictStyles[verdict]
  return (
    <div
      role="group"
      aria-label={verdictGroupLabel}
      className={`inline-flex shrink-0 items-center gap-3 rounded-lg py-3 pr-4 pl-3 ${className}`}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-icon-tint">
        <Icon aria-hidden size={18} />
      </span>
      <span className="flex flex-col">
        <span className="text-label">{verdictLabels[verdict]}</span>
        {reason && <span className="text-caption">{reason}</span>}
      </span>
    </div>
  )
}
