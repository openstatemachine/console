import Ajv2020 from 'ajv/dist/2020'
import type { ValidateFunction } from 'ajv'
import osmlSchema from './osml-schema.json'
import type { StateMachineDefinition } from './types'

const ajv = new Ajv2020({ allErrors: true, strict: false })

let validateSchema: ValidateFunction<StateMachineDefinition> | undefined

function getValidateSchema(): ValidateFunction<StateMachineDefinition> {
  if (!validateSchema) {
    validateSchema = ajv.compile(osmlSchema) as ValidateFunction<StateMachineDefinition>
  }
  return validateSchema
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateClientSide(definition: StateMachineDefinition): ValidationResult {
  const errors: string[] = []
  const validate = getValidateSchema()
  const valid = validate(definition)
  if (!valid && validate.errors) {
    for (const err of validate.errors) {
      errors.push(`${err.instancePath || '/'}: ${err.message}`)
    }
  }
  if (!definition.StartAt) errors.push('StartAt is required')
  if (!definition.States || Object.keys(definition.States).length === 0) {
    errors.push('States map is required')
  } else if (definition.StartAt && !definition.States[definition.StartAt]) {
    errors.push(`StartAt references unknown state: ${definition.StartAt}`)
  }
  return { valid: errors.length === 0, errors }
}

export function parseOsmlJson(json: string): { definition?: StateMachineDefinition; error?: string } {
  try {
    const definition = JSON.parse(json) as StateMachineDefinition
    return { definition }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Invalid JSON' }
  }
}

export function stringifyOsml(definition: StateMachineDefinition): string {
  return JSON.stringify(definition, null, 2)
}
