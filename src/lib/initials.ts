/** Up to two initials from a name's words, letters and digits only ("-MixSHOP- d.o.o." → "MD"). */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .flatMap((word) => word.match(/[\p{L}\p{N}]/u)?.[0] ?? [])
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('hr-HR')
}
