import axios from 'axios'

const TOKEN_KEY  = 'sx_token'
const SERVER_KEY = 'sx_api_url'

const api = axios.create({ timeout: 20000 })

// ── Dynamically set baseURL from localStorage on every request ────────────────
// When the user saves a server URL in ServerConfig, all API calls instantly
// point there — no page reload needed for the base URL itself.
api.interceptors.request.use((config) => {
  // Dynamic base URL — reads live from localStorage each request
  const serverUrl = localStorage.getItem(SERVER_KEY) || ''
  config.baseURL = serverUrl

  // Auth token
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`

  return config
})

// ── 401 handler ───────────────────────────────────────────────────────────────
api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('sx_user')
      const base = import.meta.env.BASE_URL || '/'
      if (!location.pathname.includes('/login')) {
        location.href = base.replace(/\/$/, '') + '/login'
      }
    }
    return Promise.reject(e)
  }
)

export default api
