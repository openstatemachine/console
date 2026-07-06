import { Handle, Position, type NodeProps } from '@xyflow/react'

export function StateNode({ data }: NodeProps) {
  const {
    label,
    typeLabel,
    glyph,
    background,
    border,
    color,
    isStart,
    hasSubgraph,
    outHandleCount,
  } = data as {
    label: string
    typeLabel: string
    glyph: string
    background: string
    border: string
    color: string
    isStart?: boolean
    hasSubgraph?: boolean
    outHandleCount?: number
  }

  const sourceHandles = Math.max(1, outHandleCount ?? 1)

  return (
    <div
      className={`rf-state-node${isStart ? ' is-start' : ''}`}
      style={{ borderColor: border }}
    >
      <Handle type="target" position={Position.Top} className="rf-handle" />
      <div className="rf-node-rail" style={{ borderColor: border }} aria-hidden="true" />
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
      {hasSubgraph && (
        <span className="rf-node-drill" title="Double-click to open sub-workflow">⤢</span>
      )}
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
