import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { LoginScreen } from '../auth/LoginScreen'
import { HomePage } from '../features/home/HomePage'
import { AppLayout } from './AppLayout'

// Páginas (exceto a Home) em chunks separados; pré-carregadas em idle para a navegação seguir instantânea.
const loadCalendarioPage = () => import('../features/calendario/CalendarioPage').then((m) => ({ default: m.CalendarioPage }))
const CalendarioPage = lazy(loadCalendarioPage)
const loadDisciplinasPage = () => import('../features/disciplinas/DisciplinasPage').then((m) => ({ default: m.DisciplinasPage }))
const DisciplinasPage = lazy(loadDisciplinasPage)
const loadComunidadePage = () => import('../features/comunidade/ComunidadePage').then((m) => ({ default: m.ComunidadePage }))
const ComunidadePage = lazy(loadComunidadePage)
const loadPersonPage = () => import('../features/comunidade/PersonPage').then((m) => ({ default: m.PersonPage }))
const PersonPage = lazy(loadPersonPage)
const loadEntidadesPage = () => import('../features/entidades/EntidadesPage').then((m) => ({ default: m.EntidadesPage }))
const EntidadesPage = lazy(loadEntidadesPage)
const loadNotificacoesPage = () => import('../features/notificacoes/NotificacoesPage').then((m) => ({ default: m.NotificacoesPage }))
const NotificacoesPage = lazy(loadNotificacoesPage)
const loadPerfilPage = () => import('../features/perfil/PerfilPage').then((m) => ({ default: m.PerfilPage }))
const PerfilPage = lazy(loadPerfilPage)
const loadCartaEditorPage = () => import('../features/perfil/carta/CartaEditorPage').then((m) => ({ default: m.CartaEditorPage }))
const CartaEditorPage = lazy(loadCartaEditorPage)
const loadCartaPublicaPage = () => import('../features/carta/CartaPublicaPage').then((m) => ({ default: m.CartaPublicaPage }))
const CartaPublicaPage = lazy(loadCartaPublicaPage)
const loadColecaoPage = () => import('../features/perfil/colecao/ColecaoPage').then((m) => ({ default: m.ColecaoPage }))
const ColecaoPage = lazy(loadColecaoPage)
const prefetchRoutes = [loadCalendarioPage, loadDisciplinasPage, loadComunidadePage, loadPersonPage, loadEntidadesPage, loadNotificacoesPage, loadPerfilPage, loadCartaEditorPage, loadColecaoPage]

function prefetchOnIdle() {
  const run = () => { prefetchRoutes.forEach((load) => { void load().catch(() => undefined) }) }
  if ('requestIdleCallback' in window) window.requestIdleCallback(run)
  else setTimeout(run, 2000)
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <main className="auth-loading" aria-label="Carregando autenticação"></main>
  if (status === 'anonymous') return <Navigate to="/entrar" replace />
  return children
}

export function AppRoutes() {
  useEffect(() => { prefetchOnIdle() }, [])
  return (
    <Suspense fallback={null}>
    <Routes>
      <Route path="/entrar" element={<LoginScreen />} />
      <Route path="/c/:handle" element={<CartaPublicaPage />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<HomePage />} />
        {import.meta.env.DEV && <Route path="dev/home" element={<HomePage />} />}
        <Route path="disciplinas" element={<DisciplinasPage />} />
        <Route path="comunidade" element={<ComunidadePage />} />
        <Route path="comunidade/:handle" element={<PersonPage />} />
        <Route path="docentes" element={<Navigate to="/comunidade?aba=docentes" replace />} />
        <Route path="entidades" element={<EntidadesPage />} />
        <Route path="entidades/:slug" element={<EntidadesPage />} />
        <Route path="calendario" element={<CalendarioPage />} />
        <Route path="notificacoes" element={<NotificacoesPage />} />
        <Route path="perfil" element={<PerfilPage />} />
        <Route path="perfil/carta" element={<CartaEditorPage />} />
        <Route path="perfil/colecao" element={<ColecaoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
