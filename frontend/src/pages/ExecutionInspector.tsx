import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { Modal } from '../components/Modal'
import { OsmlGraph } from '../components/OsmlGraph'
import {
  displayState,
  highlightState,
  isActiveStatus,
  isTerminalStatus,
  lifecycleActions,
  stateDetailFromHistory,
  traversedEdgesFromHistory,
  visitedStatesFromHistory,
} from '../osml/executionUtils'
import { parseOsmlJson } from '../osml/validate'
import {
  executionDurationMs,
  formatDurationMs,
  formatExecutionDuration,
  formatTimestamp,
} from '../utils/timeFormat'

export function ExecutionInspector() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [token, setToken] = useState('')
  const [taskOutput, setTaskOutput] = useState('{"approved": true}')
  const [signalName, setSignalName] = useState('')
  const [signalPayload, setSignalPayload] = useState('{}')
  const [selectedEventSeq, setSelectedEventSeq] = useState<number | null>(null)
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null)
  const [showNewRun, setShowNewRun] = useState(false)
  const [newRunInput, setNewRunInput] = useState('{}')
  const [newRunNewWindow, setNewRunNewWindow] = useState(false)
  const [newRunError, setNewRunError] = useState<string | null>(null)

  const { data: execution, refetch: refetchExec } = useQuery({
    queryKey: ['execution', id],
    queryFn: () => api.getExecution(id!),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data && isTerminalStatus(query.state.data.status) ? false : 2000,
  })

  const { data: history } = useQuery({
    queryKey: ['history', id],
    queryFn: () => api.getHistory(id!),
    enabled: !!id,
    refetchInterval: execution && isTerminalStatus(execution.status) ? false : 2000,
  })

  const { data: query } = useQuery({
    queryKey: ['query', id],
    queryFn: () => api.queryExecution(id!),
    enabled: !!id,
    refetchInterval: execution && isTerminalStatus(execution.status) ? false : 2000,
  })

  const { data: machine } = useQuery({
    queryKey: ['machine-for-exec', execution?.stateMachineName],
    queryFn: () => api.getStateMachine(execution!.stateMachineName),
    enabled: !!execution?.stateMachineName,
  })

  const definition = useMemo(() => {
    if (!machine?.osmlJson) return undefined
    return parseOsmlJson(machine.osmlJson).definition
  }, [machine?.osmlJson])

  const visitedStates = useMemo(() => visitedStatesFromHistory(history), [history])
  const traversedEdges = useMemo(() => traversedEdgesFromHistory(history), [history])

  const selectedEvent = history?.find((e) => e.seq === selectedEventSeq)
  const graphHighlight = selectedStateName
    ?? selectedEvent?.stateName
    ?? highlightState(execution, query, history)

  const stateDetail = useMemo(
    () => stateDetailFromHistory(history, selectedStateName),
    [history, selectedStateName],
  )

  const stateInfo = displayState(execution, query, history)
  const actions = execution ? lifecycleActions(execution.status) : []
  const showTaskControls = execution?.status === 'WAITING'
  const showSignalControls = execution && isActiveStatus(execution.status)
  // STANDARD workflows are async-only; the engine rejects sync starts with a 400.
  const isStandard = machine?.type === 'STANDARD'

  const openNewRun = () => {
    setNewRunInput(JSON.stringify(execution?.input ?? {}, null, 2))
    setNewRunNewWindow(false)
    setNewRunError(null)
    setShowNewRun(true)
  }

  const startNewRun = useMutation({
    mutationFn: async () => {
      if (!execution) throw new Error('Execution not loaded')
      let input: unknown
      try {
        input = JSON.parse(newRunInput)
      } catch {
        throw new Error('Input is not valid JSON')
      }
      const mode = isStandard ? 'async' : 'sync'
      return api.startExecution(execution.stateMachineName, mode, input)
    },
    onSuccess: (result) => {
      setShowNewRun(false)
      const target = `/executions/${result.executionId}`
      if (newRunNewWindow) {
        const base = `${window.location.origin}${window.location.pathname}${window.location.search}`
        window.open(`${base}#${target}`, '_blank', 'noopener')
      } else {
        navigate(target)
      }
    },
    onError: (err) => {
      setNewRunError(err instanceof Error ? err.message : 'Failed to start execution')
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['execution', id] })
    queryClient.invalidateQueries({ queryKey: ['history', id] })
    queryClient.invalidateQueries({ queryKey: ['query', id] })
  }

  const lifecycle = useMutation({
    mutationFn: (action: string) => {
      switch (action) {
        case 'stop': return api.stopExecution(id!)
        case 'pause': return api.pauseExecution(id!)
        case 'resume': return api.resumeExecution(id!)
        case 'redrive': return api.redriveExecution(id!)
        case 'restart': return api.restartExecution(id!)
        default: throw new Error('Unknown action')
      }
    },
    onSuccess: invalidate,
  })

  const completeTask = async (success: boolean) => {
    if (!token) return
    if (success) {
      await api.completeTaskSuccess(id!, token, JSON.parse(taskOutput))
    } else {
      await api.completeTaskFailure(id!, token, 'States.TaskFailed', 'manual failure')
    }
    invalidate()
  }

  const sendSignal = async () => {
    await api.sendSignal(id!, signalName, JSON.parse(signalPayload))
    invalidate()
  }

  if (!id) return null

  return (
    <div className="page inspector-page">
      <div className="page-header">
        <div>
          <p className="breadcrumb">
            <Link to="/machines">State Machines</Link>
            {' / '}
            <Link to="/executions">Executions</Link>
            {' / '}
            <span className="breadcrumb-id">{id}</span>
          </p>
          <h2>Execution details</h2>
        </div>
        <div className="toolbar">
          <button type="button" className="btn" onClick={openNewRun} disabled={!execution}>
            New run
          </button>
          <Link to={`/executions/${id}/debug`} className="btn">Open debugger</Link>
        </div>
      </div>

      {execution && (
        <div className="exec-summary card">
          <div className="exec-summary-grid">
            <div>
              <span className="exec-label">State machine</span>
              <strong>{execution.stateMachineName}</strong>
            </div>
            <div>
              <span className="exec-label">Status</span>
              <span className={`status status-${execution.status.toLowerCase()}`}>{execution.status}</span>
            </div>
            <div>
              <span className="exec-label">{stateInfo.label}</span>
              <strong>{stateInfo.state ?? '—'}</strong>
            </div>
            <div>
              <span className="exec-label">Started</span>
              <span>{formatTimestamp(execution.startedAt)}</span>
            </div>
            {execution.finishedAt && (
              <div>
                <span className="exec-label">Finished</span>
                <span>{formatTimestamp(execution.finishedAt)}</span>
              </div>
            )}
            <div>
              <span className="exec-label">Duration</span>
              <span>{formatExecutionDuration(execution.startedAt, execution.finishedAt)}</span>
            </div>
          </div>
          <div className="toolbar">
            {actions.map((a) => (
              <button key={a} type="button" onClick={() => lifecycle.mutate(a)} disabled={lifecycle.isPending}>
                {a}
              </button>
            ))}
            <button type="button" onClick={() => refetchExec()}>Refresh</button>
          </div>
        </div>
      )}

      {definition && (
        <div className="inspector-graph-wrap card">
          <div className="graph-legend">
            <span className="legend-item"><span className="legend-swatch visited" /> Executed</span>
            <span className="legend-item"><span className="legend-swatch current" /> Current / selected</span>
            <span className="legend-item"><span className="legend-swatch idle" /> Not reached</span>
          </div>
          <div className="inspector-graph">
            <OsmlGraph
              definition={definition}
              selectedState={selectedStateName ?? selectedEvent?.stateName ?? null}
              highlightState={graphHighlight}
              visitedStates={visitedStates}
              traversedEdges={traversedEdges}
              onSelectState={(name) => {
                setSelectedStateName(name)
                setSelectedEventSeq(null)
              }}
            />
          </div>
          <p className="graph-hint hint">Click a state to see its input, output, and timing.</p>
        </div>
      )}

      {selectedStateName && (
        <div className="state-detail card">
          <div className="state-detail-head">
            <div className="state-detail-title">
              <h3>{selectedStateName}</h3>
              {stateDetail?.type && <span className="type-badge">{stateDetail.type}</span>}
              {stateDetail && (
                <span className={`status status-${stateDetail.status}`}>
                  {stateDetail.status}
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-text"
              onClick={() => {
                setSelectedStateName(null)
                setSelectedEventSeq(null)
              }}
            >
              Close
            </button>
          </div>

          {!stateDetail ? (
            <p className="hint">This state has not been reached in this execution yet.</p>
          ) : (
            <>
              <div className="state-detail-meta">
                <div>
                  <span className="exec-label">Entered</span>
                  <span>{stateDetail.enteredAt ? formatTimestamp(stateDetail.enteredAt) : '—'}</span>
                </div>
                <div>
                  <span className="exec-label">Exited</span>
                  <span>{stateDetail.exitedAt ? formatTimestamp(stateDetail.exitedAt) : '—'}</span>
                </div>
                <div>
                  <span className="exec-label">Duration</span>
                  <span>
                    {stateDetail.enteredAt && stateDetail.exitedAt
                      ? formatDurationMs(
                          executionDurationMs(stateDetail.enteredAt, stateDetail.exitedAt),
                        )
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="exec-label">Attempts</span>
                  <span>{stateDetail.attempts}</span>
                </div>
                {stateDetail.next && (
                  <div>
                    <span className="exec-label">Next</span>
                    <strong>{stateDetail.next}</strong>
                  </div>
                )}
                {stateDetail.terminal && (
                  <div>
                    <span className="exec-label">Next</span>
                    <span>End</span>
                  </div>
                )}
              </div>

              {stateDetail.status === 'failed' && (stateDetail.error || stateDetail.cause) && (
                <div className="state-detail-error">
                  <span className="exec-label">Error</span>
                  <strong>{stateDetail.error ?? 'Failed'}</strong>
                  {stateDetail.cause && <pre>{stateDetail.cause}</pre>}
                </div>
              )}

              <div className="io-panels">
                <div>
                  <h4>Input</h4>
                  <pre>
                    {stateDetail.input !== undefined
                      ? JSON.stringify(stateDetail.input, null, 2)
                      : '—'}
                  </pre>
                </div>
                <div>
                  <h4>Output</h4>
                  <pre>
                    {stateDetail.output !== undefined
                      ? JSON.stringify(stateDetail.output, null, 2)
                      : stateDetail.status === 'running'
                        ? '(still running)'
                        : '—'}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="inspector-panels">
        <section className="card">
          <h3>Event history</h3>
          {(history ?? []).length === 0 ? (
            <p className="hint">No events yet.</p>
          ) : (
            <div className="timeline">
              {(history ?? []).map((e) => (
                <button
                  key={e.seq}
                  type="button"
                  className={`timeline-event${selectedEventSeq === e.seq ? ' selected' : ''}${e.stateName && visitedStates.includes(e.stateName) ? ' visited' : ''}`}
                  onClick={() => {
                    setSelectedEventSeq(e.seq === selectedEventSeq ? null : e.seq)
                    setSelectedStateName(e.stateName ?? null)
                  }}
                >
                  <div className="timeline-event-head">
                    <span className={`event-type event-type-${e.type.replace(/State.*/, '').toLowerCase()}`}>
                      {e.type}
                    </span>
                    {e.stateName && <span className="event-state">{e.stateName}</span>}
                    <small>{formatTimestamp(e.timestamp)}</small>
                  </div>
                  {e.detailsJson && selectedEventSeq === e.seq && (
                    <pre className="event-details">{e.detailsJson}</pre>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h3>Input / Output</h3>
          <div className="io-panels">
            <div>
              <h4>Input</h4>
              <pre>{JSON.stringify(execution?.input, null, 2)}</pre>
            </div>
            <div>
              <h4>Output</h4>
              <pre>{JSON.stringify(execution?.output, null, 2)}</pre>
            </div>
          </div>
        </section>

        {showTaskControls && (
          <section className="card">
            <h3>Task token</h3>
            <input placeholder="Token" value={token} onChange={(e) => setToken(e.target.value)} />
            <textarea value={taskOutput} onChange={(e) => setTaskOutput(e.target.value)} rows={4} />
            <button type="button" onClick={() => completeTask(true)}>Success</button>
            <button type="button" onClick={() => completeTask(false)}>Failure</button>
            <button type="button" onClick={() => api.taskHeartbeat(id!, token).then(invalidate)}>Heartbeat</button>
          </section>
        )}

        {showSignalControls && (
          <section className="card">
            <h3>Signal</h3>
            <input placeholder="Signal name" value={signalName} onChange={(e) => setSignalName(e.target.value)} />
            <textarea value={signalPayload} onChange={(e) => setSignalPayload(e.target.value)} rows={3} />
            <button type="button" onClick={sendSignal}>Send signal</button>
          </section>
        )}
      </div>

      {showNewRun && (
        <Modal
          title="New run"
          onClose={() => setShowNewRun(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setShowNewRun(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => startNewRun.mutate()}
                disabled={startNewRun.isPending}
              >
                {startNewRun.isPending ? 'Starting…' : 'Start run'}
              </button>
            </>
          }
        >
          <p className="hint">
            Starts a new execution of <strong>{execution?.stateMachineName}</strong>
            {isStandard ? ' (async)' : ' (sync)'} with the input below, copied from this run.
          </p>
          <label htmlFor="new-run-input">Input</label>
          <textarea
            id="new-run-input"
            value={newRunInput}
            onChange={(e) => setNewRunInput(e.target.value)}
            spellCheck={false}
          />
          <label className="modal-checkbox">
            <input
              type="checkbox"
              checked={newRunNewWindow}
              onChange={(e) => setNewRunNewWindow(e.target.checked)}
            />
            Open the new run in a new window
          </label>
          {newRunError && <p className="modal-error">{newRunError}</p>}
        </Modal>
      )}
    </div>
  )
}
