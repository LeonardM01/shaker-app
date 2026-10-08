import { Check, CircleCheck, CircleHelp, MessageCircle, ShieldAlert, TriangleAlert } from 'lucide-react'
import { useId, useState } from 'react'
import type { SubmitEvent } from 'react'

import { buttonStyles } from '#/components/ui/button-styles'
import { isRisk, scamPatterns } from '#/features/check/scoring/scam'
import type { PatternResult } from '#/features/check/scoring/scam'
import { reportCopy } from '#/features/report/copy'
import { ReportSection } from '#/features/report/report-section'

const copy = reportCopy.scam

/** Red only beside evidence that makes the verdict Rizik; a lone signal is a warning. */
function toneOf(result: PatternResult, risk: boolean): 'clear' | 'unknown' | 'warning' | 'danger' {
  if (result.status !== 'fired') return result.status
  return result.strength === 'strong' || (risk && result.strength === 'medium') ? 'danger' : 'warning'
}

function PatternRow({ result, risk }: { result: PatternResult; risk: boolean }) {
  const tone = toneOf(result, risk)
  const quote = result.status === 'fired' && result.evidence.kind === 'quote' ? result.evidence.quote : null
  const icons = {
    clear: <Check aria-hidden size={20} className="shrink-0 text-icon-brand" />,
    unknown: <CircleHelp aria-hidden size={20} className="shrink-0 text-icon-secondary" />,
    warning: <TriangleAlert aria-hidden size={20} className="shrink-0 text-icon-warning" />,
    danger: <ShieldAlert aria-hidden size={20} className="shrink-0 text-icon-danger" />,
  }
  return (
    <li className="flex gap-3">
      {icons[tone]}
      <p
        className={`text-body-small ${tone === 'unknown' ? 'text-text-secondary' : tone === 'danger' ? 'text-text-danger' : 'text-text-primary'}`}
      >
        {copy.pattern(result)}
        {quote && <span className="text-text-secondary"> {copy.quote(quote)}</span>}
      </p>
    </li>
  )
}

function MessageCheck({ onCheckMessage }: { onCheckMessage: (message: string) => Promise<PatternResult[]> }) {
  const [message, setMessage] = useState('')
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'checking' } | { kind: 'result'; results: PatternResult[] } | { kind: 'failed' }
  >({ kind: 'idle' })
  const fieldId = useId()

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (message.trim() === '') return
    setState({ kind: 'checking' })
    try {
      setState({ kind: 'result', results: await onCheckMessage(message.trim()) })
    } catch {
      setState({ kind: 'failed' })
    }
  }

  const fired = state.kind === 'result' ? state.results.filter((result) => result.status === 'fired') : []
  const risky = fired.some((result) => result.strength === 'strong')

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <label htmlFor={fieldId} className="sr-only">
          {copy.message.label}
        </label>
        <div className="flex min-h-12 flex-1 items-start gap-3 rounded-md border border-border-strong bg-bg-elevated px-4 py-3 has-[textarea:focus]:border-border-focus has-[textarea:focus]:ring-1 has-[textarea:focus]:ring-border-focus">
          <MessageCircle aria-hidden size={20} className="mt-0.5 shrink-0 text-icon-secondary" />
          <textarea
            id={fieldId}
            rows={1}
            maxLength={4000}
            value={message}
            placeholder={copy.message.placeholder}
            onChange={(event) => {
              setMessage(event.target.value)
            }}
            className="field-sizing-content min-h-6 w-full resize-none bg-transparent text-body text-text-primary outline-none placeholder:text-text-tertiary"
          />
        </div>
        <button
          type="submit"
          disabled={state.kind === 'checking'}
          className={buttonStyles({ variant: 'secondary' })}
        >
          {state.kind === 'checking' ? copy.message.checking : copy.message.submit}
        </button>
      </form>
      <p className="text-caption text-text-tertiary">{copy.message.privacy}</p>
      {state.kind === 'failed' && (
        <p role="alert" className="text-body-small text-text-secondary">
          {copy.message.failed}
        </p>
      )}
      {state.kind === 'result' && (
        <div
          role="alert"
          className={`flex gap-3 rounded-lg p-4 ${fired.length === 0 ? 'bg-bg-positive-subtle' : risky ? 'bg-bg-danger-subtle' : 'bg-bg-warning-subtle'}`}
        >
          {fired.length === 0 ? (
            <CircleCheck aria-hidden size={24} className="shrink-0 text-icon-positive" />
          ) : (
            <ShieldAlert aria-hidden size={24} className={`shrink-0 ${risky ? 'text-icon-danger' : 'text-icon-warning'}`} />
          )}
          <div className="flex flex-col gap-1">
            <p className="text-title">{fired.length === 0 ? copy.message.clearTitle : copy.message.riskTitle}</p>
            {fired.length === 0 ? (
              <p className="text-body-small text-text-secondary">{copy.message.clearBody}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {fired.map((result) => (
                  <li key={result.code} className="text-body-small">
                    {copy.pattern(result)}
                    {result.status === 'fired' && result.evidence.kind === 'quote' && result.evidence.quote && (
                      <span className="text-text-secondary"> {copy.quote(result.evidence.quote)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type SummaryState = 'clear' | 'attention' | 'risk' | 'unknown'

/**
 * The answer first. Teal only when every pattern checked clear; pollen-subtle
 * ("check one thing") when a signal fired without making it Rizik; red with
 * Rizik; gray when nothing could be checked, which is unknown, not suspicious.
 */
const summaryStates: Record<SummaryState, { title: string; icon: typeof CircleCheck; className: string; iconClassName: string }> = {
  clear: { title: copy.clearTitle, icon: CircleCheck, className: 'bg-bg-positive-subtle', iconClassName: 'text-icon-positive' },
  attention: { title: '', icon: TriangleAlert, className: 'bg-bg-warning-subtle', iconClassName: 'text-icon-warning' },
  risk: { title: copy.riskTitle, icon: ShieldAlert, className: 'bg-bg-danger-subtle', iconClassName: 'text-icon-danger' },
  unknown: { title: copy.unknownTitle, icon: CircleHelp, className: 'bg-bg-neutral', iconClassName: 'text-icon-secondary' },
}

/** Znakovi prijevare: the answer first, the six patterns, and "Provjeri poruku". */
export function ScamSection({
  results,
  onCheckMessage,
}: {
  results: PatternResult[]
  onCheckMessage: (message: string) => Promise<PatternResult[]>
}) {
  const risk = isRisk(results)
  const attention = results.filter((result) => result.status === 'fired').length
  const state: SummaryState = risk
    ? 'risk'
    : attention > 0
      ? 'attention'
      : results.every((result) => result.status === 'unknown')
        ? 'unknown'
        : 'clear'
  const summary = summaryStates[state]
  const Icon = summary.icon

  return (
    <ReportSection id="sigurnost" title={copy.heading}>
      <div className={`flex gap-3 rounded-lg p-4 ${summary.className}`}>
        <Icon aria-hidden size={24} className={`shrink-0 ${summary.iconClassName}`} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-title">{state === 'attention' ? copy.attentionTitle(attention) : summary.title}</p>
          <p className="text-body-small text-text-secondary">
            {state === 'risk'
              ? copy.riskBody
              : state === 'unknown'
                ? copy.unknownBody
                : copy.summary(copy.patternCount(scamPatterns.length))}
          </p>
          <details className="group">
            <summary className="inline-flex cursor-pointer list-none py-0.5 text-label text-text-brand underline underline-offset-2 focus-ring">
              {copy.how}
            </summary>
            <p className="pt-1 text-body-small text-text-secondary">{copy.howBody}</p>
          </details>
        </div>
      </div>
      <ul aria-label={copy.patternsLabel} className="flex flex-col gap-3 rounded-xl border border-border-default p-5">
        {results.map((result) => (
          <PatternRow key={result.code} result={result} risk={risk} />
        ))}
      </ul>
      <MessageCheck onCheckMessage={onCheckMessage} />
    </ReportSection>
  )
}
