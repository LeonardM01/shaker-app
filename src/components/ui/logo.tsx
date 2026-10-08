import logoUrl from '#/assets/logo.svg'
import { shellCopy } from '#/components/ui/copy'

/** The Vrijedi.Ly logo from the landing page, wordmark outlined. Never retyped as live text. */
export function Logo() {
  return <img src={logoUrl} alt={shellCopy.logo} width={134.03} height={30} className="block h-7 w-auto" />
}
