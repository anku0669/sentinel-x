import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Key, Shield, AlertTriangle, Loader2, Copy, Check, Hash, Lock, Unlock, FileJson } from 'lucide-react'
import api from '../utils/api'
import Layout from '../components/Layout'
import Topbar from '../components/Topbar'

const SAMPLE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0IiwicGFzc3dvcmQiOiJoYWNrbWUiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE2NjAwMDAwMDB9.BGv9kU6NKqL3wVAgWZk5pHxkqJW7TkMiGd92DtQyDmI'

function CopyBtn({ text, label }) {
  const [done, setDone] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200) }}
      className="p-1.5 rounded hover:bg-white/10 text-white/60">
      {done ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>}
    </button>
  )
}

export default function JWT() {
  const [token, setToken] = useState(SAMPLE_JWT)
  const [audit, setAudit] = useState(null)
  const [crack, setCrack] = useState(null)
  const [busy, setBusy] = useState(false)
  const [crackBusy, setCrackBusy] = useState(false)

  const runAudit = async () => {
    if (!token.trim()) return
    setBusy(true); setAudit(null)
    try {
      const { data } = await api.post('/api/jwt/audit', { token })
      setAudit(data)
      const critCount = data.issues.filter(i => i.severity === 'critical').length
      if (critCount) toast.error(`${critCount} critical JWT issues`)
      else toast.success('JWT decoded')
    } catch (e) { toast.error('Decode failed') }
    finally { setBusy(false) }
  }

  const runCrack = async () => {
    if (!token.trim()) return
    setCrackBusy(true); setCrack(null)
    try {
      const { data } = await api.post('/api/jwt/crack', { token })
      setCrack(data)
      if (data.cracked) toast.success(`Cracked: ${data.secret}`)
      else toast(`Not in wordlist (${data.attempts} tries)`)
    } catch (e) { toast.error('Crack failed') }
    finally { setCrackBusy(false) }
  }

  const sevColor = { critical: '#dc2626', high: '#f43f5e', medium: '#fbbf24', low: '#22d3ee', info: '#9ca3af' }
  const parts = (token || '').split('.')

  return (
    <Layout>
      <Topbar title="JWT Toolkit" subtitle="Decode · audit · dictionary-attack JSON Web Tokens" />

      <div className="glass p-5 mb-4">
        <label className="text-[10px] uppercase tracking-wider text-white/55 mb-2 block">Paste JWT</label>
        <textarea
          rows={4}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="cyber-input font-mono text-xs resize-y"
          placeholder="eyJ...header.eyJ...payload.signature"
        />
        {parts.length === 3 && (
          <div className="mt-2 text-xs font-mono flex flex-wrap gap-1">
            <span className="px-2 py-0.5 rounded bg-cyber-violet/20 text-cyber-violet break-all">{parts[0].slice(0, 30)}...</span>
            <span className="text-white/40 self-center">.</span>
            <span className="px-2 py-0.5 rounded bg-cyber-neon/20 text-cyber-neon break-all">{parts[1].slice(0, 30)}...</span>
            <span className="text-white/40 self-center">.</span>
            <span className="px-2 py-0.5 rounded bg-cyber-rose/20 text-cyber-rose break-all">{parts[2].slice(0, 20)}...</span>
          </div>
        )}
        <div className="mt-3 flex gap-2 flex-wrap">
          <button onClick={runAudit} disabled={busy} className="btn-primary flex items-center gap-2">
            {busy ? <Loader2 size={14} className="animate-spin"/> : <FileJson size={14}/>} Decode + Audit
          </button>
          <button onClick={runCrack} disabled={crackBusy} className="btn-ghost flex items-center gap-2">
            {crackBusy ? <Loader2 size={14} className="animate-spin"/> : <Unlock size={14}/>} Crack Secret (HS*)
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Decoded */}
        {audit && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="glass p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold flex items-center gap-2"><Lock size={16} className="text-cyber-violet"/> Header</h3>
                <CopyBtn text={JSON.stringify(audit.decoded.header, null, 2)}/>
              </div>
              <pre className="terminal text-xs whitespace-pre-wrap break-all">{JSON.stringify(audit.decoded.header, null, 2)}</pre>
            </div>
            <div className="glass p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold flex items-center gap-2"><FileJson size={16} className="text-cyber-neon"/> Payload</h3>
                <CopyBtn text={JSON.stringify(audit.decoded.payload, null, 2)}/>
              </div>
              <pre className="terminal text-xs whitespace-pre-wrap break-all">{JSON.stringify(audit.decoded.payload, null, 2)}</pre>

              {audit.privilege_claims && audit.privilege_claims.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wider text-cyber-rose mb-1 font-bold">⚡ Privilege claims (high-impact for IDOR / privesc testing)</div>
                  {audit.privilege_claims.map((p, i) => (
                    <div key={i} className="text-xs font-mono glass-dark px-2 py-1 mb-1">
                      <span className="text-cyber-rose">{p.key}</span>: <span className="text-white/85">{JSON.stringify(p.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Issues + Crack */}
        <div className="space-y-3">
          {audit && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass p-5">
              <h3 className="font-bold flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-cyber-amber"/> Security Issues ({audit.issues.length})</h3>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                {audit.issues.map((iss, i) => (
                  <div key={i} className="glass-dark p-2.5 border-l-2" style={{ borderColor: sevColor[iss.severity] || '#fff' }}>
                    <div className="flex items-center gap-2">
                      <span className="badge" style={{ background: sevColor[iss.severity] + '22', color: sevColor[iss.severity], border: `1px solid ${sevColor[iss.severity]}55` }}>{iss.severity}</span>
                      <span className="text-sm">{iss.label}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-xs">
                <div className="glass-dark p-2 text-center"><div className="text-[10px] text-white/55">ALG</div><div className="font-mono font-bold mt-1">{audit.alg}</div></div>
                <div className="glass-dark p-2 text-center"><div className="text-[10px] text-white/55">CLAIMS</div><div className="font-mono font-bold mt-1">{audit.claim_count}</div></div>
                <div className="glass-dark p-2 text-center"><div className="text-[10px] text-white/55">SUBJECT</div><div className="font-mono text-[11px] mt-1 truncate">{audit.subject || '—'}</div></div>
              </div>
            </motion.div>
          )}

          {crack && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`glass p-5 border ${crack.cracked ? 'border-cyber-rose/50 bg-cyber-rose/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
              <h3 className="font-bold flex items-center gap-2 mb-2">
                <Hash size={16} className={crack.cracked ? 'text-cyber-rose' : 'text-emerald-400'}/>
                {crack.cracked ? 'SECRET CRACKED' : 'Secret not in wordlist'}
              </h3>
              {crack.cracked ? (
                <>
                  <div className="text-2xl font-black font-mono text-cyber-rose break-all">{crack.secret}</div>
                  <div className="text-xs text-white/60 mt-1">tried {crack.attempts} of {crack.wordlist_size} ({crack.alg})</div>
                  <div className="text-xs text-white/55 mt-2">⚠ This secret is now compromised — rotate keys immediately on the issuing service.</div>
                </>
              ) : (
                <>
                  <div className="text-sm">{crack.message || crack.error}</div>
                  {crack.attempts && <div className="text-xs text-white/55 mt-1 font-mono">{crack.attempts} attempts</div>}
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-3 text-xs">
        <div className="glass p-4">
          <div className="text-cyber-neon font-bold mb-1">🔐 Decoding</div>
          <div className="text-white/70">JWT is just base64-encoded JSON. Anyone can read the payload — never put secrets there.</div>
        </div>
        <div className="glass p-4">
          <div className="text-cyber-amber font-bold mb-1">🔍 Audit</div>
          <div className="text-white/70">Checks alg:none, missing exp, long lifetime, kid path traversal, sensitive claims, missing iss/aud.</div>
        </div>
        <div className="glass p-4">
          <div className="text-cyber-rose font-bold mb-1">💥 Crack</div>
          <div className="text-white/70">For HS256/HS384/HS512. Built-in 30-secret wordlist. Replace with rockyou.txt for production audits.</div>
        </div>
      </div>
    </Layout>
  )
}
