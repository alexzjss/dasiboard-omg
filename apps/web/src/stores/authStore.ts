import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../api/client'

export interface AuthUser {
  id: string
  email: string
  displayName: string | null
  photoUrl: string | null
  bio: string | null
  turma: string | null
  role: 'USER' | 'MODERATOR' | 'ADMIN'
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  fetchMe: () => Promise<void>
  updateUser: (data: Partial<AuthUser>) => void
  setAccessToken: (token: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAccessToken(token) {
        set({ accessToken: token, isAuthenticated: true })
      },

      async login(email, password) {
        const { data } = await api.post<{ accessToken: string }>('/auth/login', { email, password })
        set({ accessToken: data.accessToken, isAuthenticated: true })
        await get().fetchMe()
      },

      async register(email, password, displayName) {
        await api.post('/auth/register', { email, password, displayName })
        await get().login(email, password)
      },

      async logout() {
        try {
          await api.post('/auth/logout')
        } catch {
          // ignora erro de rede no logout
        }
        set({ user: null, accessToken: null, isAuthenticated: false })
      },

      async refreshToken() {
        try {
          const { data } = await api.post<{ accessToken: string }>('/auth/refresh')
          set({ accessToken: data.accessToken, isAuthenticated: true })
          return true
        } catch {
          set({ user: null, accessToken: null, isAuthenticated: false })
          return false
        }
      },

      async fetchMe() {
        const { data } = await api.get<{ user: AuthUser }>('/auth/me')
        set({ user: data.user })
      },

      updateUser(data) {
        set((s) => ({ user: s.user ? { ...s.user, ...data } : null }))
      },
    }),
    {
      name: 'dasiboard-auth',
      // Persiste apenas o token e flag de autenticação; o user é recarregado via fetchMe
      partialize: (s) => ({ accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }),
    },
  ),
)
