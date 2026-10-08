import { formatPrice } from '#/lib/format'

type PriceRangeBarProps = {
  /** Every comparable price, in cents. */
  dots: readonly number[]
  /** Null below 5 comparables: the Insufficient state, with no zones and no marker. */
  market: { lowCents: number; medianCents: number; highCents: number } | null
  priceCents: number | null
  /** Within this share of the median a price is fair; it sets the middle zone. */
  fairBand: number
  labels: {
    title: string
    count: string
    marker: (priceCents: number) => string
    average: (cents: number) => string
    insufficient: string
    /** Describes the chart for screen readers. */
    summary: string
  }
}

/**
 * DESIGN.md Price Range Bar (signature): comparables as dots over the three
 * verdict zones, with a black marker for this listing. Every zone keeps a 3px
 * edge in its deep step (The Pastel Field, Deep Edge Rule). Never a fake range.
 */
export function PriceRangeBar({ dots, market, priceCents, fairBand, labels }: PriceRangeBarProps) {
  const values = [...dots, ...(market ? [market.lowCents, market.highCents] : []), ...(priceCents === null ? [] : [priceCents])]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  // 4% padding on each side so dots at the ends stay on the track.
  const at = (cents: number) => 4 + ((cents - min) / span) * 92

  const zones = market && [
    { left: 0, right: at(market.medianCents * (1 - fairBand)), fill: 'bg-bg-accent', edge: 'bg-border-positive', ends: 'rounded-l-full' },
    {
      left: at(market.medianCents * (1 - fairBand)),
      right: at(market.medianCents * (1 + fairBand)),
      fill: 'bg-bg-info',
      edge: 'bg-border-info',
      ends: '',
    },
    { left: at(market.medianCents * (1 + fairBand)), right: 100, fill: 'bg-bg-haggle', edge: 'bg-border-warning', ends: 'rounded-r-full' },
  ]

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-label">{labels.title}</p>
        <p className="text-caption text-text-tertiary">{labels.count}</p>
      </div>
      <div role="img" aria-label={labels.summary} className="relative h-16 w-full">
        {zones ? (
          zones.map((zone) => (
            <div
              key={zone.fill}
              className={`absolute top-10 h-2.5 overflow-hidden ${zone.ends}`}
              style={{ left: `${String(Math.max(0, zone.left))}%`, width: `${String(Math.max(0, Math.min(100, zone.right) - Math.max(0, zone.left)))}%` }}
            >
              <div className={`h-full w-full ${zone.fill}`} />
              <div className={`absolute inset-x-0 bottom-0 h-[3px] ${zone.edge}`} />
            </div>
          ))
        ) : (
          <div className="absolute inset-x-0 top-10 h-2.5 rounded-full bg-bg-neutral-hover" />
        )}
        {dots.map((cents, index) => (
          <span
            // Prices repeat and dots never reorder, so price plus position is the identity.
            key={`${String(cents)}-${String(index)}`}
            className={`absolute size-1.5 -translate-x-1/2 rounded-full bg-icon-secondary ${index % 2 === 0 ? 'top-6.5' : 'top-8'}`}
            style={{ left: `${String(at(cents))}%` }}
          />
        ))}
        {market && priceCents !== null && (
          <>
            <span
              className="absolute top-8 h-6.5 w-0.5 -translate-x-1/2 rounded-xs bg-text-primary"
              style={{ left: `${String(at(priceCents))}%` }}
            />
            <span
              className="absolute top-9 size-3.5 -translate-x-1/2 rounded-full border-2 border-text-primary bg-bg-elevated"
              style={{ left: `${String(at(priceCents))}%` }}
            />
            <span
              className="absolute -top-0.5 rounded-full bg-bg-inverse px-2 py-0.5 text-label-small whitespace-nowrap text-text-inverse"
              style={
                at(priceCents) > 60
                  ? { right: `${String(100 - at(priceCents) - 4)}%` }
                  : { left: `${String(Math.max(0, at(priceCents) - 8))}%` }
              }
            >
              {labels.marker(priceCents)}
            </span>
          </>
        )}
      </div>
      {market ? (
        <div className="flex justify-between text-caption">
          <span className="text-text-tertiary">{formatPrice(market.lowCents)}</span>
          <span className="text-text-secondary">{labels.average(market.medianCents)}</span>
          <span className="text-text-tertiary">{formatPrice(market.highCents)}</span>
        </div>
      ) : (
        <p className="text-caption text-text-secondary">{labels.insufficient}</p>
      )}
    </div>
  )
}
