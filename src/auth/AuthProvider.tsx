import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiFetch } from '../lib/api'
import { clearStoredSchedule, loadStoredUser, saveStoredUser } from '../lib/storage'
import { AuthContext, developmentHomePath, type AuthContextValue } from './authContext'
import type { User } from './types'


const developmentUser: User = { name: 'Estudante Local', email: 'estudante@usp.br' }

export function AuthProvider({ children }: { children: ReactNode }) {
  // Resolved once: /dev/home keeps the fake user while navigating inside the SPA.
  const [developmentHome] = useState(() => import.meta.env.DEV && window.location.pathname === developmentHomePath)
  const [user, setUser] = useState<User | null>(() => developmentHome ? developmentUser : loadStoredUser())
  const [authReady, setAuthReady] = useState(() => developmentHome || user !== null)

  useEffect(() => {
    if (developmentHome) return
    let lastCheck = 0
    function checkSession() {
      lastCheck = Date.now()
      return apiFetch('/api/auth/me').then(async (response) => {
        if (response.ok) {
          const data = await response.json() as { user: User }
          setUser(data.user)
          saveStoredUser(data.user)
        } else if (response.status === 401) {
          setUser(null)
          saveStoredUser(null)
        }
      }).catch(() => {
        // Server unreachable: keep the cached user instead of logging out
      })
    }
    checkSession().finally(() => setAuthReady(true))
    function onVisible() {
      if (document.visibilityState === 'visible' && Date.now() - lastCheck > 10 * 60 * 1000) void checkSession()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [developmentHome])

  useEffect(() => { document.title = user ? 'daSIboard' : 'daSIboard · Entrar' }, [user])

  const value = useMemo<AuthContextValue>(() => {
    async function login(credential: string) {
      let response: Response
      try {
        response = await apiFetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) })
      } catch {
        throw new Error('Servidor de autenticação indisponível. Inicie `npm run dev:server` e tente novamente.')
      }
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(data?.error || `Falha no servidor de autenticação (${response.status}).`)
      }
      const data = await response.json() as { user: User }
      setUser(data.user)
      saveStoredUser(data.user)
    }

    async function logout() {
      try { await apiFetch('/api/auth/logout', { method: 'POST' }) } catch { /* sign out locally anyway */ }
      if (user) clearStoredSchedule(user.email)
      saveStoredUser(null)
      setUser(null)
    }

    return { status: !authReady ? 'loading' : user ? 'authenticated' : 'anonymous', user, login, logout }
  }, [authReady, user])

  return <AuthContext value={value}>{children}</AuthContext>
}
