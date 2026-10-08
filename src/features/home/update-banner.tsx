import { TrendingDown } from 'lucide-react'
import { useId } from 'react'

import { homeCopy } from '#/features/home/copy'
import type { UpdateBanner as UpdateBannerData } from '#/features/home/home-result'
import { formatTimeAgo } from '#/lib/format'

/** The yellow banner for the biggest price drop since the last check. */
export function UpdateBanner({ banner, now }: { banner: UpdateBannerData; now: string }) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex items-start gap-4 rounded-lg bg-bg-haggle p-4 sm:items-center"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-icon-tint">
        <TrendingDown aria-hidden size={20} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 id={headingId} className="text-title">
          {homeCopy.banner.heading(banner.dropCents)}
        </h2>
        <p className="text-body-small">
          {homeCopy.banner.body(banner, formatTimeAgo(banner.checkedAt, now))}
        </p>
      </div>
    </section>
  )
}
