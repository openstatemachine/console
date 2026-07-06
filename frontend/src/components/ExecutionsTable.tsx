import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { api } from '../api'
import { formatExecutionDuration, formatTimestamp } from '../utils/timeFormat'

const STATUSES = ['', 'RUNNING', 'WAITING', 'PAUSED', 'SUCCEEDED', 'FAILED', 'TIMED_OUT', 'ABORTED']

interface Props {
  /** Pre-filter by machine name (used on machine detail page). */
  machine?: string
  /** When true, hide the machine filter input. */
  lockMachine?: boolean
  /** Show a Start execution link in the toolbar. */
  startExecutionHref?: string
}

export function ExecutionsTable({ machine: machineProp, lockMachine, startExecutionHref }: Props) {
  const [machineFilter, setMachineFilter] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)

  const machine = lockMachine ? machineProp : machineFilter || machineProp

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['executions', machine, status, page],
    queryFn: () =>
      api.listExecutions({
        machine: machine || undefined,
        status: status || undefined,
        page,
        size: 25,
      }),
    refetchInterval: (query) => {
      const content = query.state.data?.content ?? []
      return content.some((e) => e.status === 'RUNNING' || e.status === 'WAITING') ? 3000 : false
    },
  })

  const total = data?.totalElements ?? 0
  const shown = data?.content.length ?? 0

  return (
    <div className="executions-table-panel">
      <div className="executions-table-header">
        <h3>
          Executions ({shown}/{total})
        </h3>
        <div className="executions-table-actions">
          <button type="button" className="btn-icon" onClick={() => refetch()} title="Refresh">
            ↻
          </button>
          {startExecutionHref && (
            <Link to={startExecutionHref} className="btn btn-start">
              Start execution
            </Link>
          )}
        </div>
      </div>

      <div className="filters">
        {!lockMachine && (
          <input
            placeholder="Filter executions by property or value"
            value={machineFilter}
            onChange={(e) => {
              setMachineFilter(e.target.value)
              setPage(0)
            }}
          />
        )}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(0)
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || 'All'}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="hint">Loading…</p>}
      {error && <p className="error">{(error as Error).message}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Start Time (local)</th>
            <th>End Time (local)</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {(data?.content ?? []).length === 0 && !isLoading ? (
            <tr>
              <td colSpan={5} className="empty-cell">
                <p>No executions</p>
                {startExecutionHref && (
                  <Link to={startExecutionHref}>Start execution</Link>
                )}
              </td>
            </tr>
          ) : (
            (data?.content ?? []).map((e) => (
              <tr key={e.executionId}>
                <td>
                  <Link to={`/executions/${e.executionId}`}>{e.executionId}</Link>
                </td>
                <td>
                  <span className={`status status-${e.status.toLowerCase()}`}>{e.status}</span>
                </td>
                <td>{formatTimestamp(e.startedAt)}</td>
                <td>{e.finishedAt ? formatTimestamp(e.finishedAt) : '—'}</td>
                <td>{formatExecutionDuration(e.startedAt, e.finishedAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {data && data.totalPages > 0 && (
        <div className="pagination">
          <span className="pagination-info">
            {total} match{total === 1 ? '' : 'es'}
          </span>
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ‹
          </button>
          <span>
            {page + 1} / {data.totalPages || 1}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
