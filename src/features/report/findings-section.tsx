import { Check, CircleCheck, CircleHelp, Plus, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import { buttonStyles } from '#/components/ui/button-styles'
import { reportCopy } from '#/features/report/copy'
import { ReportSection } from '#/features/report/report-section'
import type { Report } from '#/features/report/report-result'

const copy = reportCopy.findings

export type Question = Report['questions'][number]

function FindingRow({
  title,
  detail,
  icon,
  action,
}: {
  title: string
  detail: string
  icon: ReactNode
  action?: ReactNode
}) {
  return (
    <li
      aria-label={title}
      className="flex flex-col gap-3 border-b border-border-default px-5 py-4 last:border-b-0 sm:flex-row sm:items-start sm:gap-4"
    >
      <div className="flex min-w-0 flex-1 gap-4">
        <span className="pt-0.5">{icon}</span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-title">{title}</p>
          <p className="text-body-small text-text-secondary">{detail}</p>
        </div>
      </div>
      {action && <div className="shrink-0 pl-9 sm:pl-0">{action}</div>}
    </li>
  )
}

/** "Dodaj u pitanja", or a note that the question is already in the list. */
function AddQuestion({ inList, onAdd }: { inList: boolean; onAdd: () => void }) {
  if (inList) {
    return (
      <p className="flex h-9 items-center gap-2 px-4 text-label text-text-secondary">
        <Check aria-hidden size={16} />
        {copy.added}
      </p>
    )
  }
  return (
    <button type="button" onClick={onAdd} className={buttonStyles({ variant: 'tertiary', size: 'medium' })}>
      <Plus aria-hidden size={16} />
      {copy.add}
    </button>
  )
}

/**
 * Što nedostaje ili se ne slaže: contradictions with their evidence, missing
 * facts with why they matter, and what checked out.
 */
export function FindingsSection({
  findings,
  questions,
  onAddQuestion,
}: {
  findings: Report['findings']
  questions: Question[]
  onAddQuestion: (question: Question) => void
}) {
  const inList = (key: string) => questions.some((question) => question.sourceKey === key)
  const count = findings
    ? findings.contradictions.length + findings.missing.length + (findings.confirmed.length > 0 ? 1 : 0)
    : 0

  return (
    <ReportSection
      id="podaci"
      title={copy.heading}
      aside={findings && <p className="text-body-small text-text-tertiary">{copy.count(count)}</p>}
    >
      {!findings ? (
        <p className="rounded-lg bg-bg-neutral px-5 py-4 text-body-small text-text-secondary">{copy.unavailable}</p>
      ) : count === 0 ? (
        <p className="rounded-lg bg-bg-neutral px-5 py-4 text-body-small text-text-secondary">{copy.empty}</p>
      ) : (
        <ul className="flex flex-col rounded-xl border border-border-default">
          {findings.contradictions.map((item) => (
            <FindingRow
              key={item.key}
              title={copy.contradiction(item.label, item.textValue, item.photoValue)}
              detail={copy.contradictionDetail(item.photoDescription, item.photoIndex)}
              icon={<TriangleAlert aria-hidden size={20} className="text-icon-warning" />}
              action={
                <AddQuestion
                  inList={inList(item.key)}
                  onAdd={() => {
                    onAddQuestion({
                      key: `added-${item.key}`,
                      sourceKey: item.key,
                      text: reportCopy.questions.fromContradiction(item.label, item.textValue, item.photoValue),
                    })
                  }}
                />
              }
            />
          ))}
          {findings.missing.map((item) => (
            <FindingRow
              key={item.key}
              title={copy.missing(item.label)}
              detail={item.whyItMatters}
              icon={<CircleHelp aria-hidden size={20} className="text-icon-secondary" />}
              action={
                <AddQuestion
                  inList={inList(item.key)}
                  onAdd={() => {
                    onAddQuestion({
                      key: `added-${item.key}`,
                      sourceKey: item.key,
                      text: reportCopy.questions.fromMissing(item.label),
                    })
                  }}
                />
              }
            />
          ))}
          {findings.confirmed.length > 0 && (
            <FindingRow
              title={copy.confirmed(findings.confirmed.map((item) => item.label))}
              detail={copy.confirmedDetail}
              icon={<CircleCheck aria-hidden size={20} className="text-icon-brand" />}
            />
          )}
        </ul>
      )}
    </ReportSection>
  )
}
