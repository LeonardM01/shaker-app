/** DESIGN.md Avatar, size S: initials on light olive, never a verdict color. */
export function Avatar({ initials, label }: { initials: string; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="inline-flex size-8 items-center justify-center rounded-full bg-bg-brand-muted text-label-small text-text-primary"
    >
      <span aria-hidden>{initials}</span>
    </span>
  )
}
