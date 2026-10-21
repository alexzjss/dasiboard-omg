import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { LoginScreen } from '../auth/LoginScreen'
import { DisciplinasPage } from '../features/disciplinas/DisciplinasPage'
import { ComunidadePage } from '../features/comunidade/ComunidadePage'
import { PersonPage } from '../features/comunidade/PersonPage'
import { EntidadesPage } from '../features/entidades/EntidadesPage'
import { HomePage } from '../features/home/HomePage'
import { NotificacoesPage } from '../features/notificacoes/NotificacoesPage'
import { PerfilPage } from '../features/perfil/PerfilPage'
import { CartaEditorPage } from '../features/perfil/carta/CartaEditorPage'
import { CartaPublicaPage } from '../features/carta/CartaPublicaPage'
import { ColecaoPage } from '../features/perfil/colecao/ColecaoPage'
import { AppLayout } from './AppLayout'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <main className="auth-loading" aria-label="Carregando autenticação"></main>
  if (status === 'anonymous') return <Navigate to="/entrar" replace />
  return children
}

export function AppRoutes() {
  return (
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
        <Route path="notificacoes" element={<NotificacoesPage />} />
        <Route path="perfil" element={<PerfilPage />} />
        <Route path="perfil/carta" element={<CartaEditorPage />} />
        <Route path="perfil/colecao" element={<ColecaoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
