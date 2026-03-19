import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import AppLayout from './components/layout/AppLayout'
import Home        from './pages/Home/Home'
import Calendar    from './pages/Calendar/Calendar'
import Schedule    from './pages/Schedule/Schedule'
import Kanban      from './pages/Kanban/Kanban'
import Newsletter  from './pages/Newsletter/Newsletter'
import Docentes    from './pages/Docentes/Docentes'
import Estudos     from './pages/Estudos/Estudos'
import NotasGPA    from './pages/NotasGPA/NotasGPA'
import Faltas      from './pages/Faltas/Faltas'
import Entidades   from './pages/Entidades/Entidades'
import Ferramentas from './pages/Ferramentas/Ferramentas'
import Desafios    from './pages/Desafios/Desafios'
import Login       from './pages/Login/Login'
import Signup      from './pages/Signup/Signup'
import Profile     from './pages/Profile/Profile'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppLoader() {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', flexDirection:'column', gap:16,
      background:'var(--bg)', color:'var(--text-muted)',
    }}>
      <div className="spinner" style={{ width:32, height:32, borderWidth:3 }} />
      <span style={{ fontSize:13 }}>Carregando…</span>
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const refreshToken   = useAuthStore((s) => s.refreshToken)

  // Tenta restaurar a sessão na inicialização via refresh token cookie
  useEffect(() => {
    const init = async () => {
      if (isAuthenticated) {
        // Tem access token salvo — valida silenciosamente
        await refreshToken().catch(() => {})
      }
      setReady(true)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <AppLoader />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"  element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="/calendar"        element={<Calendar />} />
          <Route path="/schedule"        element={<Schedule />} />
          <Route path="/newsletter"      element={<Newsletter />} />
          <Route path="/docentes"        element={<Docentes />} />
          <Route path="/estudos"         element={<Estudos />} />
          <Route path="/entidades"       element={<Entidades />} />
          <Route path="/entidades/:slug" element={<Entidades />} />
          <Route path="/ferramentas"     element={<Ferramentas />} />
          <Route path="/desafios"        element={<Desafios />} />

          <Route path="/kanban"    element={<RequireAuth><Kanban /></RequireAuth>} />
          <Route path="/notas-gpa" element={<RequireAuth><NotasGPA /></RequireAuth>} />
          <Route path="/faltas"    element={<RequireAuth><Faltas /></RequireAuth>} />
          <Route path="/profile"   element={<RequireAuth><Profile /></RequireAuth>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
