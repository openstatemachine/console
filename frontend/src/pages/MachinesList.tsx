import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export function MachinesList() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['statemachines'],
    queryFn: api.listStateMachines,
  })

  if (isLoading) return <p>Loading...</p>
  if (error) return <p className="error">Error: {(error as Error).message}</p>

  const machines = data ?? []

  return (
    <div className="page">
      <div className="page-header">
        <h2>State Machines</h2>
        <button type="button" className="btn primary" onClick={() => navigate('/machines/create')}>
          Create
        </button>
      </div>

      {machines.length === 0 ? (
        <div className="empty-state">
          <h3>No state machines yet</h3>
          <p>Create a workflow, save it, then run it with test input.</p>
          <ol className="empty-steps">
            <li><strong>Create</strong> — pick a name and starting template</li>
            <li><strong>Design</strong> — edit the graph in the editor, then Save</li>
            <li><strong>Run</strong> — execute with JSON input and inspect the timeline</li>
          </ol>
          <button type="button" className="btn primary" onClick={() => navigate('/machines/create')}>
            Create your first machine
          </button>
        </div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link to={`/machines/${encodeURIComponent(m.name)}`}>{m.name}</Link>
                  </td>
                  <td>{new Date(m.createdAt).toLocaleString()}</td>
                  <td className="actions-cell">
                    <Link to={`/machines/${encodeURIComponent(m.name)}/edit`}>Edit</Link>
                    {' · '}
                    <Link to={`/machines/${encodeURIComponent(m.name)}/run`}>Run</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => refetch()}>Refresh</button>
        </>
      )}
    </div>
  )
}
