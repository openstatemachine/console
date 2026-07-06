import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AuthGuard } from './components/AuthGuard'
import { LoginGuard, SetupGuard } from './components/LoginGuard'
import { Layout } from './components/Layout'
import { Debugger } from './pages/Debugger'
import { ExecutionInspector } from './pages/ExecutionInspector'
import { ExecutionsList } from './pages/ExecutionsList'
import { Login } from './pages/Login'
import { CreateMachine } from './pages/CreateMachine'
import { MachineDetail } from './pages/MachineDetail'
import { MachineEditor, StartExecution } from './pages/MachineEditor'
import { MachinesList } from './pages/MachinesList'
import { Settings } from './pages/Settings'
import { SetupWizard } from './pages/SetupWizard'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
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
      </HashRouter>
    </AuthProvider>
  )
}
