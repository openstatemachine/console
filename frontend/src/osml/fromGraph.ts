import type { Edge, Node } from '@xyflow/react'
import type { StateMachineDefinition } from './types'

/**
 * Graph-to-OSML conversion is handled via the Monaco JSON editor as the
 * canonical source of truth. Visual graph edits select states for form editing;
 * structural changes (add/remove states, transitions) are applied through
 * the definition object in MachineEditor.
 */
export function fromGraph(
  _nodes: Node[],
  _edges: Edge[],
  base: StateMachineDefinition,
): StateMachineDefinition {
  return base
}
