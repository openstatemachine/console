import { useEffect } from 'react'
import { queryClient } from '../queryClient'
import { registerUnauthorizedHandler } from './sessionHandler'

/** Registers the global 401 handler once at app startup. */
export function AuthSessionManager() {
  useEffect(() => {
    registerUnauthorizedHandler(queryClient)
  }, [])

  return null
}
