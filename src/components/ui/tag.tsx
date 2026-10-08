import type { ReactNode } from 'react'

/** DESIGN.md Tag, Outline tone: platform, category or place metadata. */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-xs border border-border-strong px-2 py-0.5 text-label-small text-text-secondary">
      {children}
    </span>
  )
}
