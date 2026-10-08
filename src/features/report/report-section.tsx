import { useId } from 'react'
import type { ReactNode } from 'react'

/**
 * One section of the report: a Heading Small title with an optional note or
 * action on the right. Named by its heading, so it's a landmark region.
 */
export function ReportSection({
  id,
  title,
  aside,
  children,
  className = '',
}: {
  id: string
  title: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  const headingId = useId()
  return (
    <section id={id} aria-labelledby={headingId} className={`flex scroll-mt-6 flex-col gap-4 ${className}`}>
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className="text-heading-small">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}
