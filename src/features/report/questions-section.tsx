import { Check, Copy } from 'lucide-react'

import { buttonStyles } from '#/components/ui/button-styles'
import { reportCopy } from '#/features/report/copy'
import type { Question } from '#/features/report/findings-section'
import { ReportSection } from '#/features/report/report-section'
import { useCopied } from '#/features/report/use-copied'

const copy = reportCopy.questions
const allKey = '__all__'

/** Što pitati prodavatelja?: ready-to-copy questions, one by one or all together. */
export function QuestionsSection({
  questions,
  copyText,
}: {
  questions: Question[]
  copyText: (text: string) => Promise<void>
}) {
  const { copiedKey, copy: copyItem } = useCopied(copyText)
  return (
    <ReportSection
      id="pitanja"
      title={copy.heading}
      aside={
        questions.length > 0 && (
          <button
            type="button"
            onClick={() => void copyItem(allKey, questions.map((question) => question.text).join('\n'))}
            className={buttonStyles({ variant: 'secondary', size: 'medium' })}
          >
            {copiedKey === allKey ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}
            {copiedKey === allKey ? copy.copied : copy.copyAll}
          </button>
        )
      }
    >
      {questions.length === 0 ? (
        <p className="rounded-lg bg-bg-neutral px-5 py-4 text-body-small text-text-secondary">{copy.empty}</p>
      ) : (
        <ul className="flex flex-col rounded-xl border border-border-default">
          {questions.map((question) => (
            <li
              key={question.key}
              className="flex items-center gap-4 border-b border-border-default py-2 pr-2 pl-5 last:border-b-0"
            >
              <p className="flex-1 text-body">{question.text}</p>
              <button
                type="button"
                aria-label={copy.copy(question.text)}
                title={copiedKey === question.key ? copy.copied : undefined}
                onClick={() => void copyItem(question.key, question.text)}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-icon-secondary hover:bg-bg-neutral focus-ring"
              >
                {copiedKey === question.key ? (
                  <Check aria-hidden size={18} className="text-icon-brand" />
                ) : (
                  <Copy aria-hidden size={18} />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </ReportSection>
  )
}
