import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetup } from '../auth/useAuth'
import { ApiError } from '../api/client'

export function SetupWizard() {
  const setupMutation = useSetup()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    try {
      await setupMutation.mutateAsync({ username, password, confirmPassword })
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) {
        try {
          const body = JSON.parse(err.body ?? '{}')
          setError(body.message ?? err.message)
        } catch {
          setError(err.message)
        }
      } else {
        setError(err instanceof Error ? err.message : 'Setup failed')
      }
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome to OSML</h1>
        <p className="hint">Create the first admin account to secure this console.</p>
        <form onSubmit={submit}>
          <label>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              minLength={3}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn primary" disabled={setupMutation.isPending}>
            {setupMutation.isPending ? 'Creating…' : 'Create admin'}
          </button>
        </form>
      </div>
    </div>
  )
}
