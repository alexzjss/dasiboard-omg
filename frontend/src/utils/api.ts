import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

// BASE_URL sempre '/api' — o nginx faz proxy /api/ → backend
const BASE_URL = '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`

  // Quando o body é FormData (upload de arquivo), deixar o browser
  // definir o Content-Type com o boundary correto automaticamente.
  // Se o axios mantiver 'application/json', o FastAPI rejeita com 422.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

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
        const payload = refreshToken ? { refresh_token: refreshToken } : {}
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, payload, { withCredentials: true })
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
