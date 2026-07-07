import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { MonacoEditorLazy } from '../components/MonacoEditorLazy'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { OsmlGraphLazy } from '../components/OsmlGraphLazy'
import { StatePalette } from '../components/StatePalette'
import { StateFormPanel } from '../components/forms/StateFormPanel'
import { getSubgraph, updateSubgraph, isPlaceholderState, type EdgeData } from '../osml/toGraph'
import { insertStateOnEdge, connectStates, reorderStateOntoEdge } from '../osml/graphEdit'
import {
  createDefaultState,
  createDefinitionFromTemplate,
  createEmptyDefinition,
  type CreateMachineDraft,
  type OsmlState,
  type ParallelState,
  type StateMachineDefinition,
} from '../osml/types'
import { parseOsmlJson, validateClientSide } from '../osml/validate'

const CREATE_DRAFT_KEY = 'statum.createDraft'

function readCreateDraft(locationState: CreateMachineDraft | null): CreateMachineDraft | null {
  if (locationState?.name) return locationState
  try {
    const raw = sessionStorage.getItem(CREATE_DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CreateMachineDraft
  } catch {
    return null
  }
}

export function MachineEditor() {
  const { name } = useParams<{ name: string }>()
  const isNew = name === 'new'
  const navigate = useNavigate()
  const location = useLocation()
  const draft = readCreateDraft(location.state as CreateMachineDraft | null)
  const queryClient = useQueryClient()

  const machineName = isNew ? (draft?.name ?? '') : (name ?? '')
  const [definition, setDefinitionRaw] = useState<StateMachineDefinition>(() => {
    if (isNew && draft?.template) return createDefinitionFromTemplate(draft.template)
    return createEmptyDefinition()
  })
  const [history, setHistory] = useState<StateMachineDefinition[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const historyIndexRef = useRef(-1)
  const skipHistoryRef = useRef(false)
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'design' | 'code' | 'config'>('design')
  const [paletteOpen, setPaletteOpen] = useState(true)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [validationMsg, setValidationMsg] = useState<string | null>(null)
  const [editorKey, setEditorKey] = useState(0)
  const [subgraphStack, setSubgraphStack] = useState<
    { stateName: string; branchIndex: number; parent: StateMachineDefinition }[]
  >([])

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['statemachine', name],
    queryFn: () => api.getStateMachine(name!),
    enabled: !isNew && !!name,
  })

  const { data: versions } = useQuery({
    queryKey: ['versions', name],
    queryFn: () => api.listVersions(name!),
    enabled: !isNew && !!name,
  })

  useEffect(() => {
    if (isNew && !draft?.name) {
      navigate('/machines/create', { replace: true })
    }
  }, [isNew, draft, navigate])

  const loadedFromServer = useRef(false)

  const setDefinition = useCallback((def: StateMachineDefinition, recordHistory = true) => {
    setDefinitionRaw(def)
    if (!recordHistory || skipHistoryRef.current) return
    const snap = JSON.parse(JSON.stringify(def)) as StateMachineDefinition
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndexRef.current + 1)
      const last = trimmed[trimmed.length - 1]
      if (last && JSON.stringify(last) === JSON.stringify(snap)) return trimmed
      const next = [...trimmed, snap].slice(-50)
      historyIndexRef.current = next.length - 1
      setHistoryIndex(historyIndexRef.current)
      return next
    })
  }, [])

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    const snap = history[historyIndexRef.current]
    if (!snap) return
    skipHistoryRef.current = true
    setDefinitionRaw(snap)
    setHistoryIndex(historyIndexRef.current)
    setSubgraphStack([])
    setSelectedState(null)
    skipHistoryRef.current = false
  }, [history])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= history.length - 1) return
    historyIndexRef.current += 1
    const snap = history[historyIndexRef.current]
    if (!snap) return
    skipHistoryRef.current = true
    setDefinitionRaw(snap)
    setHistoryIndex(historyIndexRef.current)
    setSubgraphStack([])
    setSelectedState(null)
    skipHistoryRef.current = false
  }, [history])

  useEffect(() => {
    if (!existing?.osmlJson || loadedFromServer.current) return
    const parsed = parseOsmlJson(existing.osmlJson)
    if (!parsed.definition) return
    loadedFromServer.current = true
    setDefinition(parsed.definition, false)
    const initial = JSON.parse(JSON.stringify(parsed.definition)) as StateMachineDefinition
    setHistory([initial])
    historyIndexRef.current = 0
    setHistoryIndex(0)
    setEditorKey((k) => k + 1)
  }, [existing?.osmlJson, setDefinition])

  const activeSubgraph = subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1] : null

  const currentDefinition = useMemo((): StateMachineDefinition => {
    if (!activeSubgraph) return definition
    return (
      getSubgraph(activeSubgraph.parent, activeSubgraph.stateName, activeSubgraph.branchIndex)
      ?? createEmptyDefinition()
    )
  }, [activeSubgraph, definition])

  const setCurrentDefinition = useCallback(
    (def: StateMachineDefinition) => {
      if (!activeSubgraph) {
        setDefinition(def)
        return
      }
      const updated = updateSubgraph(
        activeSubgraph.parent,
        activeSubgraph.stateName,
        def,
        activeSubgraph.branchIndex,
      )
      setDefinition(updated)
      setSubgraphStack((stack) =>
        stack.map((s, i) => (i === stack.length - 1 ? { ...s, parent: updated } : s)),
      )
    },
    [activeSubgraph, setDefinition],
  )

  const handleJsonChange = (json: string) => {
    const parsed = parseOsmlJson(json)
    if (!parsed.definition) return
    const current = JSON.stringify(definition)
    const next = JSON.stringify(parsed.definition)
    if (current !== next) {
      setCurrentDefinition(parsed.definition)
    }
  }

  const validate = async () => {
    const client = validateClientSide(definition)
    const osmlJson = JSON.stringify(definition)
    const server = await api.validateStateMachine(osmlJson, machineName || 'draft')
    if (client.valid && server.valid) {
      setValidationMsg('Valid — ready to save.')
    } else {
      setValidationMsg(
        [
          ...client.errors,
          server.valid ? [] : [server.message ?? 'Server validation failed'],
        ].flat().join('\n'),
      )
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const osmlJson = JSON.stringify(definition)
      if (isNew) {
        return api.createStateMachine(machineName, osmlJson, draft?.workflowType)
      }
      return api.updateStateMachine(machineName, osmlJson)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statemachines'] })
      if (isNew) {
        sessionStorage.removeItem(CREATE_DRAFT_KEY)
      }
    },
  })

  const handleSave = async (thenRun = false) => {
    setValidationMsg(null)
    try {
      const result = await saveMutation.mutateAsync()
      const savedName = isNew && result && 'name' in result ? result.name : machineName
      if (thenRun) {
        navigate(`/machines/${encodeURIComponent(savedName)}/run`)
      } else if (isNew) {
        navigate(`/machines/${encodeURIComponent(savedName)}`, { replace: true })
      }
    } catch (e) {
      // error shown via saveMutation.error
    }
  }

  const uniqueName = (base: string) => {
    let n = base
    let i = 2
    while (currentDefinition.States[n]) {
      n = `${base}${i++}`
    }
    return n
  }

  const addStateOfType = (type: string) => {
    const stateName = uniqueName(type)
    setCurrentDefinition({
      ...currentDefinition,
      States: {
        ...currentDefinition.States,
        [stateName]: createDefaultState(type),
      },
    })
    setSelectedState(stateName)
    setViewMode('design')
  }

  const insertState = (type: string, edge: EdgeData | null) => {
    const stateName = uniqueName(type)
    if (edge) {
      setCurrentDefinition(insertStateOnEdge(currentDefinition, edge, stateName, type))
    } else {
      setCurrentDefinition({
        ...currentDefinition,
        States: { ...currentDefinition.States, [stateName]: createDefaultState(type) },
      })
    }
    setSelectedState(stateName)
    setViewMode('design')
  }

  const connectStatesHandler = (source: string, target: string) => {
    setCurrentDefinition(connectStates(currentDefinition, source, target))
  }

  const reorderState = (stateName: string, edge: EdgeData) => {
    setCurrentDefinition(reorderStateOntoEdge(currentDefinition, stateName, edge))
    setSelectedState(stateName)
  }

  const duplicateState = () => {
    if (!selectedState || isPlaceholderState(selectedState)) return
    const src = currentDefinition.States[selectedState]
    if (!src) return
    const copyName = uniqueName(`${selectedState}Copy`)
    setCurrentDefinition({
      ...currentDefinition,
      States: {
        ...currentDefinition.States,
        [copyName]: JSON.parse(JSON.stringify(src)) as OsmlState,
      },
    })
    setSelectedState(copyName)
  }

  const removeState = () => {
    if (!selectedState || isPlaceholderState(selectedState)) return
    const { [selectedState]: _, ...rest } = currentDefinition.States
    setCurrentDefinition({
      ...currentDefinition,
      StartAt: currentDefinition.StartAt === selectedState ? Object.keys(rest)[0] ?? '' : currentDefinition.StartAt,
      States: rest,
    })
    setSelectedState(null)
  }

  const updateState = (stateName: string, state: OsmlState) => {
    setCurrentDefinition({
      ...currentDefinition,
      States: { ...currentDefinition.States, [stateName]: state },
    })
  }

  const drillSubgraph = (stateName: string) => {
    const subgraph = getSubgraph(currentDefinition, stateName)
    if (!subgraph) return
    setSubgraphStack([...subgraphStack, { stateName, branchIndex: 0, parent: currentDefinition }])
    setSelectedState(null)
  }

  const popSubgraph = () => {
    setSubgraphStack(subgraphStack.slice(0, -1))
    setSelectedState(null)
  }

  const setAlias = async () => {
    const alias = prompt('Alias name?', 'prod')
    const versionStr = prompt('Version number?', '1')
    if (!alias || !versionStr || !name) return
    await api.setAlias(name, alias, Number(versionStr))
    queryClient.invalidateQueries({ queryKey: ['versions', name] })
  }

  if (isNew && !draft?.name) {
    return <p className="hint">Redirecting…</p>
  }

  if (!isNew && loadingExisting) {
    return (
      <div className="page editor-page">
        <p className="hint">Loading workflow…</p>
      </div>
    )
  }

  const saving = saveMutation.isPending

  const canEditSelection = !!selectedState && !isPlaceholderState(selectedState)
  const parentState = activeSubgraph ? definition.States[activeSubgraph.stateName] : null

  const exitHref = isNew ? '/machines' : `/machines/${encodeURIComponent(name!)}`

  const studioGridColumns = `${paletteOpen ? 'minmax(190px, 250px)' : '40px'} minmax(160px, 1fr) ${inspectorOpen ? 'minmax(230px, 330px)' : '40px'}`

  return (
    <div className="studio">
      <div className="studio-topbar">
        <div className="studio-title">
          <p className="breadcrumb">
            <Link to="/machines">State Machines</Link>
            {' / '}
            {isNew ? 'Create' : name}
          </p>
          <h2>
            {isNew ? machineName || 'Untitled workflow' : name}
            {!isNew && existing?.type && (
              <span className="type-badge">{existing.type}</span>
            )}
            {isNew && draft?.workflowType && (
              <span className="type-badge">{draft.workflowType}</span>
            )}
          </h2>
        </div>

        <div className="studio-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'design'}
            className={viewMode === 'design' ? 'active' : ''}
            onClick={() => setViewMode('design')}
          >
            Design
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'code'}
            className={viewMode === 'code' ? 'active' : ''}
            onClick={() => setViewMode('code')}
          >
            Code
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'config'}
            className={viewMode === 'config' ? 'active' : ''}
            onClick={() => setViewMode('config')}
          >
            Config
          </button>
        </div>

        <div className="studio-actions">
          <Link to={exitHref} className="btn btn-text">
            Exit
          </Link>
          <div className="dropdown">
            <button
              type="button"
              className="btn"
              onClick={() => setActionsOpen((o) => !o)}
              aria-expanded={actionsOpen}
            >
              Actions ▾
            </button>
            {actionsOpen && (
              <div className="dropdown-menu">
                <button type="button" onClick={validate}>
                  Validate
                </button>
                {!isNew && (
                  <button
                    type="button"
                    className="danger"
                    onClick={async () => {
                      if (confirm(`Delete state machine "${name}"?`)) {
                        await api.deleteStateMachine(name!)
                        queryClient.invalidateQueries({ queryKey: ['statemachines'] })
                        navigate('/machines')
                      }
                      setActionsOpen(false)
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
          {!isNew && (
            <Link to={`/machines/${encodeURIComponent(name!)}/run`} className="btn">
              Execute
            </Link>
          )}
          {isNew && (
            <button
              type="button"
              className="btn"
              disabled={!machineName || saving}
              onClick={() => handleSave(true)}
            >
              Save &amp; Run
            </button>
          )}
          <button
            type="button"
            className="btn primary"
            disabled={!machineName || saving}
            onClick={() => handleSave(false)}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {(validationMsg || saveMutation.error) && (
        <div className="studio-alerts">
          {validationMsg && <pre className="validation-msg">{validationMsg}</pre>}
          {saveMutation.error && (
            <p className="error editor-error">{(saveMutation.error as Error).message}</p>
          )}
        </div>
      )}

      {viewMode === 'design' && (
        <div className="studio-body" style={{ gridTemplateColumns: studioGridColumns }}>
          <ErrorBoundary label="Palette failed to render">
            <StatePalette
              onAdd={addStateOfType}
              open={paletteOpen}
              onToggle={() => setPaletteOpen((o) => !o)}
            />
          </ErrorBoundary>

          <div className="studio-canvas">
            <div className="canvas-toolbar">
              <div className="canvas-toolbar-left">
                {subgraphStack.length > 0 && (
                  <button type="button" onClick={popSubgraph} title="Back to parent workflow">
                    ← Back to parent
                  </button>
                )}
                {subgraphStack.length > 0 && activeSubgraph && parentState?.Type === 'Parallel' && (
                  <div className="branch-tabs">
                    {(parentState as ParallelState).Branches?.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={activeSubgraph.branchIndex === i ? 'active' : ''}
                        onClick={() => {
                          setSubgraphStack((stack) =>
                            stack.map((s, idx) =>
                              idx === stack.length - 1 ? { ...s, branchIndex: i } : s,
                            ),
                          )
                          setSelectedState(null)
                        }}
                      >
                        Branch {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <ErrorBoundary label="Graph failed to render">
              <OsmlGraphLazy
                definition={currentDefinition}
                selectedState={selectedState}
                onSelectState={setSelectedState}
                onDrillSubgraph={drillSubgraph}
                onInsertState={insertState}
                onConnectStates={connectStatesHandler}
                onReorderState={reorderState}
                onUndo={undo}
                onRedo={redo}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                onDuplicate={duplicateState}
                onDelete={removeState}
                canEditSelection={canEditSelection}
              />
            </ErrorBoundary>
          </div>

          <div className={`studio-inspector ${inspectorOpen ? '' : 'studio-inspector-collapsed'}`}>
            {!inspectorOpen ? (
              <button
                type="button"
                className="panel-rail panel-rail-right"
                onClick={() => setInspectorOpen(true)}
                title="Expand Inspector"
              >
                <span className="panel-rail-chevron">‹</span>
                <span className="panel-rail-label">Inspector</span>
              </button>
            ) : (
              <>
                <div className="inspector-header-bar">
                  <span className="inspector-header-title">Inspector</span>
                  <button
                    type="button"
                    className="panel-toggle"
                    onClick={() => setInspectorOpen(false)}
                    title="Collapse"
                  >
                    ›
                  </button>
                </div>
                <ErrorBoundary label="State form failed to render">
                  <StateFormPanel
                    definition={currentDefinition}
                    selectedState={selectedState}
                    onUpdateState={updateState}
                    onUpdateDefinition={setCurrentDefinition}
                  />
                </ErrorBoundary>
              </>
            )}
          </div>
        </div>
      )}

      {viewMode === 'code' && (
        <div className="studio-code">
          <ErrorBoundary label="JSON editor failed to render">
            <MonacoEditorLazy
              definition={currentDefinition}
              onChange={handleJsonChange}
              height="100%"
              remountKey={editorKey}
            />
          </ErrorBoundary>
        </div>
      )}

      {viewMode === 'config' && (
        <div className="studio-config">
          <div className="config-card">
            <h3>Workflow configuration</h3>
            <ErrorBoundary label="Config form failed to render">
              <StateFormPanel
                definition={currentDefinition}
                selectedState={null}
                onUpdateState={updateState}
                onUpdateDefinition={setCurrentDefinition}
              />
            </ErrorBoundary>
            {!isNew && versions && (
              <details className="versions-panel">
                <summary>Versions ({versions.length})</summary>
                <ul>
                  {versions.map((v) => (
                    <li key={v.id}>
                      v{v.version} — {new Date(v.createdAt).toLocaleString()}
                      <button
                        type="button"
                        onClick={() => {
                          const parsed = parseOsmlJson(v.osmlJson)
                          if (parsed.definition) setDefinition(parsed.definition)
                        }}
                      >
                        Load
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn" onClick={setAlias}>Set alias</button>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const GENERIC_EXAMPLE_INPUT = '{\n  "value": 42\n}'

const ORDER_EXAMPLE_INPUT = `{
  "orderId": "ORD-1001",
  "priority": "express",
  "lines": [
    { "sku": "WIDGET-A", "qty": 2, "price": 49.99 },
    { "sku": "GADGET-B", "qty": 1, "price": 129.00 },
    { "sku": "PART-C", "qty": 5, "price": 15.50 }
  ]
}`

/** Pick an example input matching the machine's shape (order pipeline, map, or generic). */
function exampleInputFor(osmlJson: string | undefined): string {
  if (!osmlJson) return GENERIC_EXAMPLE_INPUT
  const { definition } = parseOsmlJson(osmlJson)
  if (!definition?.StartAt) return GENERIC_EXAMPLE_INPUT
  if (definition.StartAt === 'ValidateOrder') return ORDER_EXAMPLE_INPUT

  // Map states need an array at their ItemsPath, so a scalar example would fail.
  const start = definition.States?.[definition.StartAt] as unknown as
    | Record<string, unknown>
    | undefined
  if (start?.Type === 'Map') {
    const itemsPath = typeof start.ItemsPath === 'string' ? start.ItemsPath : '$.items'
    const key = itemsPath.startsWith('$.') ? itemsPath.slice(2) : 'items'
    if (/^[a-zA-Z0-9_]+$/.test(key)) {
      return `{\n  "${key}": [\n    { "id": 1 },\n    { "id": 2 },\n    { "id": 3 }\n  ]\n}`
    }
  }

  return GENERIC_EXAMPLE_INPUT
}

export function StartExecution() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const [inputJson, setInputJson] = useState(GENERIC_EXAMPLE_INPUT)
  const [mode, setMode] = useState<'sync' | 'async'>('sync')
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const inputEditedRef = useRef(false)

  const { data: machine } = useQuery({
    queryKey: ['machine', name],
    queryFn: () => api.getStateMachine(name!),
    enabled: !!name,
  })

  // Prefill an input that matches the machine's shape, unless the user has typed.
  useEffect(() => {
    if (machine && !inputEditedRef.current) {
      setInputJson(exampleInputFor(machine.osmlJson))
    }
  }, [machine])

  // STANDARD workflows are async-only; the engine rejects sync starts with a 400.
  const isStandard = machine?.type === 'STANDARD'

  useEffect(() => {
    if (isStandard) setMode('async')
  }, [isStandard])

  const run = async () => {
    if (!name) return
    setError(null)
    setRunning(true)
    try {
      const input = JSON.parse(inputJson)
      const effectiveMode = isStandard ? 'async' : mode
      const result = await api.startExecution(name, effectiveMode, input)
      navigate(`/executions/${result.executionId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start execution')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="page run-page">
      <div className="page-header">
        <div>
          <p className="breadcrumb">
            <Link to="/machines">State Machines</Link>
            {' / '}
            <Link to={`/machines/${encodeURIComponent(name!)}`}>{name}</Link>
            {' / Run'}
          </p>
          <h2>Run: {name}</h2>
        </div>
        <Link to={`/machines/${encodeURIComponent(name!)}`} className="btn">Back to state machine</Link>
      </div>

      <div className="run-panel">
        <p className="hint">
          Start an execution with JSON input. Sync waits for the result; async returns immediately
          and you can watch progress under Executions.
        </p>
        <label>
          Mode
          <select
            value={isStandard ? 'async' : mode}
            disabled={isStandard}
            onChange={(e) => setMode(e.target.value as 'sync' | 'async')}
          >
            <option value="sync" disabled={isStandard}>Sync — wait for result</option>
            <option value="async">Async — run in background</option>
          </select>
        </label>
        {isStandard && (
          <p className="hint">
            STANDARD workflows run asynchronously — sync mode is only available for EXPRESS
            workflows.
          </p>
        )}
        <label>
          Input (JSON)
          <textarea
            className="json-input"
            rows={10}
            value={inputJson}
            onChange={(e) => {
              inputEditedRef.current = true
              setInputJson(e.target.value)
            }}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="button" className="btn primary" onClick={run} disabled={running}>
          {running ? 'Starting…' : 'Start execution'}
        </button>
      </div>
    </div>
  )
}
