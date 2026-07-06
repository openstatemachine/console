import { apiFetch } from './client'
import type {
  ExecutionEvent,
  ExecutionQuery,
  ExecutionResponse,
  PagedExecutions,
  StateMachineAlias,
  StateMachineResponse,
  StateMachineVersion,
  ValidateResponse,
} from './types'

const BASE = '/api'

export const api = {
  listStateMachines: () => apiFetch<StateMachineResponse[]>(`${BASE}/statemachines`),

  getStateMachine: (name: string) =>
    apiFetch<StateMachineResponse>(`${BASE}/statemachines/${encodeURIComponent(name)}`),

  createStateMachine: (name: string, osmlJson: string, type?: string) =>
    apiFetch<StateMachineResponse>(`${BASE}/statemachines`, {
      method: 'POST',
      body: JSON.stringify({ name, osmlJson, type }),
    }),

  updateStateMachine: (name: string, osmlJson: string) =>
    apiFetch<StateMachineVersion>(`${BASE}/statemachines/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify({ name, osmlJson }),
    }),

  deleteStateMachine: (name: string) =>
    apiFetch<void>(`${BASE}/statemachines/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  validateStateMachine: (osmlJson: string, name = 'draft') =>
    apiFetch<ValidateResponse>(`${BASE}/statemachines/validate`, {
      method: 'POST',
      body: JSON.stringify({ name, osmlJson }),
    }),

  listVersions: (name: string) =>
    apiFetch<StateMachineVersion[]>(
      `${BASE}/statemachines/${encodeURIComponent(name)}/versions`,
    ),

  setAlias: (name: string, alias: string, version: number) =>
    apiFetch<StateMachineAlias>(
      `${BASE}/statemachines/${encodeURIComponent(name)}/aliases/${encodeURIComponent(alias)}?version=${version}`,
      { method: 'PUT' },
    ),

  startExecution: (name: string, mode: 'sync' | 'async', input: unknown, callbackUrl?: string) =>
    apiFetch<ExecutionResponse>(
      `${BASE}/statemachines/${encodeURIComponent(name)}/executions?mode=${mode}`,
      {
        method: 'POST',
        body: JSON.stringify({ input, callbackUrl }),
      },
    ),

  listExecutions: (params?: { machine?: string; status?: string; page?: number; size?: number }) => {
    const q = new URLSearchParams()
    if (params?.machine) q.set('machine', params.machine)
    if (params?.status) q.set('status', params.status)
    if (params?.page != null) q.set('page', String(params.page))
    if (params?.size != null) q.set('size', String(params.size))
    const qs = q.toString()
    return apiFetch<PagedExecutions>(`${BASE}/executions${qs ? `?${qs}` : ''}`)
  },

  getExecution: (id: string) => apiFetch<ExecutionResponse>(`${BASE}/executions/${id}`),

  getHistory: (id: string) => apiFetch<ExecutionEvent[]>(`${BASE}/executions/${id}/history`),

  queryExecution: (id: string) => apiFetch<ExecutionQuery>(`${BASE}/executions/${id}/query`),

  stopExecution: (id: string) =>
    apiFetch<ExecutionResponse>(`${BASE}/executions/${id}/stop`, { method: 'POST' }),

  pauseExecution: (id: string) =>
    apiFetch<ExecutionResponse>(`${BASE}/executions/${id}/pause`, { method: 'POST' }),

  resumeExecution: (id: string) =>
    apiFetch<ExecutionResponse>(`${BASE}/executions/${id}/resume`, { method: 'POST' }),

  redriveExecution: (id: string) =>
    apiFetch<ExecutionResponse>(`${BASE}/executions/${id}/redrive`, { method: 'POST' }),

  restartExecution: (id: string) =>
    apiFetch<ExecutionResponse>(`${BASE}/executions/${id}/restart`, { method: 'POST' }),

  debugPause: (id: string) =>
    apiFetch<ExecutionResponse>(`${BASE}/executions/${id}/debug/pause`, { method: 'POST' }),

  debugStep: (id: string) =>
    apiFetch<ExecutionResponse>(`${BASE}/executions/${id}/debug/step`, { method: 'POST' }),

  completeTaskSuccess: (executionId: string, token: string, output: unknown) =>
    apiFetch<{ status: string }>(`${BASE}/executions/${executionId}/tasks/${token}/success`, {
      method: 'POST',
      body: JSON.stringify({ output }),
    }),

  completeTaskFailure: (executionId: string, token: string, error: string, cause: string) =>
    apiFetch<{ status: string }>(`${BASE}/executions/${executionId}/tasks/${token}/failure`, {
      method: 'POST',
      body: JSON.stringify({ error, cause }),
    }),

  taskHeartbeat: (executionId: string, token: string) =>
    apiFetch<{ status: string }>(`${BASE}/executions/${executionId}/tasks/${token}/heartbeat`, {
      method: 'POST',
    }),

  sendSignal: (executionId: string, name: string, payload: unknown) =>
    apiFetch<{ status: string }>(`${BASE}/executions/${executionId}/signal`, {
      method: 'POST',
      body: JSON.stringify({ name, payload }),
    }),

  listSignals: (executionId: string) =>
    apiFetch<unknown[]>(`${BASE}/executions/${executionId}/signals`),
}
