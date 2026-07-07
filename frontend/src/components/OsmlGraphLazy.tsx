import { lazy, Suspense, type ComponentProps } from 'react'
import { PageLoader } from './PageLoader'

const OsmlGraph = lazy(() =>
  import('./OsmlGraph').then((module) => ({ default: module.OsmlGraph })),
)

export function OsmlGraphLazy(props: ComponentProps<typeof OsmlGraph>) {
  return (
    <Suspense fallback={<PageLoader />}>
      <OsmlGraph {...props} />
    </Suspense>
  )
}
