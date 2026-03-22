import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import KanbanPage from '@/pages/KanbanPage'
import GradesPage from '@/pages/GradesPage'
import CalendarPage from '@/pages/CalendarPage'
import ProfilePage from '@/pages/ProfilePage'
import DocentesPage from '@/pages/DocentesPage'
import EntitiesPage from '@/pages/EntitiesPage'
import FluxogramPage from '@/pages/FluxogramPage'

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
        <Route index          element={<DashboardPage />} />
        <Route path="kanban"   element={<KanbanPage />} />
        <Route path="grades"   element={<GradesPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="entities" element={<EntitiesPage />} />
        <Route path="profile"  element={<ProfilePage />} />
        <Route path="docentes" element={<DocentesPage />} />
        <Route path="fluxogram" element={<FluxogramPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
