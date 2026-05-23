import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Server, Wifi, WifiOff, X, Check, AlertCircle, ExternalLink, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const KEY = 'sx_api_url'

function normalizeUrl(raw) {
  let url = raw.trim().replace(/\/+$/, '')
  if (!url) return ''
  if (!/^https?:\/\//.test(url)) url = 'http://' + url
  return url
}

export function useServerUrl() {
  const [url, setUrlState] = useState(() => localStorage.getItem(KEY) || '')
  const setUrl = (v) => { localStorage.setItem(KEY, v); setUrlState(v) }
  const clearUrl = () => { localStorage.removeItem(KEY); setUrlState('') }
  return { url, setUrl, clearUrl }
}

export default function ServerConfig({ onClose }) {
  const { url: saved, setUrl } = useServerUrl()
  const [input, setInput]   = useState(saved)
  const [status, setStatus] = useState(null) // null | 'checking' | 'ok' | 'fail'
  const [info, setInfo]     = useState('')

  // Auto-check on open if already saved
  useEffect(() => { if (saved) testConnection(saved) }, [])

  const testConnection = async (urlToTest) => {
    const url = normalizeUrl(urlToTest || input)
    if (!url) { setStatus('fail'); setInfo('Please enter a URL'); return }
    setStatus('checking')
    setInfo('Connecting…')
    try {
      // Try /docs (FastAPI), /health, or /api/health
      const endpoints = ['/api/health', '/health', '/docs', '/']
      let ok = false
      for (const ep of endpoints) {
        try {
          const r = await axios.get(url + ep, { timeout: 5000 })
          if (r.status < 500) { ok = true; break }
        } catch {}
      }
      if (ok) {
        setStatus('ok')
        setInfo(`Reachable at ${url}`)
      } else {
        setStatus('fail')
        setInfo('Server responded with errors')
      }
    } catch (e) {
      // CORS errors also mean the server EXISTS but blocked — treat as reachable
      if (e.message?.includes('Network') || e.code === 'ERR_NETWORK') {
        setStatus('fail')
        setInfo('Cannot reach server — check IP, port, and CORS settings')
      } else {
        // CORS block = server is up!
        setStatus('ok')
        setInfo(`Server responding at ${url} (CORS active)`)
      }
    }
  }

  const save = () => {
    const url = normalizeUrl(input)
    setUrl(url)
    toast.success(url ? `Backend set to ${url}` : 'Switched to demo mode')
    onClose()
    // Reload to apply new base URL everywhere
    setTimeout(() => window.location.reload(), 400)
  }

  const clearAndSave = () => {
    setInput('')
    setUrl('')
    setStatus(null)
    toast.success('Switched to demo mode')
    onClose()
    setTimeout(() => window.location.reload(), 400)
  }

  const statusColor = { ok: '#30d158', fail: '#ff2d55', checking: '#ffd60a' }[status] || '#aaa'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
          className="glass-strong p-6 w-full max-w-md relative"
          onClick={e => e.stopPropagation()}
          style={{ borderColor: 'rgba(0,255,225,0.25)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0,255,225,0.1)', border: '1px solid rgba(0,255,225,0.3)' }}>
                <Server size={18} className="text-cyber-neon" />
              </div>
              <div>
                <div className="font-bold text-white">Backend Server</div>
                <div className="text-xs font-mono text-white/40">Connect your Sentinel-X API</div>
              </div>
            </div>
            <button onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Input */}
          <label className="block text-xs font-mono text-white/50 mb-2 uppercase tracking-wider">
            API Server URL
          </label>
          <div className="flex gap-2 mb-3">
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setStatus(null) }}
              onKeyDown={e => e.key === 'Enter' && testConnection()}
              placeholder="192.168.1.100:8000  or  https://myserver.com"
              className="cyber-input flex-1 font-mono text-sm"
              spellCheck={false}
            />
            <button
              onClick={() => testConnection()}
              disabled={status === 'checking'}
              className="px-4 py-2 rounded-xl text-sm font-mono font-bold transition-all"
              style={{
                background: 'rgba(0,255,225,0.12)',
                border: '1px solid rgba(0,255,225,0.3)',
                color: '#00ffe1',
                opacity: status === 'checking' ? 0.6 : 1,
              }}
            >
              {status === 'checking' ? <Loader2 size={16} className="animate-spin" /> : 'Test'}
            </button>
          </div>

          {/* Status banner */}
          {status && (
            <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-sm font-mono"
              style={{ background: `${statusColor}15`, border: `1px solid ${statusColor}40`, color: statusColor }}>
              {status === 'checking' && <Loader2 size={14} className="animate-spin" />}
              {status === 'ok'       && <Check    size={14} />}
              {status === 'fail'     && <AlertCircle size={14} />}
              {info}
            </motion.div>
          )}

          {/* Examples */}
          <div className="mb-5">
            <div className="text-xs font-mono text-white/35 mb-2">QUICK EXAMPLES</div>
            <div className="flex flex-wrap gap-2">
              {[
                'http://localhost:8000',
                'http://192.168.1.100:8000',
                'https://api.myserver.com',
              ].map(ex => (
                <button key={ex} onClick={() => { setInput(ex); setStatus(null) }}
                  className="text-xs font-mono px-2 py-1 rounded-lg transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* How to run backend */}
          <div className="rounded-xl p-3 mb-5 text-xs font-mono"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-white/40 mb-1.5">▸ START BACKEND (on your server)</div>
            <div className="text-cyber-neon/80">cd backend</div>
            <div className="text-cyber-neon/80">pip install -r requirements.txt</div>
            <div className="text-cyber-neon/80">uvicorn app.main:app --host 0.0.0.0 --port 8000</div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={clearAndSave}
              className="flex-1 py-2.5 rounded-xl text-sm font-mono text-white/50 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Demo Mode
            </button>
            <button onClick={save}
              className="flex-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(0,255,225,0.2), rgba(139,92,246,0.2))',
                border: '1px solid rgba(0,255,225,0.4)',
                color: '#00ffe1',
                boxShadow: '0 0 20px rgba(0,255,225,0.15)',
              }}>
              Save & Connect
            </button>
          </div>

          {saved && (
            <div className="mt-3 text-center text-xs font-mono text-white/30">
              Currently: <span className="text-cyber-neon/60">{saved}</span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
