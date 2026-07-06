import type { QueryClient } from '@tanstack/react-query'
import type { AuthStatusResponse } from '../api/types'
import { setUnauthorizedHandler } from '../api/client'
import { authKeys } from './authKeys'

const loggedOutStatus: AuthStatusResponse = {
  needsSetup: false,
  authenticated: false,
}

export function registerUnauthorizedHandler(queryClient: QueryClient): void {
  setUnauthorizedHandler(() => {
    const status = queryClient.getQueryData<AuthStatusResponse>(authKeys.status())
    if (status?.authDisabled) return

    queryClient.clear()
    queryClient.setQueryData(authKeys.status(), loggedOutStatus)
    window.location.hash = '#/login'
  })
}
