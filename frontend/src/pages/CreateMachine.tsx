import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MACHINE_TEMPLATES,
  type CreateMachineDraft,
  type MachineTemplateType,
  type WorkflowType,
} from '../osml/types'

const NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/

const WORKFLOW_TYPES: { id: WorkflowType; label: string; description: string }[] = [
  {
    id: 'STANDARD',
    label: 'Standard',
    description: 'Durable, async execution with full history. Best for long-running workflows.',
  },
  {
    id: 'EXPRESS',
    label: 'Express',
    description: 'Runs in-process to completion. Supports sync runs — great for short, high-volume flows.',
  },
]

export function CreateMachine() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [template, setTemplate] = useState<MachineTemplateType>('empty')
  const [workflowType, setWorkflowType] = useState<WorkflowType>('STANDARD')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters')
      return
    }
    if (!NAME_PATTERN.test(trimmed)) {
      setError('Use letters, numbers, hyphens, underscores; must start with a letter')
      return
    }
    const draft: CreateMachineDraft = { name: trimmed, template, workflowType }
    sessionStorage.setItem('statum.createDraft', JSON.stringify(draft))
    navigate('/machines/new/edit', { state: draft })
  }

  return (
    <div className="page create-machine-page">
      <div className="page-header">
        <h2>Create state machine</h2>
        <Link to="/machines" className="btn">Cancel</Link>
      </div>

      <form className="create-machine-form" onSubmit={submit}>
        <div className="flow-banner">
          <strong>Step 1 — Name & template.</strong> Choose an identifier and starting shape, then
          continue to the visual editor.
        </div>

        <section className="create-section">
          <h3>Name</h3>
          <p className="hint">Unique identifier for this workflow (e.g. order-processing).</p>
          <input
            autoFocus
            placeholder="my-workflow"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </section>

        <section className="create-section">
          <h3>Template</h3>
          <p className="hint">Starting shape for the graph — you can change everything in the editor.</p>
          <div className="template-grid">
            {MACHINE_TEMPLATES.map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                className={`template-card${template === t.id ? ' selected' : ''}`}
                onClick={() => setTemplate(t.id)}
                onKeyDown={(e) => e.key === 'Enter' && setTemplate(t.id)}
              >
                <span className="template-label">{t.label}</span>
                <span className="template-desc">{t.description}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="create-section">
          <h3>Workflow type</h3>
          <p className="hint">How executions run. This is fixed once the workflow is created.</p>
          <div className="template-grid">
            {WORKFLOW_TYPES.map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                className={`template-card${workflowType === t.id ? ' selected' : ''}`}
                onClick={() => setWorkflowType(t.id)}
                onKeyDown={(e) => e.key === 'Enter' && setWorkflowType(t.id)}
              >
                <span className="template-label">{t.label}</span>
                <span className="template-desc">{t.description}</span>
              </div>
            ))}
          </div>
        </section>

        {error && <p className="error">{error}</p>}

        <div className="create-actions">
          <button type="submit" className="btn primary">
            Continue to editor
          </button>
        </div>
      </form>
    </div>
  )
}
