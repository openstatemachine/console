import { useLogin } from '../auth/useAuth'
import { ApiError } from '../api/client'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function Login() {
  const loginMutation = useLogin()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await loginMutation.mutateAsync({ username, password })
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) {
        try {
          const body = JSON.parse(err.body ?? '{}')
          setError(body.message ?? 'Invalid credentials')
        } catch {
          setError(err.status === 401 ? 'Invalid credentials' : err.message)
        }
      } else {
        setError(err instanceof Error ? err.message : 'Login failed')
      }
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Sign in</h1>
        <p className="hint">Log in with your admin account to use the OSML console.</p>
        <form onSubmit={submit}>
          <label>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn primary" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
