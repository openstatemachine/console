import { useMemo, useState } from 'react'
import { stateTypeGlyph, stateTypeStyle } from '../osml/toGraph'

interface PaletteItem {
  type: string
  label: string
  description: string
}

const ACTION_ITEMS: PaletteItem[] = [
  { type: 'Task', label: 'Task', description: 'Run JS, HTTP, an activity, or wait for a token.' },
  { type: 'Http', label: 'HTTP', description: 'Call an external HTTP API with first-class Url, Method, Headers, Body.' },
  { type: 'StartExecution', label: 'Start Execution', description: 'Invoke another state machine (sync or async).' },
]

const FLOW_ITEMS: PaletteItem[] = [
  { type: 'Choice', label: 'Choice', description: 'Adds if-then-else logic.' },
  { type: 'Parallel', label: 'Parallel', description: 'Adds separate branches.' },
  { type: 'Map', label: 'Map', description: 'Runs a workflow for each item.' },
  { type: 'Pass', label: 'Pass', description: 'Transforms data or acts as placeholder.' },
  { type: 'Wait', label: 'Wait', description: 'Delays for a specified time.' },
  { type: 'Succeed', label: 'Succeed', description: 'Stops and marks as success.' },
  { type: 'Fail', label: 'Fail', description: 'Stops and marks as failure.' },
]

interface Props {
  onAdd: (type: string) => void
  open?: boolean
  onToggle?: () => void
}

export function StatePalette({ onAdd, open = true, onToggle }: Props) {
  const [tab, setTab] = useState<'actions' | 'flow'>('actions')
  const [search, setSearch] = useState('')

  const items = tab === 'actions' ? ACTION_ITEMS : FLOW_ITEMS
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.type.toLowerCase().includes(q),
    )
  }, [items, search])

  return (
    <div className={`palette ${open ? '' : 'palette-collapsed'}`}>
      {!open ? (
        <button type="button" className="panel-rail" onClick={onToggle} title="Expand Add states">
          <span className="panel-rail-chevron">›</span>
          <span className="panel-rail-label">Add states</span>
        </button>
      ) : (
        <>
          <div className="palette-header">
            <span className="palette-header-title">Add states</span>
            <button type="button" className="panel-toggle" onClick={onToggle} title="Collapse">
              ‹
            </button>
          </div>
          <div className="palette-search">
            <input
              type="search"
              placeholder="Search states"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search states"
            />
          </div>
          <div className="palette-tabs">
            <button
              type="button"
              className={tab === 'actions' ? 'active' : ''}
              onClick={() => setTab('actions')}
            >
              Actions
            </button>
            <button
              type="button"
              className={tab === 'flow' ? 'active' : ''}
              onClick={() => setTab('flow')}
            >
              Flow
            </button>
          </div>
          <div className="palette-list">
            {filtered.map((item) => {
              const style = stateTypeStyle(item.type)
              return (
                <button
                  key={item.type}
                  type="button"
                  className="palette-item"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/osml-state-type', item.type)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => onAdd(item.type)}
                  title={`Drag onto the graph, or click to add ${item.label}`}
                >
                  <span
                    className="palette-icon"
                    style={{ background: style.background, color: style.color, borderColor: style.border }}
                    aria-hidden="true"
                  >
                    {stateTypeGlyph(item.type)}
                  </span>
                  <span className="palette-text">
                    <span className="palette-label">{item.label}</span>
                    <span className="palette-desc">{item.description}</span>
                  </span>
                </button>
              )
            })}
            {filtered.length === 0 && <p className="palette-empty">No matches.</p>}
          </div>
        </>
      )}
    </div>
  )
}
