import type { ChoiceRule } from '../../osml/types'

interface Props {
  value: ChoiceRule[]
  stateNames: string[]
  onChange: (value: ChoiceRule[]) => void
}

type ComparisonOp =
  | 'StringEquals'
  | 'StringLessThanEquals'
  | 'StringGreaterThanEquals'
  | 'StringMatches'
  | 'NumericEquals'
  | 'NumericGreaterThan'
  | 'NumericLessThan'
  | 'NumericLessThanEquals'
  | 'NumericGreaterThanEquals'
  | 'BooleanEquals'

type TypeCheckOp =
  | 'IsPresent'
  | 'IsNull'
  | 'IsString'
  | 'IsNumeric'
  | 'IsBoolean'
  | 'IsTimestamp'

function isTypeCheck(choice: ChoiceRule): boolean {
  return choice.IsPresent != null
    || choice.IsNull != null
    || choice.IsString != null
    || choice.IsNumeric != null
    || choice.IsBoolean != null
    || choice.IsTimestamp != null
}

function getTypeCheckOp(choice: ChoiceRule): TypeCheckOp {
  if (choice.IsPresent != null) return 'IsPresent'
  if (choice.IsNull != null) return 'IsNull'
  if (choice.IsString != null) return 'IsString'
  if (choice.IsNumeric != null) return 'IsNumeric'
  if (choice.IsBoolean != null) return 'IsBoolean'
  return 'IsTimestamp'
}

function getOp(choice: ChoiceRule): ComparisonOp {
  if (choice.StringMatches != null) return 'StringMatches'
  if (choice.StringLessThanEquals != null) return 'StringLessThanEquals'
  if (choice.StringGreaterThanEquals != null) return 'StringGreaterThanEquals'
  if (choice.NumericLessThanEquals != null) return 'NumericLessThanEquals'
  if (choice.NumericGreaterThanEquals != null) return 'NumericGreaterThanEquals'
  if (choice.NumericGreaterThan != null) return 'NumericGreaterThan'
  if (choice.NumericLessThan != null) return 'NumericLessThan'
  if (choice.NumericEquals != null) return 'NumericEquals'
  if (choice.BooleanEquals != null) return 'BooleanEquals'
  return 'StringEquals'
}

function getOpValue(choice: ChoiceRule, op: ComparisonOp): string {
  switch (op) {
    case 'StringMatches': return choice.StringMatches ?? ''
    case 'StringLessThanEquals': return choice.StringLessThanEquals ?? ''
    case 'StringGreaterThanEquals': return choice.StringGreaterThanEquals ?? ''
    case 'NumericLessThanEquals': return String(choice.NumericLessThanEquals ?? '')
    case 'NumericGreaterThanEquals': return String(choice.NumericGreaterThanEquals ?? '')
    case 'NumericGreaterThan': return String(choice.NumericGreaterThan ?? '')
    case 'NumericLessThan': return String(choice.NumericLessThan ?? '')
    case 'NumericEquals': return String(choice.NumericEquals ?? '')
    case 'BooleanEquals': return String(choice.BooleanEquals ?? '')
    default: return choice.StringEquals ?? ''
  }
}

function clearComparisonFields(): Partial<ChoiceRule> {
  return {
    StringEquals: undefined,
    StringLessThanEquals: undefined,
    StringGreaterThanEquals: undefined,
    StringMatches: undefined,
    NumericEquals: undefined,
    NumericGreaterThan: undefined,
    NumericLessThan: undefined,
    NumericLessThanEquals: undefined,
    NumericGreaterThanEquals: undefined,
    BooleanEquals: undefined,
    IsPresent: undefined,
    IsNull: undefined,
    IsString: undefined,
    IsNumeric: undefined,
    IsBoolean: undefined,
    IsTimestamp: undefined,
  }
}

function setOpValue(op: ComparisonOp, raw: string): Partial<ChoiceRule> {
  const cleared = clearComparisonFields()
  switch (op) {
    case 'StringMatches':
      return { ...cleared, StringMatches: raw || undefined }
    case 'StringLessThanEquals':
      return { ...cleared, StringLessThanEquals: raw || undefined }
    case 'StringGreaterThanEquals':
      return { ...cleared, StringGreaterThanEquals: raw || undefined }
    case 'NumericLessThanEquals':
      return { ...cleared, NumericLessThanEquals: raw ? Number(raw) : undefined }
    case 'NumericGreaterThanEquals':
      return { ...cleared, NumericGreaterThanEquals: raw ? Number(raw) : undefined }
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

function setTypeCheckOp(op: TypeCheckOp, value: boolean): Partial<ChoiceRule> {
  const cleared = clearComparisonFields()
  switch (op) {
    case 'IsPresent': return { ...cleared, IsPresent: value }
    case 'IsNull': return { ...cleared, IsNull: value }
    case 'IsString': return { ...cleared, IsString: value }
    case 'IsNumeric': return { ...cleared, IsNumeric: value }
    case 'IsBoolean': return { ...cleared, IsBoolean: value }
    default: return { ...cleared, IsTimestamp: value }
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
        const typeCheck = isTypeCheck(choice)
        const op = getOp(choice)
        const typeCheckOp = getTypeCheckOp(choice)
        return (
          <div key={i} className="form-row-group">
            <label>
              Mode
              <select
                value={typeCheck ? 'type' : 'compare'}
                onChange={(e) => {
                  if (e.target.value === 'type') {
                    update(i, setTypeCheckOp('IsPresent', true))
                  } else {
                    update(i, { ...clearComparisonFields(), Variable: choice.Variable ?? '$.value', StringEquals: 'ok' })
                  }
                }}
              >
                <option value="compare">Compare</option>
                <option value="type">Type check</option>
              </select>
            </label>
            {!typeCheck && (
              <>
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
                    <option value="StringLessThanEquals">String less than or equals</option>
                    <option value="StringGreaterThanEquals">String greater than or equals</option>
                    <option value="StringMatches">String matches (regex)</option>
                    <option value="NumericEquals">Numeric equals</option>
                    <option value="NumericGreaterThan">Numeric greater than</option>
                    <option value="NumericLessThan">Numeric less than</option>
                    <option value="NumericLessThanEquals">Numeric less than or equals</option>
                    <option value="NumericGreaterThanEquals">Numeric greater than or equals</option>
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
              </>
            )}
            {typeCheck && (
              <>
                <label>
                  Variable (JSONPath)
                  <input
                    value={choice.Variable ?? ''}
                    onChange={(e) => update(i, { Variable: e.target.value })}
                    placeholder="$.timestamp"
                  />
                </label>
                <label>
                  Type check
                  <select
                    value={typeCheckOp}
                    onChange={(e) => update(i, setTypeCheckOp(e.target.value as TypeCheckOp, true))}
                  >
                    <option value="IsPresent">Is present</option>
                    <option value="IsNull">Is null</option>
                    <option value="IsString">Is string</option>
                    <option value="IsNumeric">Is numeric</option>
                    <option value="IsBoolean">Is boolean</option>
                    <option value="IsTimestamp">Is timestamp</option>
                  </select>
                </label>
              </>
            )}
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
