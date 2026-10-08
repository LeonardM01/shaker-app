import { useNavigate } from '@tanstack/react-router'

import { startCheckFn } from '#/features/report/check.functions'

/**
 * Starts a fresh check of `url` from a click ("Provjeri ponovo", "Pokušaj
 * ponovo") and opens its progress. A forced check is an action, never a side
 * effect of loading a URL, so reloads and preloads can't start another one.
 */
export function useStartCheck() {
  const navigate = useNavigate()
  return async (url: string) => {
    const started = await startCheckFn({ data: { url, force: true } })
    await (started.kind === 'report'
      ? navigate({ to: '/app/listing/$listingId', params: { listingId: started.listingId } })
      : navigate({ to: '/app/checks/$checkId', params: { checkId: started.checkId } }))
  }
}
