import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  useNodesState,
  type Connection,
  type Node,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import '@osml/graph-kit/graph.css'
import type { StateMachineDefinition } from '../osml/types'
import {
  toGraph,
  isPlaceholderState,
  parseNodeId,
  NODE_WIDTH,
  NODE_HEIGHT,
  ENDPOINT_SIZE,
  type EdgeData,
} from '../osml/toGraph'
import type { LaidOutGraph } from '../osml/layout'
import { StateNode } from './StateNode'
import { EndpointNode } from './EndpointNode'
import { ContainerNode } from './ContainerNode'

const EMPTY_GRAPH: LaidOutGraph = { nodes: [], edges: [] }
const EMPTY_VISITED_STATES: string[] = []

const NODE_TYPES: NodeTypes = {
  stateNode: StateNode,
  endpointNode: EndpointNode,
  containerNode: ContainerNode,
}

const NODE_W = NODE_WIDTH
const NODE_H = NODE_HEIGHT
const EDGE_HIT_RADIUS = 130

export interface TraversedEdge {
  from: string
  to: string
}

interface Props {
  definition: StateMachineDefinition
  selectedState: string | null
  highlightState?: string | null
  visitedStates?: string[]
  traversedEdges?: TraversedEdge[]
  onSelectState: (name: string | null) => void
  onDrillSubgraph?: (stateName: string) => void
  onInsertState?: (type: string, edge: EdgeData | null) => void
  onConnectStates?: (source: string, target: string) => void
  onReorderState?: (stateName: string, edge: EdgeData) => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  onDuplicate?: () => void
  onDelete?: () => void
  canEditSelection?: boolean
}

function nodeCenter(n: Node): { x: number; y: number } {
  const w =
    n.type === 'endpointNode'
      ? ENDPOINT_SIZE
      : (n.width ?? (n.style?.width as number) ?? NODE_W)
  const h =
    n.type === 'endpointNode'
      ? ENDPOINT_SIZE
      : (n.height ?? (n.style?.height as number) ?? NODE_H)
  return { x: n.position.x + w / 2, y: n.position.y + h / 2 }
}

function styleNodes(
  graphNodes: Node[],
  selectedState: string | null,
  highlightState: string | null | undefined,
  visitedSet: Set<string>,
): Node[] {
  return graphNodes.map((n) => {
    const stateName = n.data.stateName as string
    const isVisited = visitedSet.has(stateName)
    const isHighlight = stateName === highlightState
    const isSelected = stateName === selectedState

    let boxShadow: string | undefined
    if (isHighlight) {
      boxShadow = '0 0 0 3px #f59e0b'
    } else if (isVisited) {
      boxShadow = '0 0 0 2px #16a34a'
    } else if (isSelected) {
      boxShadow = '0 0 0 2px #2563eb'
    }

    const dim =
      visitedSet.size > 0 &&
      !isPlaceholderState(stateName) &&
      !isVisited &&
      !isHighlight

    return {
      ...n,
      selected: isSelected,
      style: {
        ...n.style,
        boxShadow,
        opacity: dim ? 0.55 : 1,
      },
    }
  })
}

function GraphToolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onFit,
  onZoomIn,
  onZoomOut,
  onDuplicate,
  onDelete,
  canEditSelection,
}: {
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  onFit: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  canEditSelection?: boolean
}) {
  return (
    <div className="graph-toolbar">
      {onUndo && (
        <button type="button" onClick={onUndo} disabled={!canUndo} title="Undo">
          <span className="toolbar-icon">↶</span>
          <span className="toolbar-label">Undo</span>
        </button>
      )}
      {onRedo && (
        <button type="button" onClick={onRedo} disabled={!canRedo} title="Redo">
          <span className="toolbar-icon">↷</span>
          <span className="toolbar-label">Redo</span>
        </button>
      )}
      <span className="graph-toolbar-sep" />
      <button type="button" onClick={onZoomIn} title="Zoom in">
        <span className="toolbar-icon">+</span>
        <span className="toolbar-label">Zoom in</span>
      </button>
      <button type="button" onClick={onZoomOut} title="Zoom out">
        <span className="toolbar-icon">−</span>
        <span className="toolbar-label">Zoom out</span>
      </button>
      <button type="button" onClick={onFit} title="Center">
        <span className="toolbar-icon">⊡</span>
        <span className="toolbar-label">Center</span>
      </button>
      {onDuplicate && (
        <>
          <span className="graph-toolbar-sep" />
          <button
            type="button"
            onClick={onDuplicate}
            disabled={!canEditSelection}
            title="Duplicate"
          >
            <span className="toolbar-icon">⧉</span>
            <span className="toolbar-label">Duplicate</span>
          </button>
        </>
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} disabled={!canEditSelection} title="Delete">
          <span className="toolbar-icon">✕</span>
          <span className="toolbar-label">Delete</span>
        </button>
      )}
    </div>
  )
}

function OsmlGraphInner({
  definition,
  selectedState,
  highlightState,
  visitedStates = EMPTY_VISITED_STATES,
  onSelectState,
  onDrillSubgraph,
  onInsertState,
  onConnectStates,
  onReorderState,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onDuplicate,
  onDelete,
  canEditSelection,
}: Props) {
  const definitionKey = useMemo(() => JSON.stringify(definition), [definition])
  const visitedSet = useMemo(() => new Set(visitedStates), [visitedStates])
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, fitView, zoomIn, zoomOut } = useReactFlow()

  const [laidOut, setLaidOut] = useState<LaidOutGraph>(EMPTY_GRAPH)

  useEffect(() => {
    let cancelled = false
    const base = toGraph(definition)
    import('../osml/layout')
      .then(({ layoutGraph }) => layoutGraph(base.nodes, base.edges))
      .then((result) => {
        if (cancelled) return
        setLaidOut(result)
        requestAnimationFrame(() => {
          fitView({ padding: 0.2, duration: 200 })
        })
      })
      .catch(() => {
        if (!cancelled) setLaidOut(base)
      })
    return () => {
      cancelled = true
    }
  }, [definitionKey, fitView])

  const styledNodes = useMemo(
    () => styleNodes(laidOut.nodes, selectedState, highlightState, visitedSet),
    [laidOut.nodes, selectedState, highlightState, visitedSet],
  )

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(styledNodes)

  useEffect(() => {
    setRfNodes(styledNodes)
  }, [styledNodes, setRfNodes])

  const nodeCenters = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    for (const n of laidOut.nodes) {
      map.set(n.id, nodeCenter(n))
    }
    return map
  }, [laidOut.nodes])

  const nearestEdge = useCallback(
    (point: { x: number; y: number }, excludeState?: string): EdgeData | null => {
      let best: EdgeData | null = null
      let bestDist = EDGE_HIT_RADIUS
      for (const edge of laidOut.edges) {
        const data = edge.data as EdgeData | undefined
        if (!data) continue
        if (excludeState && (data.sourceState === excludeState || data.targetState === excludeState)) {
          continue
        }
        const a = nodeCenters.get(edge.source)
        const b = nodeCenters.get(edge.target)
        if (!a || !b) continue
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const dist = Math.hypot(mid.x - point.x, mid.y - point.y)
        if (dist < bestDist) {
          bestDist = dist
          best = data
        }
      }
      return best
    },
    [laidOut.edges, nodeCenters],
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectState(parseNodeId(node.id).stateName)
    },
    [onSelectState],
  )

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.data.hasSubgraph && onDrillSubgraph) {
        onDrillSubgraph(node.data.stateName as string)
      }
    },
    [onDrillSubgraph],
  )

  const onConnect = useCallback(
    (params: Connection) => {
      if (!onConnectStates || !params.source || !params.target) return
      onConnectStates(parseNodeId(params.source).stateName, parseNodeId(params.target).stateName)
    },
    [onConnectStates],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/osml-state-type')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const type = e.dataTransfer.getData('application/osml-state-type')
      if (!type || !onInsertState) return
      e.preventDefault()
      const point = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      onInsertState(type, nearestEdge(point))
    },
    [onInsertState, screenToFlowPosition, nearestEdge],
  )

  const onNodeDragStop = useCallback(
    (_: MouseEvent | TouchEvent, node: Node) => {
      if (!onReorderState) return
      const stateName = parseNodeId(node.id).stateName
      if (isPlaceholderState(stateName)) {
        setRfNodes(styledNodes)
        return
      }
      const center = nodeCenter(node)
      const edge = nearestEdge(center, stateName)
      if (edge) {
        onReorderState(stateName, edge)
      } else {
        setRfNodes(styledNodes)
      }
    },
    [onReorderState, nearestEdge, setRfNodes, styledNodes],
  )

  return (
    <div className="osml-graph" ref={wrapperRef} onDragOver={onDragOver} onDrop={onDrop}>
      <GraphToolbar
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onFit={() => fitView({ padding: 0.2, duration: 200 })}
        onZoomIn={() => zoomIn({ duration: 150 })}
        onZoomOut={() => zoomOut({ duration: 150 })}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        canEditSelection={canEditSelection}
      />
      <ReactFlow
        key={definitionKey}
        nodes={rfNodes}
        edges={laidOut.edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodesDraggable={!!onReorderState}
        nodesConnectable={!!onConnectStates}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'step', style: { stroke: '#879596', strokeWidth: 1.5 } }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.5} color="#cbd5e1" />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  )
}

export function OsmlGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <OsmlGraphInner {...props} />
    </ReactFlowProvider>
  )
}
