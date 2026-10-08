import logoUrl from '#/assets/logo.svg'
import { shellCopy } from '#/components/ui/copy'

/** The outlined Shaker wordmark from Figma. Never retyped as live text. */
export function Logo() {
  return <img src={logoUrl} alt={shellCopy.logo} width={117.926} height={28} className="block h-7 w-auto" />
}
