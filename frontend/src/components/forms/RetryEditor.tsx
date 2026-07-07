import type { RetryPolicy } from '../../osml/types'

interface Props {
  value: RetryPolicy[]
  onChange: (value: RetryPolicy[]) => void
}

export function RetryEditor({ value, onChange }: Props) {
  const policies = value ?? []

  const update = (index: number, patch: Partial<RetryPolicy>) => {
    const next = policies.map((p, i) => (i === index ? { ...p, ...patch } : p))
    onChange(next)
  }

  const add = () => {
    onChange([
      ...policies,
      { ErrorEquals: ['States.ALL'], IntervalSeconds: 1, MaxAttempts: 3, BackoffRate: 2 },
    ])
  }

  const remove = (index: number) => {
    onChange(policies.filter((_, i) => i !== index))
  }

  return (
    <div className="form-section">
      <div className="form-section-header">
        <strong>Retry</strong>
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
            IntervalSeconds
            <input
              type="number"
              value={policy.IntervalSeconds ?? 1}
              onChange={(e) => update(i, { IntervalSeconds: Number(e.target.value) })}
            />
          </label>
          <label>
            IntervalSecondsPath
            <input
              value={policy.IntervalSecondsPath ?? ''}
              onChange={(e) => update(i, { IntervalSecondsPath: e.target.value || undefined })}
            />
          </label>
          <label>
            MaxAttempts
            <input
              type="number"
              value={policy.MaxAttempts ?? 3}
              onChange={(e) => update(i, { MaxAttempts: Number(e.target.value) })}
            />
          </label>
          <label>
            MaxAttemptsPath
            <input
              value={policy.MaxAttemptsPath ?? ''}
              onChange={(e) => update(i, { MaxAttemptsPath: e.target.value || undefined })}
            />
          </label>
          <label>
            BackoffRate
            <input
              type="number"
              step="0.1"
              value={policy.BackoffRate ?? 2}
              onChange={(e) => update(i, { BackoffRate: Number(e.target.value) })}
            />
          </label>
          <label>
            BackoffRatePath
            <input
              value={policy.BackoffRatePath ?? ''}
              onChange={(e) => update(i, { BackoffRatePath: e.target.value || undefined })}
            />
          </label>
          <label>
            JitterSeconds
            <input
              type="number"
              value={policy.JitterSeconds ?? ''}
              onChange={(e) => update(i, { JitterSeconds: e.target.value ? Number(e.target.value) : undefined })}
            />
          </label>
          <label>
            MaxDelaySeconds
            <input
              type="number"
              value={policy.MaxDelaySeconds ?? ''}
              onChange={(e) => update(i, { MaxDelaySeconds: e.target.value ? Number(e.target.value) : undefined })}
            />
          </label>
          <button type="button" className="danger" onClick={() => remove(i)}>Remove</button>
        </div>
      ))}
    </div>
  )
}
