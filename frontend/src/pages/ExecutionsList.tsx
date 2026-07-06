import { Link } from 'react-router-dom'
import { ExecutionsTable } from '../components/ExecutionsTable'

export function ExecutionsList() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="breadcrumb">
            <Link to="/machines">State Machines</Link>
            {' / '}
            Executions
          </p>
          <h2>Executions</h2>
        </div>
      </div>
      <ExecutionsTable />
    </div>
  )
}
