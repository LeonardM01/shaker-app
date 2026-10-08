import { CircleCheck, CircleHelp, ShieldAlert, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { reportCopy } from '#/features/report/copy'
import type { CautionReason, TrustStatus } from '#/features/report/trust-status'

const copy = reportCopy.header.trust

/**
 * Same tones as the Znakovi prijevare summary: teal when it all checked out,
 * pollen-subtle for "check one thing", red only with scam evidence, gray when
 * we couldn't tell. Subtle fills keep it apart from the solid price verdict.
 */
const styles: Record<TrustStatus['kind'], { icon: LucideIcon; className: string; iconClassName: string }> = {
  checked: { icon: CircleCheck, className: 'bg-bg-positive-subtle text-text-positive', iconClassName: 'text-icon-positive' },
  caution: { icon: TriangleAlert, className: 'bg-bg-warning-subtle text-text-warning', iconClassName: 'text-icon-warning' },
  suspicious: { icon: ShieldAlert, className: 'bg-bg-danger-subtle text-text-danger', iconClassName: 'text-icon-danger' },
  unknown: { icon: CircleHelp, className: 'bg-bg-neutral text-text-secondary', iconClassName: 'text-icon-secondary' },
}

/** The report section holding the evidence, so the badge is one tap from it. */
const sectionOf: Record<CautionReason, string> = {
  scam_signals: 'sigurnost',
  contradictions: 'podaci',
  low_quality: 'sazetak',
  low_offer_score: 'sazetak',
}

function reasonOf(status: TrustStatus): string {
  switch (status.kind) {
    case 'suspicious':
      return copy.suspicious(status.scamSignalCount)
    case 'caution':
      return copy.caution(status.reasons, status.scamSignalCount)
    case 'checked':
      return copy.checked(status.qualityValue, status.offerScoreValue)
    case 'unknown':
      return copy.unknown
  }
}

/** Provjereno / Oprez / Sumnjivo / Nedovoljno podataka, with the why beside it. */
export function TrustBadge({ status }: { status: TrustStatus }) {
  const { icon: Icon, className, iconClassName } = styles[status.kind]
  const section = status.kind === 'caution' ? sectionOf[status.reasons[0] ?? 'scam_signals'] : 'sigurnost'
  return (
    <a
      href={`#${section}`}
      className="group inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 self-start rounded-sm focus-ring"
    >
      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 pr-3 pl-2 text-label ${className}`}>
        <Icon aria-hidden size={16} strokeWidth={2} className={iconClassName} />
        {copy.labels[status.kind]}
      </span>
      <span className="text-body-small text-text-secondary underline-offset-2 group-hover:underline">
        {reasonOf(status)}
      </span>
    </a>
  )
}
