import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStatus } from '../auth/useAuth'

export function AuthGuard() {
  const { data: status, isLoading } = useAuthStatus()
  const location = useLocation()

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

  if (!status?.authenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}
