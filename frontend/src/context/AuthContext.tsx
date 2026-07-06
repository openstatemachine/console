import type { ReactNode } from 'react'
import { AuthSessionManager } from '../auth/AuthSessionManager'

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthSessionManager />
      {children}
    </>
  )
}
