import { createDefaultState, type ChoiceState, type OsmlState, type StateMachineDefinition } from './types'
import { PLACEHOLDER_END, PLACEHOLDER_START, type EdgeData } from './toGraph'

const NEXT_TYPES = new Set(['Task', 'Pass', 'Wait', 'Parallel', 'Map', 'StartExecution'])

function supportsNext(type: string): boolean {
  return NEXT_TYPES.has(type)
}

function isTerminalType(type: string): boolean {
  return type === 'Succeed' || type === 'Fail'
}

function cloneDef(def: StateMachineDefinition): StateMachineDefinition {
  return { ...def, States: { ...def.States } }
}

export function uniqueStateName(def: StateMachineDefinition, base: string): string {
  let name = base
  let i = 2
  while (def.States[name]) {
    name = `${base}${i++}`
  }
  return name
}

/** Point a state's transition (identified by the edge) at a new target name. */
function rewireSource(def: StateMachineDefinition, edge: EdgeData, toName: string): void {
  switch (edge.kind) {
    case 'start': {
      def.StartAt = toName
      return
    }
    case 'next': {
      const s = { ...def.States[edge.sourceState] } as OsmlState & { Next?: string; End?: boolean }
      s.Next = toName
      if ('End' in s) s.End = false
      def.States[edge.sourceState] = s
      return
    }
    case 'terminal': {
      const s = { ...def.States[edge.sourceState] } as OsmlState & { Next?: string; End?: boolean }
      s.End = false
      s.Next = toName
      def.States[edge.sourceState] = s
      return
    }
    case 'default': {
      const s = { ...def.States[edge.sourceState] } as ChoiceState
      def.States[edge.sourceState] = { ...s, Default: toName }
      return
    }
    case 'choice': {
      const s = { ...def.States[edge.sourceState] } as ChoiceState
      const choices = [...(s.Choices ?? [])]
      if (edge.index != null && choices[edge.index]) {
        choices[edge.index] = { ...choices[edge.index], Next: toName }
      }
      def.States[edge.sourceState] = { ...s, Choices: choices }
      return
    }
    case 'catch': {
      const s = { ...def.States[edge.sourceState] } as OsmlState & { Catch?: { Next?: string }[] }
      const list = [...(s.Catch ?? [])]
      if (edge.index != null && list[edge.index]) {
        list[edge.index] = { ...list[edge.index], Next: toName }
      }
      def.States[edge.sourceState] = { ...s, Catch: list } as OsmlState
      return
    }
  }
}

/** Insert a brand-new state of `type` onto an existing edge (source → target). */
export function insertStateOnEdge(
  def: StateMachineDefinition,
  edge: EdgeData,
  newName: string,
  type: string,
): StateMachineDefinition {
  const next = cloneDef(def)
  const newState = createDefaultState(type) as OsmlState & { Next?: string; End?: boolean }

  if (supportsNext(type)) {
    if (edge.targetState === PLACEHOLDER_END || edge.kind === 'terminal') {
      newState.End = true
      delete newState.Next
    } else {
      newState.Next = edge.targetState
      newState.End = false
    }
  }

  next.States[newName] = newState
  rewireSource(next, edge, newName)
  return next
}

/** Create a transition from source → target via a drag-connect gesture. */
export function connectStates(
  def: StateMachineDefinition,
  source: string,
  target: string,
): StateMachineDefinition {
  if (source === target) return def
  const next = cloneDef(def)

  if (source === PLACEHOLDER_START) {
    if (target !== PLACEHOLDER_END && next.States[target]) {
      next.StartAt = target
      return next
    }
    return def
  }

  const src = next.States[source]
  if (!src || isTerminalType(src.Type)) return def

  if (target === PLACEHOLDER_END) {
    if (supportsNext(src.Type)) {
      const s = { ...src } as OsmlState & { Next?: string; End?: boolean }
      delete s.Next
      s.End = true
      next.States[source] = s
    }
    return next
  }

  if (!next.States[target]) return def

  if (src.Type === 'Choice') {
    const s = { ...src } as ChoiceState
    const choices = [...(s.Choices ?? [])]
    choices.push({ Variable: '$.value', StringEquals: 'CHANGE_ME', Next: target })
    next.States[source] = { ...s, Choices: choices }
    return next
  }

  const s = { ...src } as OsmlState & { Next?: string; End?: boolean }
  s.Next = target
  if ('End' in s) s.End = false
  next.States[source] = s
  return next
}

/** Find who currently transitions into `name` and repoint them to `name`'s successor (bypass). */
function bypassState(def: StateMachineDefinition, name: string): void {
  const successor = (def.States[name] as { Next?: string }).Next
  const target = successor ?? undefined

  if (def.StartAt === name && target) {
    def.StartAt = target
  }

  for (const [key, state] of Object.entries(def.States)) {
    if (key === name) continue
    const s = state as OsmlState & {
      Next?: string
      Default?: string
      Choices?: { Next?: string }[]
      Catch?: { Next?: string }[]
    }
    let changed = false
    const copy = { ...s } as typeof s
    if (s.Next === name) {
      copy.Next = target
      changed = true
    }
    if (s.Type === 'Choice') {
      if (s.Choices?.some((c) => c.Next === name)) {
        copy.Choices = s.Choices.map((c) => (c.Next === name ? { ...c, Next: target } : c))
        changed = true
      }
      if (s.Default === name) {
        copy.Default = target
        changed = true
      }
    }
    if (s.Catch?.some((c) => c.Next === name)) {
      copy.Catch = s.Catch.map((c) => (c.Next === name ? { ...c, Next: target } : c))
      changed = true
    }
    if (changed) def.States[key] = copy as OsmlState
  }
}

/** Move an existing state so it sits on the given edge (source → target). */
export function reorderStateOntoEdge(
  def: StateMachineDefinition,
  stateName: string,
  edge: EdgeData,
): StateMachineDefinition {
  if (stateName === edge.sourceState || stateName === edge.targetState) return def
  const state = def.States[stateName]
  if (!state) return def

  const next = cloneDef(def)
  // Remove the moved state from its current position first.
  bypassState(next, stateName)

  // Now attach it on the target edge.
  const moved = { ...next.States[stateName] } as OsmlState & { Next?: string; End?: boolean }
  if (supportsNext(moved.Type)) {
    if (edge.targetState === PLACEHOLDER_END || edge.kind === 'terminal') {
      moved.End = true
      delete moved.Next
    } else {
      moved.Next = edge.targetState
      moved.End = false
    }
  }
  next.States[stateName] = moved
  rewireSource(next, edge, stateName)
  return next
}
