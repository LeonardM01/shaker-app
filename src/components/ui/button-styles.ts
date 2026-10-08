type ButtonVariant = 'primary' | 'secondary' | 'tertiary'
type ButtonSize = 'large' | 'medium'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-bg-brand text-text-on-brand hover:bg-bg-brand-hover',
  secondary: 'bg-bg-neutral text-text-primary hover:bg-border-default',
  tertiary: 'text-text-brand hover:underline',
}

const sizes: Record<ButtonSize, string> = {
  large: 'h-12 px-6 text-title',
  medium: 'h-9 px-4 text-label',
}

/**
 * DESIGN.md Button: a pill. One Primary per view; Secondary never on
 * `bg/neutral`. Medium buttons keep a 44px hit area through `before:`.
 */
export function buttonStyles({
  variant,
  size = 'large',
}: {
  variant: ButtonVariant
  size?: ButtonSize
}): string {
  const hitArea = size === 'medium' ? "relative before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']" : ''
  return `inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full whitespace-nowrap transition-colors focus-ring ${variants[variant]} ${sizes[size]} ${hitArea}`
}
