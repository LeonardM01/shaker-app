import { Square, SquareCheck } from 'lucide-react'
import { useState } from 'react'

import { reportCopy } from '#/features/report/copy'
import { ReportSection } from '#/features/report/report-section'
import type { Report } from '#/features/report/report-result'

const copy = reportCopy.checklist

/**
 * Provjeri prije plaćanja: tickable during the handover. Ticks are saved for a
 * signed-in buyer (`onTick`) and kept in this tab only for a guest.
 */
export function ChecklistSection({
  items,
  initialTicks,
  onTick,
}: {
  items: Report['checklist']
  initialTicks: string[]
  /** Null for a guest. */
  onTick: ((itemKey: string, ticked: boolean) => Promise<void>) | null
}) {
  const [ticks, setTicks] = useState(() => new Set(initialTicks))
  const done = items.filter((item) => ticks.has(item.key)).length

  function toggle(itemKey: string, ticked: boolean) {
    setTicks((current) => {
      const next = new Set(current)
      if (ticked) next.add(itemKey)
      else next.delete(itemKey)
      return next
    })
    // A failed save keeps the tick on screen; it's only lost on reload.
    void onTick?.(itemKey, ticked).catch(() => undefined)
  }

  return (
    <ReportSection
      id="prije-kupnje"
      title={copy.heading}
      aside={items.length > 0 && <p className="text-body-small text-text-tertiary">{copy.progress(done, items.length)}</p>}
    >
      {items.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl border border-border-default p-3">
          {items.map((item) => {
            const ticked = ticks.has(item.key)
            const Icon = ticked ? SquareCheck : Square
            return (
              <li key={item.key}>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-border-focus">
                  <input
                    type="checkbox"
                    checked={ticked}
                    onChange={(event) => {
                      toggle(item.key, event.target.checked)
                    }}
                    className="sr-only"
                  />
                  <Icon aria-hidden size={20} className={`mt-0.5 shrink-0 ${ticked ? 'text-icon-brand' : 'text-icon-secondary'}`} />
                  <span className={`text-body ${ticked ? 'text-text-secondary line-through' : ''}`}>{item.text}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
      {!onTick && items.length > 0 && <p className="text-caption text-text-tertiary">{copy.guestNote}</p>}
    </ReportSection>
  )
}
