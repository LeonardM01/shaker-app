/**
 * DESIGN.md Avatar, size S: initials on light olive, never a verdict color.
 * Decorative: the control around it carries the accessible name.
 */
export function Avatar({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-8 items-center justify-center rounded-full bg-bg-brand-muted text-label-small text-text-primary"
    >
      {initials}
    </span>
  )
}
