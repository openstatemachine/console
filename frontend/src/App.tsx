import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AuthGuard } from './components/AuthGuard'
import { LoginGuard, SetupGuard } from './components/LoginGuard'
import { Layout } from './components/Layout'
import { PageLoader } from './components/PageLoader'

const SetupWizard = lazy(() =>
  import('./pages/SetupWizard').then((m) => ({ default: m.SetupWizard })),
)
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const MachinesList = lazy(() =>
  import('./pages/MachinesList').then((m) => ({ default: m.MachinesList })),
)
const CreateMachine = lazy(() =>
  import('./pages/CreateMachine').then((m) => ({ default: m.CreateMachine })),
)
const MachineDetail = lazy(() =>
  import('./pages/MachineDetail').then((m) => ({ default: m.MachineDetail })),
)
const MachineEditor = lazy(() =>
  import('./pages/MachineEditor').then((m) => ({ default: m.MachineEditor })),
)
const StartExecution = lazy(() =>
  import('./pages/MachineEditor').then((m) => ({ default: m.StartExecution })),
)
const ExecutionsList = lazy(() =>
  import('./pages/ExecutionsList').then((m) => ({ default: m.ExecutionsList })),
)
const ExecutionInspector = lazy(() =>
  import('./pages/ExecutionInspector').then((m) => ({ default: m.ExecutionInspector })),
)
const Debugger = lazy(() => import('./pages/Debugger').then((m) => ({ default: m.Debugger })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/setup"
              element={
                <>
                  <SetupGuard />
                  <SetupWizard />
                </>
              }
            />
            <Route
              path="/login"
              element={
                <>
                  <LoginGuard />
                  <Login />
                </>
              }
            />
            <Route element={<AuthGuard />}>
              <Route element={<Layout />}>
                <Route index element={<MachinesList />} />
                <Route path="machines" element={<MachinesList />} />
                <Route path="machines/create" element={<CreateMachine />} />
                <Route path="machines/new" element={<Navigate to="/machines/new/edit" replace />} />
                <Route path="machines/:name/run" element={<StartExecution />} />
                <Route path="machines/:name/edit" element={<MachineEditor />} />
                <Route path="machines/:name" element={<MachineDetail />} />
                <Route path="executions" element={<ExecutionsList />} />
                <Route path="executions/:id" element={<ExecutionInspector />} />
                <Route path="executions/:id/debug" element={<Debugger />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </AuthProvider>
  )
}
