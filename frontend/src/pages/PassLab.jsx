import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { KeyRound, Hash, Loader2 } from 'lucide-react'
import api from '../utils/api'
import Layout from '../components/Layout'
import Topbar from '../components/Topbar'

export default function PassLab() {
  const [pwd, setPwd] = useState('Tr0ub4dor&3')
  const [analysis, setAnalysis] = useState(null)
  const [hash, setHash] = useState('5f4dcc3b5aa765d61d8327deb882cf99') // md5("password")
  const [hashType, setHashType] = useState('md5')
  const [crackResult, setCrackResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const analyze = async () => {
    setBusy(true)
    try {
      const { data } = await api.post('/api/defensive/password/analyze', { password: pwd })
      setAnalysis(data)
    } catch (e) { toast.error('Analysis failed') }
    finally { setBusy(false) }
  }

  const crack = async () => {
    setBusy(true); setCrackResult(null)
    try {
      const { data } = await api.post('/api/defensive/hash/crack', { hash_value: hash, hash_type: hashType })
      setCrackResult(data)
      if (data.cracked) toast.success(`Cracked: ${data.plaintext}`)
      else toast(`Not in wordlist (${data.attempts} tries)`)
    } catch (e) { toast.error('Crack failed') }
    finally { setBusy(false) }
  }

  const ratingColor = (r) => ({
    EXCELLENT: '#10b981', STRONG: '#22d3ee', MODERATE: '#fbbf24', WEAK: '#f97316', CRITICAL: '#ef4444'
  }[r] || '#fff')

  return (
    <Layout>
      <Topbar title="Password & Hash Lab" subtitle="Strength analysis · entropy · wordlist crack simulation" />

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Strength analyzer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5">
          <h3 className="font-bold flex items-center gap-2 mb-4"><KeyRound size={18} className="text-cyber-neon"/> Password Strength Analyzer</h3>
          <div className="flex gap-2 mb-3">
            <input className="cyber-input flex-1" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="enter password to analyze" />
            <button onClick={analyze} disabled={busy} className="btn-primary flex items-center gap-2">
              {busy ? <Loader2 size={14} className="animate-spin"/> : null} Analyze
            </button>
          </div>

          {analysis && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase text-white/55">Rating</span>
                  <span className="font-black text-lg" style={{ color: ratingColor(analysis.rating) }}>{analysis.rating}</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${analysis.score}%` }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${ratingColor(analysis.rating)}, ${ratingColor(analysis.rating)}aa)` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="glass-dark p-3">
                  <div className="text-[10px] uppercase text-white/55">Entropy</div>
                  <div className="font-black text-2xl">{analysis.entropy_bits} <span className="text-xs text-white/55 font-normal">bits</span></div>
                </div>
                <div className="glass-dark p-3">
                  <div className="text-[10px] uppercase text-white/55">Crack Time</div>
                  <div className="font-bold text-lg">{analysis.estimated_crack_time}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {Object.entries(analysis.char_classes).map(([k, v]) => (
                  <span key={k} className={`badge ${v ? 'badge-low' : 'badge-medium'}`}>{v ? '✓' : '✗'} {k}</span>
                ))}
              </div>

              {analysis.issues.length > 0 && (
                <div>
                  <div className="text-xs uppercase text-white/55 mb-1">Findings</div>
                  <ul className="space-y-1">
                    {analysis.issues.map((iss, i) => (
                      <li key={i} className="text-xs glass-dark px-3 py-2 flex items-start gap-2">
                        <span className={`badge badge-${iss.severity}`}>{iss.severity}</span>
                        <span className="text-white/80">{iss.msg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Hash cracker */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5">
          <h3 className="font-bold flex items-center gap-2 mb-4"><Hash size={18} className="text-cyber-rose"/> Hash Cracker (Wordlist)</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 mb-1 block">Hash type</label>
              <select className="cyber-input" value={hashType} onChange={(e) => setHashType(e.target.value)}>
                <option value="md5">MD5</option>
                <option value="sha1">SHA-1</option>
                <option value="sha256">SHA-256</option>
                <option value="sha512">SHA-512</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/50 mb-1 block">Hash value</label>
              <input className="cyber-input font-mono text-xs" value={hash} onChange={(e) => setHash(e.target.value)} placeholder="paste hash here" />
            </div>
            <button onClick={crack} disabled={busy} className="btn-primary w-full flex items-center justify-center gap-2">
              {busy ? <Loader2 size={14} className="animate-spin"/> : <Hash size={14}/>} Crack
            </button>
          </div>

          {crackResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl border ${crackResult.cracked ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-cyber-violet/10 border-cyber-violet/40'}`}>
              {crackResult.cracked ? (
                <>
                  <div className="text-emerald-400 font-black">✓ CRACKED</div>
                  <div className="font-mono mt-1">plaintext: <span className="text-cyber-neon font-bold">{crackResult.plaintext}</span></div>
                  <div className="text-xs text-white/60 mt-1">tried {crackResult.attempts} of {crackResult.wordlist_size}</div>
                </>
              ) : (
                <>
                  <div className="text-cyber-violet font-black">✗ NOT IN WORDLIST</div>
                  <div className="text-xs text-white/60 mt-1">{crackResult.message}</div>
                  <div className="text-xs text-white/55 mt-1 font-mono">{crackResult.attempts} attempts</div>
                </>
              )}
            </motion.div>
          )}

          <div className="mt-4 text-[11px] font-mono text-white/45">
            Try: <button className="underline" onClick={() => setHash('5f4dcc3b5aa765d61d8327deb882cf99')}>5f4dcc3b…</button> (md5 of "password")
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
