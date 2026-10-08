// hr-HR formatting for money and times. Money is integer cents everywhere
// else; it becomes euros only here, at render time.

const locale = 'hr-HR'

const euros = (cents: number) => cents / 100

function moneyFormat(cents: number, signDisplay: 'auto' | 'exceptZero') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    signDisplay,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

/** "340 €", "12.520 €", "9,99 €". */
export function formatPrice(cents: number): string {
  return moneyFormat(cents, 'auto').format(euros(cents))
}

/** A signed change with a true minus sign: "−40 €", "+15 €". */
export function formatPriceDelta(cents: number): string {
  return moneyFormat(cents, 'exceptZero').format(euros(cents))
}

const minuteMs = 60_000
const hourMs = 60 * minuteMs
const dayMs = 24 * hourMs

/** "prije 20 min", "prije 3 h", "prije 2 dana", relative to `now`. */
export function formatTimeAgo(date: string | Date, now: string | Date): string {
  const elapsed = new Date(now).getTime() - new Date(date).getTime()
  const format = (value: number, unit: Intl.RelativeTimeFormatUnit, style: 'short' | 'long') =>
    new Intl.RelativeTimeFormat(locale, { numeric: 'always', style }).format(-value, unit)
  if (elapsed < hourMs) return format(Math.max(1, Math.floor(elapsed / minuteMs)), 'minute', 'short')
  if (elapsed < dayMs) return format(Math.floor(elapsed / hourMs), 'hour', 'short')
  return format(Math.floor(elapsed / dayMs), 'day', 'long')
}
