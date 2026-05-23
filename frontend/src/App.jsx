import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'

// Eager-load entry pages
import Login    from './pages/Login'
import Register from './pages/Register'

// Lazy-load protected pages (route-level code splitting)
const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Offensive    = lazy(() => import('./pages/Offensive'))
const Defensive    = lazy(() => import('./pages/Defensive'))
const ThreatMap    = lazy(() => import('./pages/ThreatMap'))
const AIAnalyst    = lazy(() => import('./pages/AIAnalyst'))
const AIRedTeam    = lazy(() => import('./pages/AIRedTeam'))
const PassLab      = lazy(() => import('./pages/PassLab'))
const Logs         = lazy(() => import('./pages/Logs'))
const Phishing     = lazy(() => import('./pages/Phishing'))
const BugBounty    = lazy(() => import('./pages/BugBounty'))
const MCPHub       = lazy(() => import('./pages/MCPHub'))
const JWT          = lazy(() => import('./pages/JWT'))
const OSINT        = lazy(() => import('./pages/OSINT'))
const ReportExport = lazy(() => import('./pages/ReportExport'))   // NEW

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="spinner" />
        <div className="text-xs font-mono text-white/55 tracking-widest uppercase">loading module…</div>
      </div>
    </div>
  )
}

function Protected({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: 'rgba(11,13,26,0.95)', color: '#fff',
          border: '1px solid rgba(0,255,225,0.3)', backdropFilter: 'blur(12px)',
        },
      }} />
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard"  element={<Protected><Dashboard /></Protected>} />
        <Route path="/offensive"  element={<Protected><Offensive /></Protected>} />
        <Route path="/defensive"  element={<Protected><Defensive /></Protected>} />
        <Route path="/threatmap"  element={<Protected><ThreatMap /></Protected>} />
        <Route path="/passlab"    element={<Protected><PassLab /></Protected>} />
        <Route path="/logs"       element={<Protected><Logs /></Protected>} />
        <Route path="/phishing"   element={<Protected><Phishing /></Protected>} />
        <Route path="/bugbounty"  element={<Protected><BugBounty /></Protected>} />
        <Route path="/jwt"        element={<Protected><JWT /></Protected>} />
        <Route path="/osint"      element={<Protected><OSINT /></Protected>} />
        <Route path="/ai"         element={<Protected><AIAnalyst /></Protected>} />
        <Route path="/airedteam"  element={<Protected><AIRedTeam /></Protected>} />
        <Route path="/mcp"        element={<Protected><MCPHub /></Protected>} />
        <Route path="/reports"    element={<Protected><ReportExport /></Protected>} />  {/* NEW */}
        <Route path="*"           element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
