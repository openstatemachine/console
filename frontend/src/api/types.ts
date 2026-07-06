export interface StateMachineResponse {
  id: string
  name: string
  osmlJson: string
  type: string
  createdAt: string
}

export interface StateMachineVersion {
  id: string
  name: string
  version: number
  osmlJson: string
  tenantId: string
  createdAt: string
}

export interface StateMachineAlias {
  id: string
  name: string
  alias: string
  version: number
  tenantId: string
}

export interface ExecutionResponse {
  executionId: string
  stateMachineName: string
  status: string
  input: unknown
  output: unknown
  error?: string
  cause?: string
  startedAt: string
  finishedAt?: string
}

export interface ExecutionEvent {
  seq: number
  type: string
  stateName?: string
  detailsJson?: string
  timestamp: string
}

export interface PagedExecutions {
  content: ExecutionResponse[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ValidateResponse {
  valid: boolean
  message?: string
}

export interface AuthStatusResponse {
  needsSetup: boolean
  authenticated: boolean
  username?: string
  authDisabled?: boolean
}

export interface ExecutionQuery {
  executionId: string
  status: string
  currentState?: string | null
  failedState?: string | null
  input: unknown
  output: unknown
}
