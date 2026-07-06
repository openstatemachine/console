import type { ExecutionEvent, ExecutionQuery, ExecutionResponse } from '../api/types'

const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'ABORTED'])

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status)
}

export function isActiveStatus(status: string): boolean {
  return status === 'RUNNING' || status === 'WAITING' || status === 'PAUSED'
}

/** Lifecycle controls allowed for the current execution status. */
export function lifecycleActions(status: string): string[] {
  switch (status) {
    case 'RUNNING':
    case 'WAITING':
      return ['stop', 'pause']
    case 'PAUSED':
      return ['stop', 'resume']
    case 'FAILED':
    case 'TIMED_OUT':
    case 'ABORTED':
      return ['redrive', 'restart']
    default:
      return []
  }
}

/** Ordered list of states entered during execution (AWS execution path). */
export function visitedStatesFromHistory(history: ExecutionEvent[] | undefined): string[] {
  if (!history?.length) return []
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const e of history) {
    if (e.stateName && e.type.endsWith('Entered') && e.type !== 'ExecutionStarted') {
      if (!seen.has(e.stateName)) {
        seen.add(e.stateName)
        ordered.push(e.stateName)
      }
    }
  }
  return ordered
}

export interface TraversedEdge {
  from: string
  to: string
}

/** Transitions taken during execution (for green path on graph). */
export function traversedEdgesFromHistory(history: ExecutionEvent[] | undefined): TraversedEdge[] {
  const edges: TraversedEdge[] = []
  for (const e of history ?? []) {
    if (!e.detailsJson) continue
    try {
      const details = JSON.parse(e.detailsJson) as Record<string, string>
      if (e.type === 'ExecutionStarted' && details.startAt) {
        edges.push({ from: '__start__', to: details.startAt })
      }
      if (e.type === 'StateExited' && e.stateName && details.next) {
        edges.push({ from: e.stateName, to: details.next })
      }
      if (e.type === 'ChoiceStateMatched' && e.stateName && details.next) {
        edges.push({ from: e.stateName, to: details.next })
      }
      if (e.type === 'ChoiceStateDefault' && e.stateName && details.next) {
        edges.push({ from: e.stateName, to: details.next })
      }
    } catch {
      // ignore malformed details
    }
  }
  return edges
}

/** Last state visited in history (for completed executions). */
export function lastStateFromHistory(history: ExecutionEvent[] | undefined): string | null {
  const visited = visitedStatesFromHistory(history)
  return visited.length > 0 ? visited[visited.length - 1] : null
}

export function displayState(
  execution: ExecutionResponse | undefined,
  query: ExecutionQuery | undefined,
  history: ExecutionEvent[] | undefined,
): { label: string; state: string | null } {
  if (!execution) return { label: 'Current state', state: null }

  if (query?.currentState) {
    return { label: 'Current state', state: query.currentState }
  }

  if (execution.status === 'FAILED' && query?.failedState) {
    return { label: 'Failed at', state: query.failedState }
  }

  if (isTerminalStatus(execution.status)) {
    return { label: 'Last state', state: lastStateFromHistory(history) }
  }

  return { label: 'Current state', state: null }
}

export function highlightState(
  execution: ExecutionResponse | undefined,
  query: ExecutionQuery | undefined,
  history: ExecutionEvent[] | undefined,
): string | null {
  const { state } = displayState(execution, query, history)
  return state
}

export interface StateExecutionDetail {
  stateName: string
  type?: string
  status: 'succeeded' | 'failed' | 'running'
  input?: unknown
  output?: unknown
  next?: string | null
  enteredAt?: string
  exitedAt?: string
  error?: string
  cause?: string
  attempts: number
  terminal: boolean
}

function parseDetails(json?: string): Record<string, unknown> {
  if (!json) return {}
  try {
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return {}
  }
}

/**
 * Reconstruct a single state's execution detail (AWS Step Functions-style) from the
 * journal: input from StateEntered, output/next from StateExited, error from
 * ExecutionFailed. Retries can leave duplicate StateEntered events, so the latest
 * entered/exited wins and `attempts` reflects how many times the state was entered.
 */
export function stateDetailFromHistory(
  history: ExecutionEvent[] | undefined,
  stateName: string | null,
): StateExecutionDetail | null {
  if (!stateName || !history?.length) return null

  let entered: ExecutionEvent | undefined
  let exited: ExecutionEvent | undefined
  let failed: ExecutionEvent | undefined
  let attempts = 0

  for (const e of history) {
    if (e.stateName !== stateName) continue
    if (e.type === 'StateEntered') {
      entered = e
      attempts += 1
    } else if (e.type === 'StateExited') {
      exited = e
    } else if (e.type === 'ExecutionFailed') {
      failed = e
    }
  }

  if (!entered && !exited && !failed) return null

  const enteredD = parseDetails(entered?.detailsJson)
  const exitedD = parseDetails(exited?.detailsJson)
  const failedD = parseDetails(failed?.detailsJson)

  const status: StateExecutionDetail['status'] = failed
    ? 'failed'
    : exited
      ? 'succeeded'
      : 'running'

  return {
    stateName,
    type: typeof enteredD.type === 'string' ? enteredD.type : undefined,
    status,
    input: 'effectiveInput' in enteredD ? enteredD.effectiveInput : undefined,
    output: 'output' in exitedD ? exitedD.output : undefined,
    next: typeof exitedD.next === 'string' ? exitedD.next : null,
    enteredAt: entered?.timestamp,
    exitedAt: exited?.timestamp,
    error: typeof failedD.error === 'string' ? failedD.error : undefined,
    cause: typeof failedD.cause === 'string' ? failedD.cause : undefined,
    attempts,
    terminal: exitedD.terminal === true,
  }
}
