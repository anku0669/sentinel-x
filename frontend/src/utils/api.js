import axios from 'axios'
import getMockResponse from './mockData'

const TOKEN_KEY  = 'sx_token'
const SERVER_KEY = 'sx_api_url'

const api = axios.create({ timeout: 20000 })

// ── Mock adapter — kicks in when no backend server is configured ──────────────
function mockAdapter(config) {
  return new Promise((resolve) => {
    // Slight delay so the UI feels realistic
    setTimeout(() => {
      const data = getMockResponse(config.method, config.url)
      resolve({
        data,
        status: 200,
        statusText: 'OK (demo)',
        headers: { 'content-type': 'application/json' },
        config,
      })
    }, 300 + Math.random() * 500)
  })
}

// ── Request interceptor — set baseURL or mock ─────────────────────────────────
api.interceptors.request.use((config) => {
  const serverUrl = localStorage.getItem(SERVER_KEY) || ''

  if (!serverUrl) {
    // No backend — use mock adapter for everything
    config.adapter = mockAdapter
  } else {
    config.baseURL = serverUrl
  }

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
