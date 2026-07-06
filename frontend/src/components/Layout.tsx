import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStatus, useLogout } from '../auth/useAuth'

const SIDEBAR_PIN_KEY = 'statum.sidebarPinned'

const NAV_ITEMS = [
  { to: '/machines', label: 'State Machines', short: 'SM' },
  { to: '/executions', label: 'Executions', short: 'EX' },
  { to: '/settings', label: 'Settings', short: 'ST' },
] as const

function readPinned(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_PIN_KEY) === 'true'
  } catch {
    return false
  }
}

export function Layout() {
  const { data: status } = useAuthStatus()
  const logoutMutation = useLogout()
  const navigate = useNavigate()
  // Auto-collapsing sidebar: collapsed unless hovered, or pinned open by the user.
  const [pinned, setPinned] = useState(readPinned)
  const [hovered, setHovered] = useState(false)
  const collapsed = !pinned && !hovered

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_PIN_KEY, String(pinned))
    } catch {
      // ignore storage errors
    }
  }, [pinned])

  const handleLogout = async () => {
    await logoutMutation.mutateAsync()
    navigate('/login')
  }

  return (
    <div className={`app-layout${!pinned ? ' auto' : ''}${collapsed ? ' sidebar-collapsed' : ''}`}>
      <nav
        className={`sidebar${collapsed ? ' collapsed' : ''}`}
        aria-label="Main navigation"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="sidebar-header">
          {!collapsed && <h1>OSML Console</h1>}
          {collapsed && <span className="sidebar-logo" title="OSML Console">OSML</span>}
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setPinned((v) => !v)}
            aria-label={pinned ? 'Unpin sidebar (auto-collapse)' : 'Pin sidebar open'}
            aria-pressed={pinned}
            title={pinned ? 'Unpin — auto-collapse' : 'Pin sidebar open'}
          >
            {pinned ? '«' : '»'}
          </button>
        </div>
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Link to={item.to} title={item.label}>
                <span className="nav-short" aria-hidden="true">{item.short}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          {status?.authDisabled ? (
            !collapsed && <p className="user-label">Sandbox — no sign-in required</p>
          ) : (
            <>
              {status?.username && !collapsed && (
                <p className="user-label">
                  Signed in as <strong>{status.username}</strong>
                </p>
              )}
              <button
                type="button"
                className="btn logout-btn"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                title="Sign out"
              >
                {collapsed ? '⎋' : logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          )}
        </div>
      </nav>
      <main className="main-content">
        <div className="nav-toolbar">
          <button
            type="button"
            className="nav-arrow"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            title="Back"
          >
            ←
          </button>
          <button
            type="button"
            className="nav-arrow"
            onClick={() => navigate(1)}
            aria-label="Go forward"
            title="Forward"
          >
            →
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
