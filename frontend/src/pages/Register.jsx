import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Shield, UserPlus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import AuroraBg from '../components/AuroraBg'

export default function Register() {
  const { register, loading } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'analyst' })

  const submit = async (e) => {
    e.preventDefault()
    try {
      await register(form)
      toast.success('Account created. Welcome to SENTINEL-X.')
      nav('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AuroraBg />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-strong p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyber-neon to-cyber-violet flex items-center justify-center">
            <Shield size={22} className="text-cyber-bg" strokeWidth={3} />
          </div>
          <div>
            <div className="text-xl font-black neon-text">SENTINEL-X</div>
            <div className="text-[10px] text-white/50 font-mono">CREATE ACCOUNT</div>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-1">Request operator access</h2>
        <p className="text-sm text-white/55 mb-6">Create a new account to begin.</p>

        <form onSubmit={submit} className="space-y-4">
          <input className="cyber-input" placeholder="username" value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })} required minLength={3} />
          <input type="email" className="cyber-input" placeholder="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input type="password" className="cyber-input" placeholder="password (min 6)" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          <select className="cyber-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="analyst">Analyst</option>
            <option value="red_team">Red Team</option>
            <option value="blue_team">Blue Team</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <span className="spinner" /> : <UserPlus size={18} />}
            {loading ? 'Creating…' : 'Create Account'}
          </button>
        </form>
        <div className="mt-5 pt-5 border-t border-white/10 text-center text-xs text-white/55">
          Already have an account? <Link to="/login" className="text-cyber-neon hover:underline">Sign in</Link>
        </div>
      </motion.div>
    </div>
  )
}
