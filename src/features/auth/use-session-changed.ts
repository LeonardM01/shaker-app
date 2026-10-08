import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

/**
 * Call after signing in or out: nothing fetched for the previous viewer may
 * show again. Queries on screen refetch in place (so the screen doesn't
 * suspend); every other cached query is dropped, then loaders re-run.
 */
export function useSessionChanged() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return async () => {
    queryClient.removeQueries({ type: 'inactive' })
    await queryClient.invalidateQueries()
    await router.invalidate()
  }
}
