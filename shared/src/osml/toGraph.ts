import type { Edge, Node } from '@xyflow/react'
import { Position } from '@xyflow/react'
import { formatCatchLabel, formatChoiceRuleLabel } from './edgeLabels'
import type { OsmlState, StateMachineDefinition } from './types'

export interface GraphContext {
  prefix: string
  parentId?: string
}

export const PLACEHOLDER_START = '__placeholder_start__'
export const PLACEHOLDER_END = '__placeholder_end__'

export const NODE_WIDTH = 220
export const NODE_HEIGHT = 76
export const ENDPOINT_SIZE = 56
export const CONTAINER_HEADER = 52
export const CONTAINER_PAD = 28

export type EdgeKind = 'start' | 'next' | 'choice' | 'default' | 'catch' | 'terminal' | 'branch'

/** Fixed source handle used for container→branch/iterator connectors. */
export const BRANCH_HANDLE = 'branch-out'

export interface EdgeData {
  kind: EdgeKind
  sourceState: string
  targetState: string
  index?: number
  [key: string]: unknown
}

const EDGE_STYLE = { stroke: '#879596', strokeWidth: 1.5 }
const DEFAULT_EDGE = { type: 'step' as const, style: EDGE_STYLE, labelStyle: edgeLabelStyle() }

function edgeLabelStyle() {
  return {
    fill: '#0f172a',
    fontSize: 11,
    fontWeight: 500,
  }
}

function edgeLabelBg() {
  return { fill: '#fff', fillOpacity: 0.95, stroke: '#cbd5e1', strokeWidth: 1, rx: 4, ry: 4 }
}

function nodeId(name: string, ctx: GraphContext): string {
  return ctx.prefix ? `${ctx.prefix}::${name}` : name
}

function parseNodeId(id: string): { stateName: string; prefix: string } {
  const idx = id.lastIndexOf('::')
  if (idx === -1) return { stateName: id, prefix: '' }
  return { stateName: id.slice(idx + 2), prefix: id.slice(0, idx) }
}

function isTerminalState(state: OsmlState): boolean {
  if (state.Type === 'Succeed' || state.Type === 'Fail') return true
  if ('End' in state && state.End === true) {
    return !('Next' in state && state.Next)
  }
  return false
}

function makeEndpoint(id: string, label: string, variant: 'start' | 'end', ctx: GraphContext): Node {
  return {
    id,
    type: 'endpointNode',
    position: { x: 0, y: 0 },
    sourcePosition: variant === 'start' ? Position.Bottom : undefined,
    targetPosition: variant === 'end' ? Position.Top : undefined,
    data: {
      label,
      variant,
      stateName: variant === 'start' ? PLACEHOLDER_START : PLACEHOLDER_END,
      stateType: 'Placeholder',
      isPlaceholder: true,
      prefix: ctx.prefix,
    },
    style: { width: ENDPOINT_SIZE, height: ENDPOINT_SIZE },
    selectable: true,
    draggable: false,
  }
}

function makeStateNode(
  name: string,
  state: OsmlState,
  ctx: GraphContext,
  opts: { isStart: boolean; parentId?: string },
): Node {
  const id = nodeId(name, ctx)
  const typeStyle = stateTypeStyle(state.Type)
  const isContainer = state.Type === 'Parallel' || state.Type === 'Map'

  return {
    id,
    type: isContainer ? 'containerNode' : 'stateNode',
    position: { x: 0, y: 0 },
    parentId: opts.parentId,
    extent: opts.parentId ? ('parent' as const) : undefined,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    data: {
      label: name,
      stateName: name,
      stateType: state.Type,
      typeLabel: stateTypeLabel(state),
      glyph: stateTypeGlyph(state.Type),
      background: typeStyle.background,
      border: typeStyle.border,
      color: typeStyle.color,
      isStart: opts.isStart,
      hasSubgraph: isContainer,
      isTerminal: isTerminalState(state),
      prefix: ctx.prefix,
    },
    style: {
      width: isContainer ? NODE_WIDTH * 2 : NODE_WIDTH,
      borderRadius: isContainer ? 12 : 10,
      zIndex: isContainer ? 0 : 1,
    },
  }
}

function addEdge(
  edges: Edge[],
  sourceId: string,
  targetId: string,
  label: string | undefined,
  data: EdgeData,
  opts?: { dashed?: boolean },
): void {
  edges.push({
    id: `${sourceId}->${targetId}${label ?? ''}`,
    source: sourceId,
    target: targetId,
    label,
    ...DEFAULT_EDGE,
    animated: data.kind === 'default',
    style: {
      ...EDGE_STYLE,
      strokeDasharray: opts?.dashed ? '6 4' : undefined,
    },
    labelStyle: edgeLabelStyle(),
    labelBgStyle: label ? edgeLabelBg() : undefined,
    labelBgPadding: label ? [6, 4] : undefined,
    labelBgBorderRadius: label ? 4 : undefined,
    data,
  })
}

function addEdgesForState(
  sourceId: string,
  sourceName: string,
  state: OsmlState,
  edges: Edge[],
  resolveTarget: (name: string) => string,
): void {
  if ('Next' in state && state.Next) {
    addEdge(edges, sourceId, resolveTarget(state.Next), undefined, {
      kind: 'next',
      sourceState: sourceName,
      targetState: state.Next,
    })
  }
  if (state.Type === 'Choice') {
    state.Choices?.forEach((c, i) => {
      if (c.Next) {
        addEdge(
          edges,
          sourceId,
          resolveTarget(c.Next),
          formatChoiceRuleLabel(c, i),
          { kind: 'choice', index: i, sourceState: sourceName, targetState: c.Next },
        )
      }
    })
    if (state.Default) {
      addEdge(
        edges,
        sourceId,
        resolveTarget(state.Default),
        'Default',
        { kind: 'default', sourceState: sourceName, targetState: state.Default },
        { dashed: true },
      )
    }
  }
  if ('Catch' in state && state.Catch) {
    state.Catch.forEach((c, i) => {
      if (c.Next) {
        addEdge(
          edges,
          sourceId,
          resolveTarget(c.Next),
          formatCatchLabel(c, i),
          { kind: 'catch', index: i, sourceState: sourceName, targetState: c.Next },
          { dashed: true },
        )
      }
    })
  }
}

/** Append states + internal edges for a subgraph (no Start/End placeholders). */
function appendSubgraph(
  definition: StateMachineDefinition,
  ctx: GraphContext,
  parentId: string,
  nodes: Node[],
  edges: Edge[],
): void {
  const resolveTarget = (name: string) => nodeId(name, ctx)

  for (const [name, state] of Object.entries(definition.States)) {
  if (state.Type === 'Parallel' || state.Type === 'Map') {
      appendContainerState(name, state, ctx, parentId, nodes, edges)
      continue
    }

    nodes.push(
      makeStateNode(name, state, ctx, {
        isStart: name === definition.StartAt,
        parentId,
      }),
    )
    addEdgesForState(nodeId(name, ctx), name, state, edges, resolveTarget)

    if (isTerminalState(state)) {
      // Terminal inside container — no End placeholder
    }
  }
}

function appendContainerState(
  name: string,
  state: OsmlState,
  ctx: GraphContext,
  parentId: string | undefined,
  nodes: Node[],
  edges: Edge[],
): void {
  const id = nodeId(name, ctx)
  const containerNode = makeStateNode(name, state, ctx, {
    isStart: false,
    parentId,
  })
  nodes.push(containerNode)

  const addBranchConnector = (branchCtx: GraphContext, branch: StateMachineDefinition) => {
    if (!branch.StartAt || !branch.States[branch.StartAt]) return
    const targetId = nodeId(branch.StartAt, branchCtx)
    edges.push({
      id: `${id}=branch=>${targetId}`,
      source: id,
      target: targetId,
      sourceHandle: BRANCH_HANDLE,
      type: 'step',
      style: { stroke: '#879596', strokeWidth: 1.5 },
      data: { kind: 'branch', sourceState: name, targetState: branch.StartAt },
    })
  }

  if (state.Type === 'Parallel' && state.Branches?.length) {
    state.Branches.forEach((branch, bi) => {
      const branchCtx = { prefix: `${id}::b${bi}`, parentId: id }
      appendSubgraph(branch, branchCtx, id, nodes, edges)
      addBranchConnector(branchCtx, branch)
    })
  } else if (state.Type === 'Map' && state.Iterator) {
    const iterCtx = { prefix: `${id}::iter`, parentId: id }
    appendSubgraph(state.Iterator, iterCtx, id, nodes, edges)
    addBranchConnector(iterCtx, state.Iterator)
  }

  const resolveTarget = (target: string) => nodeId(target, ctx)
  addEdgesForState(id, name, state, edges, resolveTarget)
}

export function toGraph(
  definition: StateMachineDefinition,
  ctx: GraphContext = { prefix: '' },
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const isTopLevel = !ctx.parentId

  const startId = nodeId(PLACEHOLDER_START, ctx)
  const endId = nodeId(PLACEHOLDER_END, ctx)

  if (isTopLevel) {
    nodes.push(makeEndpoint(startId, 'Start', 'start', ctx))
    if (definition.StartAt && definition.States[definition.StartAt]) {
      addEdge(
        edges,
        startId,
        nodeId(definition.StartAt, ctx),
        undefined,
        { kind: 'start', sourceState: PLACEHOLDER_START, targetState: definition.StartAt },
      )
    }
  }

  const resolveTarget = (name: string) => nodeId(name, ctx)

  for (const [name, state] of Object.entries(definition.States)) {
    if (state.Type === 'Parallel' || state.Type === 'Map') {
      appendContainerState(name, state, ctx, ctx.parentId, nodes, edges)
      continue
    }

    nodes.push(
      makeStateNode(name, state, ctx, {
        isStart: name === definition.StartAt,
        parentId: ctx.parentId,
      }),
    )
    addEdgesForState(nodeId(name, ctx), name, state, edges, resolveTarget)

    if (isTerminalState(state) && isTopLevel) {
      addEdge(edges, nodeId(name, ctx), endId, undefined, {
        kind: 'terminal',
        sourceState: name,
        targetState: PLACEHOLDER_END,
      })
    }
  }

  if (isTopLevel) {
    nodes.push(makeEndpoint(endId, 'End', 'end', ctx))
  }

  return { nodes, edges }
}

/**
 * Spread each state's outgoing edges across distinct bottom handles, ordered by
 * their target's horizontal position, so multiple branches don't overlap.
 */
export function assignSourceHandles(nodes: Node[], edges: Edge[]): void {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const outgoing = new Map<string, Edge[]>()
  for (const edge of edges) {
    // Branch/iterator connectors leave from a fixed header handle — skip them.
    if ((edge.data as EdgeData | undefined)?.kind === 'branch') continue
    const arr = outgoing.get(edge.source)
    if (arr) arr.push(edge)
    else outgoing.set(edge.source, [edge])
  }

  for (const [sourceId, outs] of outgoing) {
    const node = nodeById.get(sourceId)
    if (!node || (node.type !== 'stateNode' && node.type !== 'containerNode')) continue
    outs.sort(
      (a, b) =>
        (nodeById.get(a.target)?.position.x ?? 0) - (nodeById.get(b.target)?.position.x ?? 0),
    )
    outs.forEach((edge, i) => {
      edge.sourceHandle = `out-${i}`
    })
    node.data = { ...node.data, outHandleCount: outs.length }
  }
}

export function stateTypeGlyph(type: string): string {
  switch (type) {
    case 'Task': return 'ƒ'
    case 'Http': return '⇄'
    case 'Choice': return '⋔'
    case 'Parallel': return '∥'
    case 'Map': return '⊞'
    case 'Pass': return '→'
    case 'Wait': return '⏱'
    case 'Succeed': return '✓'
    case 'Fail': return '✕'
    case 'StartExecution': return '▷'
    default: return '•'
  }
}

export function stateTypeLabel(state: OsmlState): string {
  if (state.Type === 'Task') {
    const resource = (state as { Resource?: string }).Resource ?? 'js'
    const pretty: Record<string, string> = {
      js: 'JavaScript',
      http: 'HTTP request',
      token: 'Task token',
      activity: 'Activity',
      approval: 'Approval',
    }
    return `${state.Type} · ${pretty[resource] ?? resource}`
  }
  if (state.Type === 'Http') {
    const url = (state as { Url?: string }).Url ?? 'URL'
    return `Http · ${url}`
  }
  if (state.Type === 'Parallel') return 'Parallel'
  if (state.Type === 'Map') return 'Map'
  return state.Type
}

export function stateTypeStyle(type: string): { background: string; border: string; color: string } {
  switch (type) {
    case 'Task':
      return { background: '#e8f4fd', border: '#0073bb', color: '#0073bb' }
    case 'Http':
      return { background: '#e0f2fe', border: '#0284c7', color: '#0369a1' }
    case 'Choice':
      return { background: '#fff8e1', border: '#ff9900', color: '#b45309' }
    case 'Parallel':
      return { background: '#f3e8ff', border: '#7c3aed', color: '#6d28d9' }
    case 'Map':
      return { background: '#e0f7fa', border: '#008577', color: '#00695c' }
    case 'Pass':
      return { background: '#f8fafc', border: '#94a3b8', color: '#475569' }
    case 'Wait':
      return { background: '#fff3e0', border: '#ff9900', color: '#e65100' }
    case 'Succeed':
      return { background: '#dcfce7', border: '#16a34a', color: '#15803d' }
    case 'Fail':
      return { background: '#fee2e2', border: '#dc2626', color: '#b91c1c' }
    case 'StartExecution':
      return { background: '#ede9fe', border: '#6366f1', color: '#4338ca' }
    default:
      return { background: '#fff', border: '#cbd5e1', color: '#334155' }
  }
}

export function isPlaceholderState(name: string | null): boolean {
  return name === PLACEHOLDER_START || name === PLACEHOLDER_END
}

export function getSubgraph(
  definition: StateMachineDefinition,
  stateName: string,
  branchIndex = 0,
): StateMachineDefinition | null {
  const state = definition.States[stateName]
  if (!state) return null
  if (state.Type === 'Parallel' && state.Branches?.length) {
    return state.Branches[branchIndex] ?? state.Branches[0]
  }
  if (state.Type === 'Map' && state.Iterator) {
    return state.Iterator
  }
  return null
}

export function updateSubgraph(
  definition: StateMachineDefinition,
  stateName: string,
  subgraph: StateMachineDefinition,
  branchIndex = 0,
): StateMachineDefinition {
  const state = definition.States[stateName]
  if (!state) return definition
  const updated = { ...definition, States: { ...definition.States } }
  if (state.Type === 'Parallel') {
    const branches = [...(state.Branches ?? [])]
    branches[branchIndex] = subgraph
    updated.States[stateName] = { ...state, Branches: branches }
  } else if (state.Type === 'Map') {
    updated.States[stateName] = { ...state, Iterator: subgraph }
  }
  return updated
}

export { parseNodeId, nodeId }
