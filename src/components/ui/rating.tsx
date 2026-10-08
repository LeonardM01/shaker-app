import { Star } from 'lucide-react'

/**
 * DESIGN.md Rating: filled stars in Golden Pollen with a deep edge, empty
 * stars outlined. Decorative: the number next to it carries the meaning.
 */
export function Rating({ stars, size = 14 }: { stars: number; size?: number }) {
  return (
    <span aria-hidden className="inline-flex shrink-0 gap-0.5">
      {[1, 2, 3, 4, 5].map((position) => (
        <Star
          key={position}
          size={size}
          strokeWidth={2}
          className={
            position <= Math.round(stars)
              ? 'fill-bg-haggle text-border-warning'
              : 'fill-transparent text-icon-secondary'
          }
        />
      ))}
    </span>
  )
}
