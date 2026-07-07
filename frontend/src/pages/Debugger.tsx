import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { OsmlGraphLazy } from '../components/OsmlGraphLazy'
import { displayState, highlightState, isTerminalStatus } from '../osml/executionUtils'
import { parseOsmlJson } from '../osml/validate'
import { formatExecutionDuration, formatTimestamp } from '../utils/timeFormat'

export function Debugger() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: execution } = useQuery({
    queryKey: ['execution', id],
    queryFn: () => api.getExecution(id!),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data && isTerminalStatus(query.state.data.status) ? false : 1000,
  })

  const { data: query } = useQuery({
    queryKey: ['query', id],
    queryFn: () => api.queryExecution(id!),
    enabled: !!id,
    refetchInterval: execution && isTerminalStatus(execution.status) ? false : 1000,
  })

  const { data: history } = useQuery({
    queryKey: ['history', id],
    queryFn: () => api.getHistory(id!),
    enabled: !!id,
    refetchInterval: execution && isTerminalStatus(execution.status) ? false : 1000,
  })

  const { data: machine } = useQuery({
    queryKey: ['machine-for-debug', execution?.stateMachineName],
    queryFn: () => api.getStateMachine(execution!.stateMachineName),
    enabled: !!execution?.stateMachineName,
  })

  const definition = useMemo(() => {
    if (!machine?.osmlJson) return undefined
    return parseOsmlJson(machine.osmlJson).definition
  }, [machine?.osmlJson])

  const stateInfo = displayState(execution, query, history)
  const graphHighlight = highlightState(execution, query, history)
  const canDebug = execution && !isTerminalStatus(execution.status)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['execution', id] })
    queryClient.invalidateQueries({ queryKey: ['history', id] })
    queryClient.invalidateQueries({ queryKey: ['query', id] })
  }

  const debugPause = useMutation({
    mutationFn: () => api.debugPause(id!),
    onSuccess: invalidate,
  })

  const debugStep = useMutation({
    mutationFn: () => api.debugStep(id!),
    onSuccess: invalidate,
  })

  if (!id) return null

  return (
    <div className="page debugger-page">
      <div className="page-header">
        <h2>Debugger — {id.slice(0, 8)}…</h2>
        <Link to={`/executions/${id}`}>Back to inspector</Link>
      </div>

      {canDebug && (
        <div className="toolbar">
          <button type="button" onClick={() => debugPause.mutate()} disabled={debugPause.isPending}>
            Enable debug pause
          </button>
          <button type="button" className="btn primary" onClick={() => debugStep.mutate()} disabled={debugStep.isPending}>
            Step
          </button>
        </div>
      )}

      {execution && (
        <p>
          Status: <strong>{execution.status}</strong>
          {' · '}
          {stateInfo.label}: <strong>{stateInfo.state ?? '—'}</strong>
          {' · '}
          Duration: <strong>{formatExecutionDuration(execution.startedAt, execution.finishedAt)}</strong>
        </p>
      )}

      {definition && (
        <div className="debugger-graph">
          <OsmlGraphLazy
            definition={definition}
            selectedState={graphHighlight}
            highlightState={graphHighlight}
            onSelectState={() => {}}
          />
        </div>
      )}

      <section>
        <h3>Recent events</h3>
        <div className="timeline">
          {(history ?? []).slice(-10).map((e) => (
            <div key={e.seq} className="timeline-event">
              <strong>{e.type}</strong> {e.stateName && `— ${e.stateName}`}
              <small> {formatTimestamp(e.timestamp)}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
