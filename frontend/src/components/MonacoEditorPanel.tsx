import Editor from '@monaco-editor/react'
import type { StateMachineDefinition } from '../osml/types'
import { stringifyOsml } from '../osml/validate'

interface Props {
  definition: StateMachineDefinition
  onChange: (json: string) => void
  height?: string
  /** Bump to remount editor when definition is loaded/replaced externally. */
  remountKey?: number
}

export function MonacoEditorPanel({
  definition,
  onChange,
  height = '100%',
  remountKey = 0,
}: Props) {
  return (
    <Editor
      key={remountKey}
      height={height}
      defaultLanguage="json"
      defaultValue={stringifyOsml(definition)}
      onChange={(v) => onChange(v ?? '')}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        wordWrap: 'on',
        automaticLayout: true,
      }}
    />
  )
}
