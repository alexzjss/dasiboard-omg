import { lazy, Suspense } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'

// ── Lazy-loaded routes ─────────────────────────────────────────────────────────
const DashboardPage             = lazy(() => import('@/pages/DashboardPage'))
const SocialPage                = lazy(() => import('@/pages/SocialPage'))
const EventosPage               = lazy(() => import('@/pages/EventosPage'))
const EstudoPage                = lazy(() => import('@/pages/EstudoPage'))
const KanbanPage                = lazy(() => import('@/pages/KanbanPage'))
const GradesPage                = lazy(() => import('@/pages/GradesPage'))
const CalendarPage              = lazy(() => import('@/pages/CalendarPage'))
const ProfilePage               = lazy(() => import('@/pages/ProfilePage'))
const DocentesPage              = lazy(() => import('@/pages/DocentesPage'))
const EntitiesPage              = lazy(() => import('@/pages/EntitiesPage'))
const SettingsPage              = lazy(() => import('@/pages/SettingsPage'))
const StudyRoomPage             = lazy(() => import('@/pages/StudyRoomPage'))
const PublicProfilePage         = lazy(() => import('@/pages/PublicProfilePage'))
const TurmaPage                 = lazy(() => import('@/pages/TurmaPage'))
const FeedPage                  = lazy(() => import('@/pages/FeedPage'))
const SharedNotePage            = lazy(() => import('@/pages/SharedNotePage'))
const StudyRoomPersistentPage   = lazy(() => import('@/pages/StudyRoomPersistentPage'))
const SchedulePage              = lazy(() => import('@/pages/SchedulePage'))

// ── Skeleton fallback ─────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="px-4 py-6 max-w-4xl mx-auto space-y-4 animate-in">
      <div className="shimmer h-32 rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[0,1,2,3,4,5].map(i => <div key={i} className="shimmer h-24 rounded-2xl" />)}
      </div>
      <div className="shimmer h-48 rounded-2xl" />
    </div>
  )
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── Protected app shell ── */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          {/* ── Início ── */}
          <Route index element={<S><DashboardPage /></S>} />

          {/* ── Social ── */}
          <Route path="social" element={<S><SocialPage /></S>} />
          <Route path="social/feed" element={<S><FeedPage /></S>} />
          <Route path="social/entities" element={<S><EntitiesPage /></S>} />
          <Route path="social/turma" element={<S><TurmaPage /></S>} />
          <Route path="social/turma/:year" element={<S><TurmaPage /></S>} />
          <Route path="social/room" element={<S><StudyRoomPersistentPage /></S>} />
          <Route path="social/room/:code" element={<S><StudyRoomPersistentPage /></S>} />

          {/* ── Eventos ── */}
          <Route path="eventos" element={<S><EventosPage /></S>} />
          <Route path="eventos/calendar" element={<S><CalendarPage /></S>} />
          <Route path="eventos/schedule" element={<S><SchedulePage /></S>} />

          {/* ── Estudo ── */}
          <Route path="estudo" element={<S><EstudoPage /></S>} />
          <Route path="estudo/grades" element={<S><GradesPage /></S>} />
          <Route path="estudo/kanban" element={<S><KanbanPage /></S>} />
          <Route path="estudo/docentes" element={<S><DocentesPage /></S>} />
          <Route path="estudo/study" element={<S><StudyRoomPage /></S>} />

          {/* ── Perfil ── */}
          <Route path="perfil" element={<S><ProfilePage /></S>} />
          <Route path="perfil/settings" element={<S><SettingsPage /></S>} />

          {/* ── Legacy redirects (keep old links working) ── */}
          <Route path="feed"        element={<Navigate to="/social/feed" replace />} />
          <Route path="entities"    element={<Navigate to="/social/entities" replace />} />
          <Route path="turma"       element={<Navigate to="/social/turma" replace />} />
          <Route path="turma/:year" element={<Navigate to="/social/turma" replace />} />
          <Route path="room"        element={<Navigate to="/social/room" replace />} />
          <Route path="room/:code"  element={<Navigate to="/social/room" replace />} />
          <Route path="calendar"    element={<Navigate to="/eventos/calendar" replace />} />
          <Route path="grades"      element={<Navigate to="/estudo/grades" replace />} />
          <Route path="kanban"      element={<Navigate to="/estudo/kanban" replace />} />
          <Route path="docentes"    element={<Navigate to="/estudo/docentes" replace />} />
          <Route path="study"       element={<Navigate to="/estudo/study" replace />} />
          <Route path="profile"     element={<Navigate to="/perfil" replace />} />
          <Route path="settings"    element={<Navigate to="/perfil/settings" replace />} />
        </Route>

        {/* ── Public routes — no auth required ── */}
        <Route path="/u/:nusp"             element={<S><PublicProfilePage /></S>} />
        <Route path="/notes/shared/:token" element={<S><SharedNotePage /></S>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
