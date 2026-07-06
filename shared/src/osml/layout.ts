import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js'
import type { Edge, Node } from '@xyflow/react'
import {
  assignSourceHandles,
  CONTAINER_HEADER,
  CONTAINER_PAD,
  ENDPOINT_SIZE,
  NODE_HEIGHT,
  NODE_WIDTH,
  type EdgeData,
} from './toGraph'

/**
 * Container→branch/iterator connectors are rendered by React Flow via a fixed
 * header handle, but must NOT be fed to ELK: their source is the container node
 * itself, which is not a valid ELK internal-edge endpoint and makes layout throw.
 */
function isLayoutEdge(e: Edge): boolean {
  return (e.data as EdgeData | undefined)?.kind !== 'branch'
}

const elk = new ELK()

const LAYOUT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.spacing.nodeNodeBetweenLayers': '64',
  'elk.spacing.nodeNode': '48',
  'elk.layered.spacing.edgeNodeBetweenLayers': '28',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
  'elk.edgeRouting': 'ORTHOGONAL',
}

// Extra gap under the header so the branch connector has room to render.
const HEADER_GAP = 24

const CONTAINER_OPTIONS: Record<string, string> = {
  ...LAYOUT_OPTIONS,
  'elk.padding': `[top=${CONTAINER_HEADER + HEADER_GAP},left=${CONTAINER_PAD},bottom=${CONTAINER_PAD},right=${CONTAINER_PAD}]`,
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
}

function nodeWidth(node: Node): number {
  if (node.type === 'endpointNode') return ENDPOINT_SIZE
  const w = node.width ?? (node.style?.width as number | undefined)
  return typeof w === 'number' ? w : NODE_WIDTH
}

function nodeHeight(node: Node): number {
  if (node.type === 'endpointNode') return ENDPOINT_SIZE
  const h = node.height ?? (node.style?.height as number | undefined)
  return typeof h === 'number' ? h : NODE_HEIGHT
}

function edgesForScope(allEdges: Edge[], nodeIds: Set<string>): Edge[] {
  return allEdges.filter((e) => isLayoutEdge(e) && nodeIds.has(e.source) && nodeIds.has(e.target))
}

function buildElkNode(node: Node, allNodes: Node[], allEdges: Edge[]): ElkNode {
  const childNodes = allNodes.filter((n) => n.parentId === node.id)
  const childIds = new Set(childNodes.map((n) => n.id))
  const scopeIds = new Set([node.id, ...childIds])
  const internalEdges = edgesForScope(allEdges, scopeIds).filter(
    (e) => childIds.has(e.source) || childIds.has(e.target),
  )

  const elkNode: ElkNode = {
    id: node.id,
    width: nodeWidth(node),
    height: nodeHeight(node),
  }

  if (childNodes.length > 0) {
    elkNode.layoutOptions = CONTAINER_OPTIONS
    elkNode.children = childNodes.map((c) => buildElkNode(c, allNodes, allEdges))
    elkNode.edges = internalEdges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    }))
  }

  return elkNode
}

function collectPositions(
  elkNode: ElkNode,
  positions: Map<string, { x: number; y: number }>,
  sizes: Map<string, { width: number; height: number }>,
): void {
  if (elkNode.x !== undefined && elkNode.y !== undefined) {
    positions.set(elkNode.id, { x: elkNode.x, y: elkNode.y })
  }
  if (elkNode.width !== undefined && elkNode.height !== undefined) {
    sizes.set(elkNode.id, { width: elkNode.width, height: elkNode.height })
  }
  for (const child of elkNode.children ?? []) {
    collectPositions(child, positions, sizes)
  }
}

export interface LaidOutGraph {
  nodes: Node[]
  edges: Edge[]
}

export async function layoutGraph(nodes: Node[], edges: Edge[]): Promise<LaidOutGraph> {
  if (nodes.length === 0) return { nodes, edges }

  const roots = nodes.filter((n) => !n.parentId)
  const rootIds = new Set(roots.map((n) => n.id))
  const topEdges = edges.filter(
    (e) => isLayoutEdge(e) && rootIds.has(e.source) && rootIds.has(e.target),
  )

  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: LAYOUT_OPTIONS,
    children: roots.map((n) => buildElkNode(n, nodes, edges)),
    edges: topEdges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  }

  const result = await elk.layout(elkGraph)

  const positions = new Map<string, { x: number; y: number }>()
  const sizes = new Map<string, { width: number; height: number }>()
  for (const child of result.children ?? []) {
    collectPositions(child, positions, sizes)
  }

  // ELK child coordinates are already relative to the parent's top-left and
  // include the container padding (which reserves the header + gap), so they are
  // used directly — no manual header offset (that caused children to overflow).
  const positioned = nodes.map((n) => {
    const pos = positions.get(n.id) ?? n.position
    const size = sizes.get(n.id)
    const style = { ...n.style }
    if (size && n.type === 'containerNode') {
      style.width = Math.max(size.width, NODE_WIDTH)
      style.height = Math.max(size.height, NODE_HEIGHT + CONTAINER_HEADER)
    }
    return { ...n, position: pos, style }
  })

  const laidOutEdges = edges.map((e) => ({ ...e }))
  assignSourceHandles(positioned, laidOutEdges)

  return { nodes: positioned, edges: laidOutEdges }
}
