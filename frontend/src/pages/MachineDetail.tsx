import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { ExecutionsTable } from '../components/ExecutionsTable'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { OsmlGraph } from '../components/OsmlGraph'
import { createEmptyDefinition } from '../osml/types'
import { parseOsmlJson } from '../osml/validate'

type DetailTab = 'executions' | 'definition' | 'versions'

export function MachineDetail() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<DetailTab>('executions')
  const [actionsOpen, setActionsOpen] = useState(false)

  const { data: machine, isLoading, error } = useQuery({
    queryKey: ['statemachine', name],
    queryFn: () => api.getStateMachine(name!),
    enabled: !!name,
  })

  const { data: versions } = useQuery({
    queryKey: ['versions', name],
    queryFn: () => api.listVersions(name!),
    enabled: !!name && tab === 'versions',
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteStateMachine(name!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statemachines'] })
      navigate('/machines')
    },
  })

  const definition = machine?.osmlJson
    ? parseOsmlJson(machine.osmlJson).definition ?? createEmptyDefinition()
    : createEmptyDefinition()

  const setAlias = async () => {
    const alias = prompt('Alias name?', 'prod')
    const versionStr = prompt('Version number?', '1')
    if (!alias || !versionStr || !name) return
    await api.setAlias(name, alias, Number(versionStr))
    queryClient.invalidateQueries({ queryKey: ['versions', name] })
  }

  const copyId = () => {
    if (machine?.id) {
      void navigator.clipboard.writeText(machine.id)
    }
  }

  if (isLoading) {
    return (
      <div className="page">
        <p className="hint">Loading state machine…</p>
      </div>
    )
  }

  if (error || !machine) {
    return (
      <div className="page">
        <p className="error">{(error as Error)?.message ?? 'State machine not found'}</p>
        <Link to="/machines">Back to state machines</Link>
      </div>
    )
  }

  const encoded = encodeURIComponent(name!)

  return (
    <div className="page machine-detail">
      <div className="page-header">
        <div>
          <p className="breadcrumb">
            <Link to="/machines">State Machines</Link>
            {' / '}
            {name}
          </p>
          <div className="detail-title-row">
            <h2>{name}</h2>
            <span className="type-badge">{machine.type}</span>
          </div>
        </div>
        <div className="detail-header-actions">
          <Link to={`/machines/${encoded}/edit`} className="btn">
            Edit
          </Link>
          <div className="dropdown">
            <button
              type="button"
              className="btn"
              onClick={() => setActionsOpen((o) => !o)}
              aria-expanded={actionsOpen}
            >
              Actions ▾
            </button>
            {actionsOpen && (
              <div className="dropdown-menu">
                <button type="button" onClick={copyId}>
                  Copy ID
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm(`Delete state machine "${name}"?`)) {
                      deleteMutation.mutate()
                    }
                    setActionsOpen(false)
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          <Link to={`/machines/${encoded}/run`} className="btn primary">
            Start execution
          </Link>
        </div>
      </div>

      <div className="detail-details-card card">
        <h3>Details</h3>
        <dl className="detail-dl">
          <div>
            <dt>Name</dt>
            <dd>{machine.name}</dd>
          </div>
          <div>
            <dt>ID</dt>
            <dd className="detail-id">
              {machine.id}
              <button type="button" className="btn-icon" onClick={copyId} title="Copy">
                ⧉
              </button>
            </dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{machine.type}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className="status status-succeeded">Active</span>
            </dd>
          </div>
          <div>
            <dt>Creation date</dt>
            <dd>{new Date(machine.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
      </div>

      <div className="detail-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'executions'}
          className={tab === 'executions' ? 'active' : ''}
          onClick={() => setTab('executions')}
        >
          Executions
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'definition'}
          className={tab === 'definition' ? 'active' : ''}
          onClick={() => setTab('definition')}
        >
          Definition
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'versions'}
          className={tab === 'versions' ? 'active' : ''}
          onClick={() => setTab('versions')}
        >
          Versions
        </button>
      </div>

      <div className="detail-tab-content">
        {tab === 'executions' && (
          <ExecutionsTable
            machine={name}
            lockMachine
            startExecutionHref={`/machines/${encoded}/run`}
          />
        )}

        {tab === 'definition' && (
          <div className="detail-definition card">
            <ErrorBoundary label="Graph failed to render">
              <div className="detail-graph-wrap">
                <OsmlGraph
                  definition={definition}
                  selectedState={null}
                  onSelectState={() => {}}
                />
              </div>
            </ErrorBoundary>
          </div>
        )}

        {tab === 'versions' && (
          <div className="detail-versions card">
            <h3>Versions</h3>
            {versions && versions.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.id}>
                      <td>v{v.version}</td>
                      <td>{new Date(v.createdAt).toLocaleString()}</td>
                      <td>
                        <Link to={`/machines/${encoded}/edit`}>View in editor</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="hint">No versions yet.</p>
            )}
            <button type="button" className="btn" onClick={setAlias}>
              Set alias
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
