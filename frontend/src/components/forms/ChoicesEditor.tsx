import type { ChoiceRule } from '../../osml/types'

interface Props {
  value: ChoiceRule[]
  stateNames: string[]
  onChange: (value: ChoiceRule[]) => void
}

type ComparisonOp =
  | 'StringEquals'
  | 'NumericEquals'
  | 'NumericGreaterThan'
  | 'NumericLessThan'
  | 'BooleanEquals'

function getOp(choice: ChoiceRule): ComparisonOp {
  if (choice.NumericGreaterThan != null) return 'NumericGreaterThan'
  if (choice.NumericLessThan != null) return 'NumericLessThan'
  if (choice.NumericEquals != null) return 'NumericEquals'
  if (choice.BooleanEquals != null) return 'BooleanEquals'
  return 'StringEquals'
}

function getOpValue(choice: ChoiceRule, op: ComparisonOp): string {
  switch (op) {
    case 'NumericGreaterThan': return String(choice.NumericGreaterThan ?? '')
    case 'NumericLessThan': return String(choice.NumericLessThan ?? '')
    case 'NumericEquals': return String(choice.NumericEquals ?? '')
    case 'BooleanEquals': return String(choice.BooleanEquals ?? '')
    default: return choice.StringEquals ?? ''
  }
}

function setOpValue(op: ComparisonOp, raw: string): Partial<ChoiceRule> {
  const cleared = {
    StringEquals: undefined,
    NumericEquals: undefined,
    NumericGreaterThan: undefined,
    NumericLessThan: undefined,
    BooleanEquals: undefined,
  }
  switch (op) {
    case 'NumericGreaterThan':
      return { ...cleared, NumericGreaterThan: raw ? Number(raw) : undefined }
    case 'NumericLessThan':
      return { ...cleared, NumericLessThan: raw ? Number(raw) : undefined }
    case 'NumericEquals':
      return { ...cleared, NumericEquals: raw ? Number(raw) : undefined }
    case 'BooleanEquals':
      return { ...cleared, BooleanEquals: raw === 'true' }
    default:
      return { ...cleared, StringEquals: raw || undefined }
  }
}

export function ChoicesEditor({ value, stateNames, onChange }: Props) {
  const choices = value ?? []

  const update = (index: number, patch: Partial<ChoiceRule>) => {
    onChange(choices.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  const add = () => {
    onChange([
      ...choices,
      { Variable: '$.value', NumericGreaterThan: 0, Next: stateNames[0] ?? '' },
    ])
  }

  const remove = (index: number) => {
    onChange(choices.filter((_, i) => i !== index))
  }

  return (
    <div className="form-section">
      <div className="form-section-header">
        <strong>Choice rules</strong>
        <button type="button" onClick={add}>Add rule</button>
      </div>
      {choices.map((choice, i) => {
        const op = getOp(choice)
        return (
          <div key={i} className="form-row-group">
            <label>
              Variable (JSONPath)
              <input
                value={choice.Variable ?? ''}
                onChange={(e) => update(i, { Variable: e.target.value })}
                placeholder="$.order.total"
              />
            </label>
            <label>
              Operator
              <select
                value={op}
                onChange={(e) => {
                  const newOp = e.target.value as ComparisonOp
                  const val = getOpValue(choice, op)
                  update(i, setOpValue(newOp, val))
                }}
              >
                <option value="StringEquals">String equals</option>
                <option value="NumericEquals">Numeric equals</option>
                <option value="NumericGreaterThan">Numeric greater than</option>
                <option value="NumericLessThan">Numeric less than</option>
                <option value="BooleanEquals">Boolean equals</option>
              </select>
            </label>
            <label>
              Value
              {op === 'BooleanEquals' ? (
                <select
                  value={String(choice.BooleanEquals ?? '')}
                  onChange={(e) => update(i, setOpValue(op, e.target.value))}
                >
                  <option value="">—</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  type={op.startsWith('Numeric') ? 'number' : 'text'}
                  value={getOpValue(choice, op)}
                  onChange={(e) => update(i, setOpValue(op, e.target.value))}
                />
              )}
            </label>
            <label>
              Next state
              <select value={choice.Next ?? ''} onChange={(e) => update(i, { Next: e.target.value })}>
                <option value="">—</option>
                {stateNames.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <button type="button" className="danger" onClick={() => remove(i)}>Remove</button>
          </div>
        )
      })}
    </div>
  )
}
