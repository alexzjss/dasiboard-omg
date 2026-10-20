import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/topbar.css'
import './styles/home.css'
import './styles/nav.css'
import './styles/sidebar.css'
import './styles/login.css'
import './styles/disciplinas.css'
import './styles/docentes.css'
import './styles/entidades.css'
import './styles/onboarding.css'
import './styles/user-menu.css'
import './styles/perfil.css'
import './styles/comunidade.css'
import './styles/pessoa.css'
import App from './app/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'missing-client-id'}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
