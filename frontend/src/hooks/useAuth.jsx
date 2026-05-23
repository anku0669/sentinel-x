import { createContext, useContext, useState } from 'react'

const AuthCtx = createContext(null)

// ── Demo-mode auth — works 100% client-side on GitHub Pages ──────────────────
// Users are stored in localStorage. Pre-seeded with the demo account.

const USERS_KEY = 'sx_users'
const TOKEN_KEY = 'sx_token'
const USER_KEY  = 'sx_user'

function getUsers() {
  try {
    const stored = localStorage.getItem(USERS_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  // Default demo accounts
  const defaults = [
    { id: 1, username: 'admin',    email: 'admin@sentinel-x.io',    password: 'admin1234',  role: 'admin'   },
    { id: 2, username: 'operator', email: 'operator@sentinel-x.io', password: 'operator123', role: 'analyst' },
  ]
  localStorage.setItem(USERS_KEY, JSON.stringify(defaults))
  return defaults
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function makeToken(user) {
  // Lightweight client-side token (not cryptographic — demo only)
  const payload = btoa(JSON.stringify({ id: user.id, username: user.username, role: user.role }))
  return `demo.${payload}.ghpages`
}

function userWithoutPassword({ password: _, ...u }) { return u }

// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const login = async (username, password) => {
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 600)) // realistic delay
      const users = getUsers()
      const match = users.find(
        u => (u.username === username.trim() || u.email === username.trim()) && u.password === password
      )
      if (!match) throw new Error('Invalid username or password')

      const safe = userWithoutPassword(match)
      const token = makeToken(safe)
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY,  JSON.stringify(safe))
      setUser(safe)
      return safe
    } finally {
      setLoading(false)
    }
  }

  const register = async ({ username, email, password, role = 'analyst' }) => {
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 600))
      const users = getUsers()
      if (users.find(u => u.username === username.trim())) throw new Error('Username already taken')
      if (users.find(u => u.email === email.trim()))       throw new Error('Email already registered')

      const newUser = {
        id: Date.now(),
        username: username.trim(),
        email:    email.trim(),
        password,
        role,
      }
      saveUsers([...users, newUser])

      const safe  = userWithoutPassword(newUser)
      const token = makeToken(safe)
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY,  JSON.stringify(safe))
      setUser(safe)
      return safe
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
