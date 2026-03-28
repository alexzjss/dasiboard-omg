import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

// ── BASE_URL resolution ────────────────────────────────────────────────────────
// Prioridade:
// 1. VITE_API_URL definida em build time (variável de ambiente no App Platform)
// 2. '/api' como fallback — funciona com docker-compose local onde o nginx
//    faz proxy de /api/ → backend:8000
//
// IMPORTANTE para DigitalOcean App Platform:
// Defina VITE_API_URL nas variáveis de ambiente do componente frontend:
//   https://SEU-BACKEND.ondigitalocean.app
// Sem isso, o frontend usa '/api' que aponta para si mesmo e as chamadas falham.
//
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        useAuthStore.getState().setTokens(data.access_token, data.refresh_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
