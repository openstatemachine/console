import { Handle, Position, type NodeProps } from '@xyflow/react'

/** Yellow circular Start / End node (AWS Workflow Studio style). */
export function EndpointNode({ data }: NodeProps) {
  const { label, variant } = data as { label: string; variant: 'start' | 'end' }

  return (
    <div className={`rf-endpoint rf-endpoint--${variant}`}>
      {variant === 'start' && (
        <Handle type="source" position={Position.Bottom} className="rf-handle rf-handle--endpoint" />
      )}
      <span className="rf-endpoint-label">{label}</span>
      {variant === 'end' && (
        <Handle type="target" position={Position.Top} className="rf-handle rf-handle--endpoint" />
      )}
    </div>
  )
}
