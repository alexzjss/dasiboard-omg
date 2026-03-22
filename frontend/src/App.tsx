import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'

// ── Lazy-loaded routes — reduces initial bundle ~40% ─────────────────────────
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const KanbanPage    = lazy(() => import('@/pages/KanbanPage'))
const GradesPage    = lazy(() => import('@/pages/GradesPage'))
const CalendarPage  = lazy(() => import('@/pages/CalendarPage'))
const ProfilePage   = lazy(() => import('@/pages/ProfilePage'))
const DocentesPage  = lazy(() => import('@/pages/DocentesPage'))
const EntitiesPage  = lazy(() => import('@/pages/EntitiesPage'))
const FluxogramPage = lazy(() => import('@/pages/FluxogramPage'))
const SettingsPage    = lazy(() => import('@/pages/SettingsPage'))
const StudyRoomPage            = lazy(() => import('@/pages/StudyRoomPage'))
const PublicProfilePage        = lazy(() => import('@/pages/PublicProfilePage'))
const TurmaPage                = lazy(() => import('@/pages/TurmaPage'))
const FeedPage                 = lazy(() => import('@/pages/FeedPage'))
const SharedNotePage           = lazy(() => import('@/pages/SharedNotePage'))
const StudyRoomPersistentPage  = lazy(() => import('@/pages/StudyRoomPersistentPage'))

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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index          element={<Suspense fallback={<PageSkeleton />}><DashboardPage /></Suspense>} />
        <Route path="kanban"   element={<Suspense fallback={<PageSkeleton />}><KanbanPage /></Suspense>} />
        <Route path="grades"   element={<Suspense fallback={<PageSkeleton />}><GradesPage /></Suspense>} />
        <Route path="calendar" element={<Suspense fallback={<PageSkeleton />}><CalendarPage /></Suspense>} />
        <Route path="entities" element={<Suspense fallback={<PageSkeleton />}><EntitiesPage /></Suspense>} />
        <Route path="profile"  element={<Suspense fallback={<PageSkeleton />}><ProfilePage /></Suspense>} />
        <Route path="docentes" element={<Suspense fallback={<PageSkeleton />}><DocentesPage /></Suspense>} />
        <Route path="fluxogram" element={<Suspense fallback={<PageSkeleton />}><FluxogramPage /></Suspense>} />
        <Route path="settings"  element={<Suspense fallback={<PageSkeleton />}><SettingsPage /></Suspense>} />
        <Route path="study"     element={<Suspense fallback={<PageSkeleton />}><StudyRoomPage /></Suspense>} />
        <Route path="room"       element={<Suspense fallback={<PageSkeleton />}><StudyRoomPersistentPage /></Suspense>} />
        <Route path="room/:code" element={<Suspense fallback={<PageSkeleton />}><StudyRoomPersistentPage /></Suspense>} />
        <Route path="turma"      element={<Suspense fallback={<PageSkeleton />}><TurmaPage /></Suspense>} />
        <Route path="feed"        element={<Suspense fallback={<PageSkeleton />}><FeedPage /></Suspense>} />
        <Route path="turma/:year" element={<Suspense fallback={<PageSkeleton />}><TurmaPage /></Suspense>} />
      </Route>
      {/* Public routes — no auth required */}
      <Route path="/u/:nusp"             element={<Suspense fallback={<PageSkeleton />}><PublicProfilePage /></Suspense>} />
      <Route path="/notes/shared/:token" element={<Suspense fallback={<PageSkeleton />}><SharedNotePage /></Suspense>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
