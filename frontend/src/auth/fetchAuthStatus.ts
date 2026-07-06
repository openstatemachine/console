import type { AuthStatusResponse } from '../api/types'
import { ApiError, ensureTenantId } from '../api/client'
import { authApi } from './authApi'

/** Fetches auth status; ensures sandbox tenant id when auth is disabled. */
export async function fetchAuthStatus(): Promise<AuthStatusResponse> {
  try {
    const status = await authApi.setupStatus()
    if (status.authDisabled) ensureTenantId()
    return status
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      return { needsSetup: false, authenticated: false }
    }
    throw e
  }
}
