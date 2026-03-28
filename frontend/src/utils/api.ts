import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

// ── BASE_URL resolution ────────────────────────────────────────────────────────
// Em produção (docker-compose) o nginx faz proxy /api/ → backend:8000,
// então BASE_URL = '/api' e o axios chama /api/materials, /api/events, etc.
//
// Se VITE_API_URL estiver definida E não for string vazia, usa ela.
// Isso evita o bug de VITE_API_URL="" (string vazia) — que com ?? retornaria ""
// e faria o axios chamar /materials sem prefixo, respondido pelo nginx da SPA.
//
const _rawApiUrl = import.meta.env.VITE_API_URL
const BASE_URL = (_rawApiUrl && _rawApiUrl.trim()) ? _rawApiUrl.trim() : '/api'

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
