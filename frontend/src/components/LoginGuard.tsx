import { Navigate } from 'react-router-dom'
import { useAuthStatus } from '../auth/useAuth'

export function SetupGuard() {
  const { data: status, isLoading } = useAuthStatus()

  if (isLoading) {
    return (
      <div className="auth-page">
        <p>Loading…</p>
      </div>
    )
  }

  if (!status?.needsSetup) {
    return <Navigate to={status?.authenticated ? '/' : '/login'} replace />
  }

  return null
}

export function LoginGuard() {
  const { data: status, isLoading } = useAuthStatus()

  if (isLoading) {
    return (
      <div className="auth-page">
        <p>Loading…</p>
      </div>
    )
  }

  if (status?.needsSetup) {
    return <Navigate to="/setup" replace />
  }

  if (status?.authenticated) {
    return <Navigate to="/" replace />
  }

  return null
}
