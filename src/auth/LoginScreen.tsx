import { useRef, useState } from 'react'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { Navigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { SpaceCanvas } from '../components/SpaceCanvas'
import { useAuth } from './authContext'
import { useResolvedTheme } from '../lib/theme'

const appLogo = '/logo.png'

export function LoginScreen() {
  const { status, login } = useAuth()
  const resolvedTheme = useResolvedTheme()
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLElement>(null)

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    if (window.matchMedia('(pointer: coarse)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5
    panelRef.current?.style.setProperty('--panel-x', `${horizontal * 18}px`)
    panelRef.current?.style.setProperty('--panel-y', `${vertical * 14}px`)
  }

  async function handleSuccess(response: CredentialResponse) {
    if (!response.credential) return setError('Não foi possível concluir o login.')
    try { await login(response.credential) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Não foi possível concluir o login.') }
  }

  if (status === 'loading') return <main className="auth-loading" aria-label="Carregando autenticação"></main>
  if (status === 'authenticated') return <Navigate to="/" replace />

  return <main className="login-shell" onPointerMove={handlePointerMove} onPointerLeave={() => { panelRef.current?.style.setProperty('--panel-x', '0px'); panelRef.current?.style.setProperty('--panel-y', '0px') }}>
    <SpaceCanvas theme="login" />
    <section className="login-panel" ref={panelRef}>
      <div className="login-brand"><img src={appLogo} alt="daSIboard" className="login-brand-logo" /></div>
      <div className="login-copy"><p className="eyebrow">SEU CAMPUS, MAIS PERTO</p><h1>Olá, estudante<span>.</span></h1><p>Entre para acessar sua rotina acadêmica na USP em um só lugar.</p></div>
      <div className="login-action">
        {clientId ? <div className="google-login-wrap"><GoogleLogin key={resolvedTheme} onSuccess={handleSuccess} onError={() => setError('O login foi cancelado. Tente novamente.')} useOneTap={false} theme={resolvedTheme === 'light' ? 'outline' : 'filled_black'} shape="pill" size="large" text="signin_with" width="320" /></div> : <div className="setup-message"><Icon name="shield" /><span>Configure `VITE_GOOGLE_CLIENT_ID` para ativar o login Google.</span></div>}
        {error && <p className="login-error" role="alert">{error}</p>}
        <p className="login-note"><Icon name="shield" /> Acesso exclusivo para contas <strong>@usp.br</strong></p>
      </div>
      <p className="login-footer">Ao continuar, você concorda com o uso dos dados necessários para personalizar sua experiência acadêmica.</p>
    </section>
  </main>
}
