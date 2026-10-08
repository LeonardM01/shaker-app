import { Link } from '@tanstack/react-router'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { buttonStyles } from '#/components/ui/button-styles'
import type { PatternResult } from '#/features/check/scoring/scam'
import { ChecklistSection } from '#/features/report/checklist-section'
import { reportCopy } from '#/features/report/copy'
import { FindingsSection } from '#/features/report/findings-section'
import type { Question } from '#/features/report/findings-section'
import { OfferRail } from '#/features/report/offer-rail'
import { PriceSection } from '#/features/report/price-section'
import { QuestionsSection } from '#/features/report/questions-section'
import type { ClaimResult, ReplyResult, ReviewResult } from '#/features/report/report-actions'
import { ReportHeader } from '#/features/report/report-header'
import type { Report } from '#/features/report/report-result'
import { ScamSection } from '#/features/report/scam-section'
import { SellerSection } from '#/features/report/seller-section'
import { SummarySection } from '#/features/report/summary-section'

/** Everything the report can do. The route wires these to server functions. */
export type ReportActions = {
  onRefresh: () => void
  onSetTracked: (tracked: boolean) => Promise<void>
  onTick: (itemKey: string, ticked: boolean) => Promise<void>
  onClaim: () => Promise<ClaimResult>
  onWriteReview: (review: { stars: number; text: string }) => Promise<ReviewResult>
  onReply: (reviewId: string, text: string) => Promise<ReplyResult>
  onHelpful: (reviewId: string) => Promise<void>
  onReportReview: (reviewId: string) => Promise<void>
  onCheckMessage: (message: string) => Promise<PatternResult[]>
  copyText: (text: string) => Promise<void>
}

const copy = reportCopy

/** Section tabs jump within the page; they never change the route. */
const tabs = [
  { id: 'sazetak', label: copy.tabs.summary },
  { id: 'podaci', label: copy.tabs.findings },
  { id: 'cijena', label: copy.tabs.price },
  { id: 'sigurnost', label: copy.tabs.safety },
  { id: 'prodavac', label: copy.tabs.seller },
  { id: 'prije-kupnje', label: copy.tabs.beforeBuying },
] as const

function SectionTabs() {
  const [active, setActive] = useState<string>(tabs[0].id)
  return (
    <nav aria-label={copy.tabs.label} className="-mx-4 overflow-x-auto overflow-y-hidden border-b border-border-default px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      <ul className="flex gap-6">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <a
              href={`#${tab.id}`}
              aria-current={active === tab.id ? 'true' : undefined}
              onClick={() => {
                setActive(tab.id)
              }}
              className="-mb-px flex min-h-11 items-start border-b-2 border-transparent pt-1 pb-3 text-label whitespace-nowrap text-text-secondary hover:text-text-primary focus-ring aria-[current=true]:border-text-primary aria-[current=true]:text-text-primary"
            >
              {tab.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function TopBar({ report }: { report: Report }) {
  const signedIn = report.viewer.signedIn
  return (
    <div className="flex min-h-10 items-center gap-3">
      <Link
        to="/app"
        aria-label={copy.back}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-neutral hover:bg-bg-neutral-hover focus-ring"
      >
        <ArrowLeft aria-hidden size={20} />
      </Link>
      <nav aria-label={copy.breadcrumb.label} className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1 text-body-small">
          <li className="shrink-0">
            <Link to="/app" className="rounded-xs text-text-secondary hover:underline focus-ring">
              {signedIn ? copy.breadcrumb.watchlist : copy.breadcrumb.home}
            </Link>
          </li>
          <li aria-hidden className="shrink-0 text-icon-secondary">
            <ChevronRight size={16} />
          </li>
          <li aria-current="page" className="truncate font-semibold">
            {report.listing.title}
          </li>
        </ol>
      </nav>
      {!signedIn && (
        <Link
          to="/sign-in"
          search={{ redirect: `/app/listing/${report.listing.id}` }}
          className={buttonStyles({ variant: 'secondary', size: 'medium' })}
        >
          {copy.account.signIn}
        </Link>
      )}
    </div>
  )
}

/**
 * Izvještaj oglasa: one calm page that answers in the order a buyer worries,
 * with the offer in the right rail. "Dodaj u pitanja" and copying are client
 * state; ticks persist through `actions.onTick` for signed-in buyers.
 */
export function ReportScreen({ report, actions }: { report: Report; actions: ReportActions }) {
  const [addedQuestions, setAddedQuestions] = useState<Question[]>([])
  const questions = [...report.questions, ...addedQuestions]

  return (
    <div className="mx-auto flex w-full max-w-262 flex-col gap-6 px-4 pt-4 pb-24 md:px-12 md:pt-6">
      <TopBar report={report} />
      <div className="flex flex-col gap-8">
        <ReportHeader report={report} onRefresh={actions.onRefresh} onSetTracked={actions.onSetTracked} />
        <SectionTabs />
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_--spacing(80)]">
          <SummarySection report={report} />
          <div className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-7 lg:row-start-1">
            <OfferRail report={report} copyText={actions.copyText} onClaim={actions.onClaim} />
          </div>
          <FindingsSection
            findings={report.findings}
            questions={questions}
            onAddQuestion={(question) => {
              setAddedQuestions((current) => [...current, question])
            }}
          />
          <PriceSection report={report} />
          <ScamSection results={report.scam} onCheckMessage={actions.onCheckMessage} />
          <SellerSection
            report={report}
            onWriteReview={actions.onWriteReview}
            onReply={actions.onReply}
            onHelpful={actions.onHelpful}
            onReportReview={actions.onReportReview}
          />
          <QuestionsSection questions={questions} copyText={actions.copyText} />
          <ChecklistSection
            items={report.checklist}
            initialTicks={report.ticks}
            onTick={report.viewer.signedIn ? actions.onTick : null}
          />
        </div>
      </div>
    </div>
  )
}
