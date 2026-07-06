import type { AuthStatusResponse } from '../api/types'
import { apiFetch } from '../api/client'

const BASE = '/api/auth'

export const authApi = {
  setupStatus: () => apiFetch<AuthStatusResponse>(`${BASE}/setup-status`),

  setup: (username: string, password: string, confirmPassword: string) =>
    apiFetch<AuthStatusResponse>(`${BASE}/setup`, {
      method: 'POST',
      body: JSON.stringify({ username, password, confirmPassword }),
    }),

  login: (username: string, password: string) =>
    apiFetch<AuthStatusResponse>(`${BASE}/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    apiFetch<AuthStatusResponse>(`${BASE}/logout`, { method: 'POST' }),
}
