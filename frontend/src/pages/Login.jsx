import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Shield, Lock, User, Sparkles, Eye, EyeOff, Terminal } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import AuroraBg from '../components/AuroraBg'
import ParticleField from '../components/ParticleField'

export default function Login() {
  const { login, loading } = useAuth()
  const nav = useNavigate()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [show, setShow] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    try {
      await login(u, p)
      toast.success(`Welcome back, ${u}`)
      nav('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <AuroraBg />
      <div className="absolute inset-0 -z-10 opacity-60"><ParticleField count={70}/></div>

      {/* Floating code particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 25 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute font-mono text-[10px] text-cyber-neon/30"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.2 }}
          >
            {['0x' + Math.floor(Math.random()*65535).toString(16), 'SYN', 'ACK', '01101001', 'TLS-1.3', 'AES-256'][i % 6]}
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 max-w-6xl w-full gap-8 relative">
        {/* Left: brand panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex flex-col justify-center p-2"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-cyber-neon to-cyber-violet flex items-center justify-center font-black text-cyber-bg text-2xl shadow-2xl shadow-cyber-violet/40">
              <Shield size={28} className="text-cyber-bg" strokeWidth={3} />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyber-neon to-cyber-violet blur-xl opacity-60 -z-10" />
            </div>
            <div>
              <div className="text-3xl font-black neon-text leading-none">SENTINEL-X</div>
              <div className="text-xs font-mono text-white/50 mt-1">UNIFIED · OFFENSIVE · DEFENSIVE</div>
            </div>
          </div>

          <h1 className="text-5xl font-black leading-tight tracking-tight mb-4">
            AI Cybersecurity<br />
            <span className="neon-text">Command Center</span>
          </h1>
          <p className="text-white/65 text-lg leading-relaxed mb-8 max-w-md">
            One platform. Red team and blue team. ML-powered threat intel, live attack maps,
            and an AI analyst that thinks like a senior SOC operator.
          </p>

          <div className="space-y-3 max-w-md">
            {[
              { icon: '⚔️', title: 'Offensive Suite', desc: 'Recon, port scans, payload generators, encoders' },
              { icon: '🛡️', title: 'Defensive SOC', desc: 'Threat feed, SIEM logs, ML anomaly detection' },
              { icon: '🧠', title: 'AI Analyst', desc: 'Expert-level threat advisory in natural language' },
              { icon: '🌐', title: 'Live Attack Map', desc: 'Real-time global attack visualization' },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="glass p-4 flex gap-3 items-center"
              >
                <div className="text-2xl">{f.icon}</div>
                <div>
                  <div className="font-semibold">{f.title}</div>
                  <div className="text-xs text-white/55">{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right: login card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center"
        >
          <div className="glass-strong p-8 w-full max-w-md relative overflow-hidden">
            <div className="scan-line" />

            {/* mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyber-neon to-cyber-violet flex items-center justify-center">
                <Shield size={22} className="text-cyber-bg" strokeWidth={3} />
              </div>
              <div>
                <div className="text-xl font-black neon-text">SENTINEL-X</div>
                <div className="text-[10px] text-white/50 font-mono">CYBER COMMAND</div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <Terminal size={18} className="text-cyber-neon" />
              <span className="font-mono text-sm text-white/70">{'> SECURE_ACCESS::AUTHENTICATE'}</span>
            </div>

            <h2 className="text-2xl font-bold mb-1">Welcome back, operator</h2>
            <p className="text-sm text-white/55 mb-6">Sign in to access the command center.</p>

            <form onSubmit={submit} className="space-y-5" autoComplete="off">
              {/* ── Username field ── */}
              <div>
                <label className="text-xs uppercase tracking-wider text-white/50 mb-2 block">
                  Username
                </label>
                <div className="relative flex items-center">
                  {/* icon — z-10 so it sits above input */}
                  <User
                    size={16}
                    className="absolute left-3 z-10 text-white/40 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={u}
                    onChange={(e) => setU(e.target.value)}
                    placeholder="Enter your username"
                    className="cyber-input pl-10"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* ── Password field ── */}
              <div>
                <label className="text-xs uppercase tracking-wider text-white/50 mb-2 block">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock
                    size={16}
                    className="absolute left-3 z-10 text-white/40 pointer-events-none"
                  />
                  <input
                    type={show ? 'text' : 'password'}
                    value={p}
                    onChange={(e) => setP(e.target.value)}
                    placeholder="Enter your password"
                    className="cyber-input pl-10 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 z-10 text-white/40 hover:text-white/80 transition-colors"
                    tabIndex={-1}
                  >
                    {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <span className="spinner" /> : <Sparkles size={18} />}
                {loading ? 'Authenticating…' : 'Initialize Session'}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-white/10 text-center text-xs text-white/55">
              No account?{' '}
              <Link to="/register" className="text-cyber-neon hover:underline">
                Request access
              </Link>
            </div>

            {/* Demo credentials hint */}
            <div className="mt-4 p-3 rounded-lg bg-cyber-neon/5 border border-cyber-neon/20 text-[11px] font-mono text-cyber-neon/80">
              <div className="font-bold mb-1 text-cyber-neon">DEMO CREDENTIALS</div>
              <div>Username: <span className="text-white/80">admin</span></div>
              <div>Password: <span className="text-white/80">admin1234</span></div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
