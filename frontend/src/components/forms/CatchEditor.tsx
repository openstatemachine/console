import type { CatchPolicy } from '../../osml/types'

interface Props {
  value: CatchPolicy[]
  stateNames: string[]
  onChange: (value: CatchPolicy[]) => void
}

export function CatchEditor({ value, stateNames, onChange }: Props) {
  const policies = value ?? []

  const update = (index: number, patch: Partial<CatchPolicy>) => {
    const next = policies.map((p, i) => (i === index ? { ...p, ...patch } : p))
    onChange(next)
  }

  const add = () => {
    onChange([...policies, { ErrorEquals: ['States.ALL'], Next: stateNames[0] ?? '' }])
  }

  const remove = (index: number) => {
    onChange(policies.filter((_, i) => i !== index))
  }

  return (
    <div className="form-section">
      <div className="form-section-header">
        <strong>Catch</strong>
        <button type="button" onClick={add}>Add</button>
      </div>
      {policies.map((policy, i) => (
        <div key={i} className="form-row-group">
          <label>
            ErrorEquals (comma-separated)
            <input
              value={(policy.ErrorEquals ?? []).join(', ')}
              onChange={(e) =>
                update(i, {
                  ErrorEquals: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
            />
          </label>
          <label>
            Next
            <select value={policy.Next ?? ''} onChange={(e) => update(i, { Next: e.target.value })}>
              <option value="">—</option>
              {stateNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            ResultPath
            <input
              value={policy.ResultPath ?? ''}
              onChange={(e) => update(i, { ResultPath: e.target.value || undefined })}
            />
          </label>
          <button type="button" className="danger" onClick={() => remove(i)}>Remove</button>
        </div>
      ))}
    </div>
  )
}
