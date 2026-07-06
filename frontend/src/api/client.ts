const API_KEY_KEY = 'statum.apiKey'
const TENANT_KEY = 'statum.tenantId'

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_KEY) ?? ''
}

export function setApiKey(value: string): void {
  if (value) localStorage.setItem(API_KEY_KEY, value)
  else localStorage.removeItem(API_KEY_KEY)
}

export function getTenantId(): string {
  return localStorage.getItem(TENANT_KEY) ?? ''
}

export function setTenantId(value: string): void {
  if (value) localStorage.setItem(TENANT_KEY, value)
  else localStorage.removeItem(TENANT_KEY)
}

/**
 * Ensure this browser has a tenant id, generating an unguessable one if missing.
 * Used by the no-auth sandbox so every browser is isolated to its own tenant.
 */
export function ensureTenantId(): string {
  let id = getTenantId()
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    setTenantId(id)
  }
  return id
}

export class ApiError extends Error {
  status: number
  body?: string

  constructor(message: string, status: number, body?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  const apiKey = getApiKey()
  if (apiKey) headers.set('X-API-Key', apiKey)
  const tenant = getTenantId()
  if (tenant) headers.set('X-Tenant-Id', tenant)

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  })
  if (!res.ok) {
    const body = await res.text()
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      onUnauthorized?.()
    }
    throw new ApiError(`${res.status} ${res.statusText}`, res.status, body)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}
