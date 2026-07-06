import { Handle, Position, type NodeProps } from '@xyflow/react'
import { BRANCH_HANDLE, CONTAINER_HEADER } from '../osml/toGraph'

/** Parallel / Map container — children are laid out inside via parentId. */
export function ContainerNode({ data }: NodeProps) {
  const {
    label,
    typeLabel,
    glyph,
    background,
    border,
    color,
    outHandleCount,
  } = data as {
    label: string
    typeLabel: string
    glyph: string
    background: string
    border: string
    color: string
    outHandleCount?: number
  }

  const sourceHandles = Math.max(1, outHandleCount ?? 1)

  return (
    <div className="rf-container-node" style={{ borderColor: border }}>
      <Handle type="target" position={Position.Top} className="rf-handle" />
      <div className="rf-container-header" style={{ borderColor: border }}>
        <span
          className="rf-node-badge"
          style={{ background, color, borderColor: border }}
          aria-hidden="true"
        >
          {glyph}
        </span>
        <div className="rf-node-text">
          <span className="rf-node-type">{typeLabel}</span>
          <span className="rf-node-name">{label}</span>
        </div>
      </div>
      <div className="rf-container-body" />
      {/* Connector to branch / iterator starts, emanating from the header bottom. */}
      <Handle
        type="source"
        id={BRANCH_HANDLE}
        position={Position.Bottom}
        className="rf-handle rf-handle--branch"
        style={{ top: CONTAINER_HEADER, bottom: 'auto' }}
      />
      {Array.from({ length: sourceHandles }).map((_, i) => (
        <Handle
          key={i}
          type="source"
          id={`out-${i}`}
          position={Position.Bottom}
          className="rf-handle"
          style={{ left: `${((i + 1) / (sourceHandles + 1)) * 100}%` }}
        />
      ))}
    </div>
  )
}
