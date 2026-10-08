import { reportCopy } from '#/features/report/copy'
import { ReportSection } from '#/features/report/report-section'
import type { Report } from '#/features/report/report-result'

const copy = reportCopy.summary

/** A score ledger row: title, one-line reason, and "64 /100" or gray "Nema podataka". */
function ScoreRow({ title, reason, value }: { title: string; reason: string; value: number | null }) {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-bg-neutral px-5 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="text-title">{title}</h3>
        <p className="text-body-small text-text-secondary">{reason}</p>
      </div>
      {value === null ? (
        <p className="shrink-0 text-label text-text-secondary">{copy.noScore}</p>
      ) : (
        <p className="flex shrink-0 items-baseline gap-0.5">
          <span className="font-display text-price">{value}</span>
          <span className="text-caption text-text-tertiary">{copy.outOf}</span>
        </p>
      )}
    </div>
  )
}

/** Sažetak: the written summary, then Ocjena ponude and Kvaliteta oglasa. */
export function SummarySection({ report }: { report: Report }) {
  return (
    <ReportSection id="sazetak" title={copy.heading}>
      <p className={report.summary ? 'text-body-large' : 'text-body text-text-secondary'}>
        {report.summary ?? copy.missingText}
      </p>
      <div className="flex flex-col gap-2">
        <ScoreRow
          title={copy.offerScore}
          reason={copy.offerScoreReason(report.offerScore)}
          value={report.offerScore.kind === 'score' ? report.offerScore.value : null}
        />
        <ScoreRow
          title={copy.quality}
          reason={copy.qualityReason(report.quality)}
          value={report.quality.kind === 'score' ? report.quality.value : null}
        />
      </div>
    </ReportSection>
  )
}
