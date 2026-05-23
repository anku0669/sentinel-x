import axios from 'axios'

// On GitHub Pages the app lives at /sentinel-x/ — no backend.
// API calls will gracefully fail; only auth uses the mock client-side system.
const baseURL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL,
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sx_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401) {
      localStorage.removeItem('sx_token')
      localStorage.removeItem('sx_user')
      // Correct path for GitHub Pages — base is /sentinel-x/
      const base = import.meta.env.BASE_URL || '/'
      if (!location.pathname.endsWith('/login')) {
        location.href = base + 'login'
      }
    }
    return Promise.reject(e)
  }
)

export default api
