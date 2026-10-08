// The badge above the report title: one answer from Znakovi prijevare,
// Kvaliteta oglasa and Ocjena ponude. Only scam evidence (Rizik) makes a
// listing Sumnjivo; weak scores and lone signals ask for care, never accuse.
// Missing data is unknown, not suspicious.
import { isRisk } from '#/features/check/scoring/scam'
import type { Report } from '#/features/report/report-result'

/** Below this a score asks for care: the "poor" band of Kvaliteta oglasa. */
export const lowScore = 40

export type CautionReason = 'scam_signals' | 'contradictions' | 'low_quality' | 'low_offer_score'

export type TrustStatus =
  | { kind: 'suspicious'; scamSignalCount: number }
  | { kind: 'caution'; reasons: CautionReason[]; scamSignalCount: number }
  | { kind: 'checked'; qualityValue: number; offerScoreValue: number | null }
  | { kind: 'unknown' }

export function trustStatus({
  scam,
  quality,
  offerScore,
}: Pick<Report, 'scam' | 'quality' | 'offerScore'>): TrustStatus {
  const scamSignalCount = scam.filter((result) => result.status === 'fired').length
  if (isRisk(scam)) return { kind: 'suspicious', scamSignalCount }

  const reasons: CautionReason[] = []
  if (scamSignalCount > 0) reasons.push('scam_signals')
  if (quality.kind === 'score' && quality.contradictionCount > 0) reasons.push('contradictions')
  if (quality.kind === 'score' && quality.value < lowScore) reasons.push('low_quality')
  if (offerScore.kind === 'score' && offerScore.value < lowScore) reasons.push('low_offer_score')
  if (reasons.length > 0) return { kind: 'caution', reasons, scamSignalCount }

  if (quality.kind === 'no_data' || scam.every((result) => result.status === 'unknown')) return { kind: 'unknown' }
  return {
    kind: 'checked',
    qualityValue: quality.value,
    offerScoreValue: offerScore.kind === 'score' ? offerScore.value : null,
  }
}
