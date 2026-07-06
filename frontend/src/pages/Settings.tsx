import { useState } from 'react'
import { getApiKey, getTenantId, setApiKey, setTenantId } from '../api/client'

export function Settings() {
  const [apiKey, setApiKeyState] = useState(getApiKey())
  const [tenantId, setTenantIdState] = useState(getTenantId())
  const [saved, setSaved] = useState(false)

  const save = () => {
    setApiKey(apiKey)
    setTenantId(tenantId)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page">
      <h2>Settings</h2>
      <p className="hint">
        The console uses your admin session cookie for authentication. Optionally configure an API
        key for programmatic access and a tenant ID for multi-tenancy headers.
      </p>
      <label>
        API Key (optional, for programmatic access)
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKeyState(e.target.value)}
          placeholder="Only if statum.security.api-key is configured"
        />
      </label>
      <label>
        Tenant ID
        <input
          value={tenantId}
          onChange={(e) => setTenantIdState(e.target.value)}
          placeholder="default"
        />
      </label>
      <button type="button" className="btn primary" onClick={save}>Save</button>
      {saved && <span className="saved-msg">Saved</span>}
    </div>
  )
}
