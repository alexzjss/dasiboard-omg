import { useState } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { Navigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { SpaceCanvas } from '../components/SpaceCanvas'
import { useAuth } from './authContext'
import { useResolvedTheme } from '../lib/theme'

const appLogo = '/logo.png'

/** Planeta com anel e uma lua em órbita, desenhado só com tokens de cor. */
function LoginPlanet() {
  return (
    <svg className="login-planet" viewBox="0 0 220 160" role="img" aria-label="Ilustração: um planeta com anel e uma lua em órbita">
      <defs>
        <linearGradient id="login-planet-fill" x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <stop offset="0" className="login-planet-stop-a" />
          <stop offset="1" className="login-planet-stop-b" />
        </linearGradient>
        <clipPath id="login-planet-clip"><circle cx="110" cy="80" r="40" /></clipPath>
      </defs>
      <circle className="login-orbit" cx="110" cy="80" r="72" />
      <path className="login-ring" transform="rotate(-14 110 80)" d="M 36 80 A 74 18 0 0 1 184 80" />
      <circle className="login-planet-body" cx="110" cy="80" r="40" fill="url(#login-planet-fill)" />
      <g clipPath="url(#login-planet-clip)">
        <path className="login-planet-band" d="M 60 70 Q 110 58 160 74 L 160 82 Q 110 68 60 80 Z" />
        <path className="login-planet-band" d="M 60 94 Q 110 82 160 96 L 160 102 Q 110 90 60 100 Z" />
      </g>
      <path className="login-ring login-ring-front" transform="rotate(-14 110 80)" d="M 36 80 A 74 18 0 0 0 184 80" />
      <g className="login-moon-orbit">
        <circle className="login-moon" cx="182" cy="80" r="6" />
      </g>
    </svg>
  )
}

export function LoginScreen() {
  const { status, login } = useAuth()
  const resolvedTheme = useResolvedTheme()
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [error, setError] = useState('')

  async function handleSuccess(response: CredentialResponse) {
    if (!response.credential) return setError('Não foi possível concluir o login.')
    try { await login(response.credential) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível concluir o login.') }
  }

  if (status === 'loading') return <main className="auth-loading" aria-label="Carregando autenticação"></main>
  if (status === 'authenticated') return <Navigate to="/" replace />

  return <main className="login-shell">
    <SpaceCanvas theme="login" />
    <section className="login-panel" aria-labelledby="login-title">
      <img src={appLogo} alt="daSIboard" className="login-brand-logo" />
      <LoginPlanet />
      <div className="login-copy">
        <h1 id="login-title">Seu semestre de SI, num lugar só.</h1>
        <p>Grade do JupiterWeb, disciplinas com pré-requisitos, docentes e as entidades da EACH. Entra com o e-mail da USP e bora.</p>
      </div>
      <div className="login-action">
        {clientId ? <div className="google-login-wrap"><GoogleLogin key={resolvedTheme} onSuccess={handleSuccess} onError={() => setError('O login foi cancelado. Tenta de novo.')} useOneTap={false} theme={resolvedTheme === 'light' ? 'outline' : 'filled_black'} shape="pill" size="large" text="signin_with" width="320" /></div> : <div className="setup-message"><Icon name="shield" /><span>Falta configurar o <code className="mono">VITE_GOOGLE_CLIENT_ID</code> pra ativar o login com Google.</span></div>}
        {error && <p className="login-error" role="alert">{error}</p>}
        <p className="login-note"><Icon name="shield" /> Só contas <strong className="mono">@usp.br</strong></p>
      </div>
      <p className="login-footer">A gente só usa nome, e-mail e foto da sua conta Google pra te identificar.</p>
    </section>
  </main>
}
