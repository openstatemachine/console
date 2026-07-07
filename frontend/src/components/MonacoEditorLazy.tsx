import { lazy, Suspense, type ComponentProps } from 'react'
import { PageLoader } from './PageLoader'

const MonacoEditorPanel = lazy(() =>
  import('./MonacoEditorPanel').then((module) => ({ default: module.MonacoEditorPanel })),
)

export function MonacoEditorLazy(props: ComponentProps<typeof MonacoEditorPanel>) {
  return (
    <Suspense fallback={<PageLoader />}>
      <MonacoEditorPanel {...props} />
    </Suspense>
  )
}
