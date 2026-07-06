import type { CatchPolicy, ChoiceRule } from './types'

const CHOICE_OPS: [keyof ChoiceRule, string][] = [
  ['StringEquals', '=='],
  ['NumericEquals', '=='],
  ['NumericGreaterThan', '>'],
  ['NumericLessThan', '<'],
  ['BooleanEquals', '=='],
]

/** Human-readable choice rule label, e.g. `$.tier == "gold"` or `Rule #1`. */
export function formatChoiceRuleLabel(rule: ChoiceRule, index: number): string {
  const variable = rule.Variable ?? '$.'
  for (const [key, op] of CHOICE_OPS) {
    const value = rule[key]
    if (value !== undefined) {
      const rhs = typeof value === 'string' ? `"${value}"` : String(value)
      return `${variable} ${op} ${rhs}`
    }
  }
  return `Rule #${index + 1}`
}

/** Catch edge label, e.g. `Catch #1` or error type list. */
export function formatCatchLabel(policy: CatchPolicy, index: number): string {
  const errors = policy.ErrorEquals
  if (errors?.length === 1 && errors[0] !== 'States.ALL') {
    return errors[0]
  }
  if (errors && errors.length > 1) {
    return `Catch #${index + 1}`
  }
  return `Catch #${index + 1}`
}
