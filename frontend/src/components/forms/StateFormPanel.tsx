import { useState } from 'react'
import Form from '@rjsf/core'
import type { RJSFSchema } from '@rjsf/utils'
import validator from '@rjsf/validator-ajv8'
import type { OsmlState, StateMachineDefinition } from '../../osml/types'
import {
  PLACEHOLDER_END,
  PLACEHOLDER_START,
  isPlaceholderState,
  stateTypeGlyph,
  stateTypeStyle,
} from '../../osml/toGraph'
import { ChoicesEditor } from './ChoicesEditor'
import { CatchEditor } from './CatchEditor'
import { RetryEditor } from './RetryEditor'

const commonSchema: RJSFSchema = {
  type: 'object',
  properties: {
    Comment: { type: 'string', title: 'Comment' },
    InputPath: { type: 'string', title: 'InputPath' },
    OutputPath: { type: 'string', title: 'OutputPath' },
    ResultPath: { type: 'string', title: 'ResultPath' },
    TimeoutSeconds: { type: 'integer', title: 'TimeoutSeconds' },
  },
}

const taskSchema: RJSFSchema = {
  type: 'object',
  properties: {
    ...commonSchema.properties,
    ActivityName: { type: 'string', title: 'ActivityName' },
    WaitForTaskToken: { type: 'boolean', title: 'WaitForTaskToken' },
    HeartbeatSeconds: { type: 'integer', title: 'HeartbeatSeconds' },
  },
}

const httpSchema: RJSFSchema = {
  type: 'object',
  properties: {
    ...commonSchema.properties,
    Url: { type: 'string', title: 'Url' },
    Method: { type: 'string', title: 'Method', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
    Headers: { type: 'object', title: 'Headers', additionalProperties: { type: 'string' } },
    Body: { title: 'Body' },
  },
}

const passSchema: RJSFSchema = {
  type: 'object',
  properties: {
    ...commonSchema.properties,
  },
}

const waitSchema: RJSFSchema = {
  type: 'object',
  properties: {
    ...commonSchema.properties,
    Seconds: { type: 'integer', title: 'Seconds' },
    SecondsPath: { type: 'string', title: 'SecondsPath' },
    Timestamp: { type: 'string', title: 'Timestamp (ISO-8601)' },
    TimestampPath: { type: 'string', title: 'TimestampPath' },
  },
  description: 'Set exactly one timing field: Seconds, SecondsPath, Timestamp, or TimestampPath.',
}

const failSchema: RJSFSchema = {
  type: 'object',
  properties: {
    Error: { type: 'string', title: 'Error' },
    Cause: { type: 'string', title: 'Cause' },
  },
}

const startExecSchema: RJSFSchema = {
  type: 'object',
  properties: {
    ...commonSchema.properties,
    StateMachineName: { type: 'string', title: 'StateMachineName' },
    RunMode: { type: 'string', title: 'RunMode', enum: ['async', 'sync'] },
    Next: { type: 'string', title: 'Next' },
    End: { type: 'boolean', title: 'End' },
  },
}

function schemaForState(state: OsmlState): RJSFSchema {
  switch (state.Type) {
    case 'Task': return taskSchema
    case 'Http': return httpSchema
    case 'Pass': return passSchema
    case 'Wait': return waitSchema
    case 'Fail': return failSchema
    case 'StartExecution': return startExecSchema
    default: return commonSchema
  }
}

function TransitionFields({
  state,
  stateNames,
  onChange,
}: {
  state: OsmlState
  stateNames: string[]
  onChange: (patch: Partial<OsmlState>) => void
}) {
  if (state.Type === 'Succeed' || state.Type === 'Fail') return null
  const hasEnd = 'End' in state
  const hasNext = 'Next' in state
  if (!hasEnd && !hasNext) return null

  return (
    <div className="form-section transition-fields">
      <strong>Transition</strong>
      <label className="field">
        Next state
        <select
          value={'Next' in state ? (state.Next ?? '') : ''}
          disabled={'End' in state && state.End === true}
          onChange={(e) =>
            onChange({
              Next: e.target.value || undefined,
              End: e.target.value ? false : ('End' in state ? state.End : undefined),
            } as Partial<OsmlState>)
          }
        >
          <option value="">—</option>
          {stateNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
      {hasEnd && (
        <label className="field inline-check">
          <input
            type="checkbox"
            checked={'End' in state && state.End === true}
            onChange={(e) =>
              onChange({
                End: e.target.checked,
                Next: e.target.checked ? undefined : ('Next' in state ? state.Next : undefined),
              } as Partial<OsmlState>)
            }
          />
          End execution here
        </label>
      )}
    </div>
  )
}

const TASK_RESOURCES = [
  { value: 'js', label: 'JavaScript (inline)' },
  { value: 'http', label: 'HTTP request' },
  { value: 'token', label: 'Wait for task token' },
  { value: 'activity', label: 'Activity worker' },
  { value: 'approval', label: 'Human approval' },
]

function TaskFields({
  state,
  onChange,
}: {
  state: Extract<OsmlState, { Type: 'Task' }>
  onChange: (patch: Partial<OsmlState>) => void
}) {
  return (
    <div className="form-section task-fields">
      <strong>Task configuration</strong>
      <label className="field">
        Resource
        <select
          value={state.Resource ?? 'js'}
          onChange={(e) => onChange({ Resource: e.target.value } as Partial<OsmlState>)}
        >
          {TASK_RESOURCES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </label>
      {(state.Resource === 'js' || !state.Resource) && (
        <label className="field">
          JavaScript code
          <textarea
            className="code-editor"
            rows={10}
            spellCheck={false}
            value={state.Code ?? ''}
            onChange={(e) => onChange({ Code: e.target.value } as Partial<OsmlState>)}
            placeholder="return input;"
          />
        </label>
      )}
    </div>
  )
}

function definitionsEqual(a: StateMachineDefinition, b: StateMachineDefinition): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

interface Props {
  definition: StateMachineDefinition
  selectedState: string | null
  onUpdateState: (name: string, state: OsmlState) => void
  onUpdateDefinition: (def: StateMachineDefinition) => void
}

export function StateFormPanel({
  definition,
  selectedState,
  onUpdateState,
  onUpdateDefinition,
}: Props) {
  if (!selectedState) {
    return (
      <div className="state-form empty">
        <p>Select a state on the graph to edit its properties.</p>
        <Form
          schema={{
            type: 'object',
            properties: {
              Comment: { type: 'string' },
              StartAt: { type: 'string' },
              TimeoutSeconds: { type: 'integer' },
              QueryLanguage: { type: 'string', enum: ['JSONPath', 'JSONata'] },
            },
          }}
          validator={validator}
          formData={{
            Comment: definition.Comment,
            StartAt: definition.StartAt,
            TimeoutSeconds: definition.TimeoutSeconds,
            QueryLanguage: definition.QueryLanguage,
          }}
          onChange={({ formData }) => {
            if (!formData) return
            const next = { ...definition, ...formData }
            if (!definitionsEqual(next, definition)) {
              onUpdateDefinition(next)
            }
          }}
        />
      </div>
    )
  }

  if (isPlaceholderState(selectedState)) {
    const label = selectedState === PLACEHOLDER_START ? 'Start' : 'End'
    return (
      <div className="state-form empty">
        <h3>{label}</h3>
        <p className="hint">
          Visual placeholder (like AWS Step Functions). Not stored in OSML — execution begins at{' '}
          <strong>{definition.StartAt}</strong> and ends at terminal states (Succeed, Fail, or End: true).
        </p>
      </div>
    )
  }

  const state = definition.States[selectedState]
  if (!state) return <div className="state-form empty">State not found.</div>

  const stateNames = Object.keys(definition.States)
  const typeStyle = stateTypeStyle(state.Type)
  const [tab, setTab] = useState<'config' | 'input' | 'output' | 'errors'>('config')

  const inputSchema: RJSFSchema = {
    type: 'object',
    properties: {
      InputPath: { type: 'string', title: 'InputPath' },
      Parameters: { type: 'object', title: 'Parameters' },
    },
  }

  const outputSchema: RJSFSchema = {
    type: 'object',
    properties: {
      OutputPath: { type: 'string', title: 'OutputPath' },
      ResultPath: { type: 'string', title: 'ResultPath' },
      ResultSelector: { type: 'object', title: 'ResultSelector' },
    },
  }

  return (
    <div className="state-form">
      <div className="inspector-header">
        <span
          className="inspector-badge"
          style={{ background: typeStyle.background, color: typeStyle.color, borderColor: typeStyle.border }}
          aria-hidden="true"
        >
          {stateTypeGlyph(state.Type)}
        </span>
        <div className="inspector-heading">
          <span className="inspector-type">{state.Type} state</span>
          <span className="inspector-name">{selectedState}</span>
        </div>
      </div>
      <div className="inspector-tabs" role="tablist">
        {(['config', 'input', 'output', 'errors'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t === 'config' && 'Configuration'}
            {t === 'input' && 'Input'}
            {t === 'output' && 'Output'}
            {t === 'errors' && 'Error handling'}
          </button>
        ))}
      </div>

      {tab === 'config' && (
        <>
          <Form
            schema={schemaForState(state)}
            validator={validator}
            formData={state}
            onChange={({ formData }) => {
              if (!formData) return
              const next = { ...state, ...formData, Type: state.Type } as OsmlState
              if (JSON.stringify(next) !== JSON.stringify(state)) {
                onUpdateState(selectedState, next)
              }
            }}
          />
          {state.Type === 'Task' && (
            <TaskFields
              state={state}
              onChange={(patch) => onUpdateState(selectedState, { ...state, ...patch } as OsmlState)}
            />
          )}
          <TransitionFields
            state={state}
            stateNames={stateNames}
            onChange={(patch) => onUpdateState(selectedState, { ...state, ...patch } as OsmlState)}
          />
          {state.Type === 'Choice' && (
            <>
              <ChoicesEditor
                value={state.Choices ?? []}
                stateNames={stateNames}
                onChange={(Choices) =>
                  onUpdateState(selectedState, { ...state, Choices } as OsmlState)
                }
              />
              <label className="field">
                Default
                <select
                  value={state.Default ?? ''}
                  onChange={(e) =>
                    onUpdateState(selectedState, {
                      ...state,
                      Default: e.target.value || undefined,
                    } as OsmlState)
                  }
                >
                  <option value="">—</option>
                  {stateNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          {state.Type === 'Parallel' && (
            <div className="form-section">
              <strong>Branches ({state.Branches?.length ?? 0})</strong>
              <p className="hint">Parallel branches render inside the container on the graph. Double-click to edit a branch.</p>
            </div>
          )}
          {state.Type === 'Map' && (
            <div className="form-section">
              <strong>Iterator</strong>
              <p className="hint">Map iterator renders inside the container on the graph. Double-click to edit.</p>
              <label>
                ItemsPath
                <input
                  value={state.ItemsPath ?? ''}
                  onChange={(e) =>
                    onUpdateState(selectedState, {
                      ...state,
                      ItemsPath: e.target.value || undefined,
                    } as OsmlState)
                  }
                />
              </label>
              <label>
                MaxConcurrency
                <input
                  type="number"
                  value={state.MaxConcurrency ?? ''}
                  onChange={(e) =>
                    onUpdateState(selectedState, {
                      ...state,
                      MaxConcurrency: e.target.value ? Number(e.target.value) : undefined,
                    } as OsmlState)
                  }
                />
              </label>
            </div>
          )}
        </>
      )}

      {tab === 'input' && (
        <Form
          schema={inputSchema}
          validator={validator}
          formData={{
            InputPath: state.InputPath,
            Parameters: state.Parameters,
          }}
          onChange={({ formData }) => {
            if (!formData) return
            onUpdateState(selectedState, { ...state, ...formData } as OsmlState)
          }}
        />
      )}

      {tab === 'output' && (
        <Form
          schema={outputSchema}
          validator={validator}
          formData={{
            OutputPath: state.OutputPath,
            ResultPath: state.ResultPath,
            ResultSelector: state.ResultSelector,
          }}
          onChange={({ formData }) => {
            if (!formData) return
            onUpdateState(selectedState, { ...state, ...formData } as OsmlState)
          }}
        />
      )}

      {tab === 'errors' && (
        <>
          {'Retry' in state && (
            <RetryEditor
              value={state.Retry ?? []}
              onChange={(Retry) => onUpdateState(selectedState, { ...state, Retry } as OsmlState)}
            />
          )}
          {'Catch' in state && (
            <CatchEditor
              value={state.Catch ?? []}
              stateNames={stateNames}
              onChange={(Catch) => onUpdateState(selectedState, { ...state, Catch } as OsmlState)}
            />
          )}
          {!('Retry' in state) && !('Catch' in state) && (
            <p className="hint">This state type does not support retry or catch policies.</p>
          )}
        </>
      )}
    </div>
  )
}
