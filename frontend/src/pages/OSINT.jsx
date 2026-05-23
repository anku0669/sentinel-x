import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Globe, Mail, Github, Search, Loader2, Copy, Check,
  ExternalLink, AlertTriangle, ShieldCheck, CheckCircle2,
  XCircle, Info,
} from 'lucide-react'
import api from '../utils/api'
import Layout from '../components/Layout'
import Topbar from '../components/Topbar'

function CopyBtn({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200) }}
      className="p-1 rounded hover:bg-white/10 text-white/60"
    >
      {done ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  )
}

export default function OSINT() {
  const [tab, setTab] = useState('subdomains')
  const [busy, setBusy] = useState(false)

  // Subdomains
  const [domain, setDomain] = useState('hackerone.com')
  const [subs, setSubs]     = useState(null)
  const [filter, setFilter] = useState('')

  // Email perms
  const [first, setFirst]           = useState('john')
  const [last, setLast]             = useState('doe')
  const [emailDomain, setEmailDomain] = useState('acme.com')
  const [perms, setPerms]           = useState(null)

  // GitHub dorks
  const [ghQuery, setGhQuery] = useState('acme.com')
  const [dorks, setDorks]     = useState(null)

  // Google dorks
  const [googleDomain, setGoogleDomain] = useState('acme.com')
  const [gdorks, setGdorks]             = useState(null)

  // Breach
  const [email, setEmail]   = useState('test@example.com')
  const [breach, setBreach] = useState(null)

  // Pwned password
  const [pwd, setPwd]     = useState('')
  const [pwned, setPwned] = useState(null)

  const runSubdomains = async () => {
    setBusy(true); setSubs(null); setFilter('')
    try {
      const { data } = await api.post('/api/osint/subdomains', { domain })
      setSubs(data)
      if (data.count > 0) {
        toast.success(`Found ${data.count} subdomains across ${data.sources_used?.length ?? 1} source(s)`)
      } else if (data.error) {
        toast.error('All sources failed — see results panel for details')
      } else {
        toast('No subdomains found for this domain', { icon: 'ℹ️' })
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  const runPerms = async () => {
    try {
      const { data } = await api.post('/api/osint/email-perms', { first, last, domain: emailDomain })
      setPerms(data)
    } catch { toast.error('Failed') }
  }

  const runDorks = async () => {
    try {
      const { data } = await api.post('/api/osint/github-dorks', { query: ghQuery })
      setDorks(data)
    } catch { toast.error('Failed') }
  }

  const runGoogleDorks = async () => {
    try {
      const { data } = await api.post('/api/osint/google-dorks', { domain: googleDomain })
      setGdorks(data)
    } catch { toast.error('Failed') }
  }

  const runBreach = async () => {
    setBusy(true); setBreach(null)
    try {
      const { data } = await api.post('/api/osint/breach-check', { email })
      setBreach(data)
    } finally { setBusy(false) }
  }

  const runPwned = async () => {
    setBusy(true); setPwned(null)
    try {
      const { data } = await api.post('/api/osint/password-pwned', { password: pwd })
      setPwned(data)
    } finally { setBusy(false) }
  }

  const filteredSubs = subs?.subdomains?.filter(s => !filter || s.includes(filter)) ?? []

  return (
    <Layout>
      <Topbar
        title="OSINT Hub"
        subtitle="Subdomain enum (multi-source) · email perms · GitHub/Google dorks · breach checks (k-anon)"
      />

      {/* Tab bar */}
      <div className="glass p-2 mb-4 inline-flex gap-1 flex-wrap">
        {[
          { id: 'subdomains',  label: 'Subdomains',   icon: Globe },
          { id: 'emails',      label: 'Email Perms',   icon: Mail },
          { id: 'ghdorks',     label: 'GitHub Dorks',  icon: Github },
          { id: 'googledorks', label: 'Google Dorks',  icon: Search },
          { id: 'breach',      label: 'Breach Check',  icon: ShieldCheck },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition ${
              tab === t.id
                ? 'bg-gradient-to-r from-cyber-neon/20 to-cyber-violet/20 border border-cyber-neon/40'
                : 'text-white/65 hover:bg-white/5'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── SUBDOMAINS ── */}
      {tab === 'subdomains' && (
        <div className="glass p-5 space-y-4">
          <div>
            <h3 className="font-bold flex items-center gap-2 mb-1">
              <Globe size={18} className="text-cyber-neon" />
              Subdomain Enumeration
              <span className="text-xs font-mono text-white/40">· multi-source (crt.sh → certspotter → hackertarget → DNS)</span>
            </h3>
            <p className="text-xs text-white/50">
              Tries multiple Certificate Transparency sources automatically.
              If one source is down, the next is used — results are merged.
            </p>
          </div>

          {/* Input row */}
          <div className="flex gap-2">
            <input
              className="cyber-input flex-1"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !busy && runSubdomains()}
              placeholder="target.com"
            />
            <button
              onClick={runSubdomains}
              disabled={busy || !domain.trim()}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {busy ? 'Enumerating…' : 'Enumerate'}
            </button>
          </div>

          {/* Results */}
          {subs && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

              {/* Source badges */}
              {subs.sources_used?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs text-white/40 self-center">Sources:</span>
                  {subs.sources_used.map((s, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                                 bg-green-500/10 border border-green-500/25 text-green-400"
                    >
                      <CheckCircle2 size={10} /> {s}
                    </span>
                  ))}
                  {subs.sources_failed?.map((s, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                                 bg-red-500/10 border border-red-500/20 text-red-400"
                    >
                      <XCircle size={10} /> {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Error state (all sources failed) */}
              {subs.error && subs.count === 0 && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <XCircle size={16} /> All sources failed
                  </div>
                  <p className="text-xs text-red-400/80">{subs.error}</p>
                  <p className="text-xs text-white/40 mt-2">
                    This usually means outbound HTTPS to public APIs is blocked by your Docker/network.
                    DNS brute-force still works on internal networks.
                  </p>
                </div>
              )}

              {/* Success state */}
              {subs.count > 0 && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="badge badge-info">{subs.count} found</span>
                    <input
                      className="cyber-input ml-auto max-w-[200px] text-sm py-1.5"
                      placeholder="filter results…"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                    <CopyBtn text={subs.subdomains.join('\n')} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-[55vh] overflow-y-auto pr-1">
                    {filteredSubs.map((s, i) => (
                      <motion.a
                        key={i}
                        href={`https://${s}`}
                        target="_blank"
                        rel="noreferrer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.004, 0.5) }}
                        className="glass-dark px-2.5 py-1.5 text-xs font-mono
                                   hover:border-cyber-neon/40 transition flex items-center gap-1"
                      >
                        <span className="flex-1 truncate text-cyber-neon">{s}</span>
                        <ExternalLink size={10} className="text-white/30 shrink-0" />
                      </motion.a>
                    ))}
                  </div>
                  {filteredSubs.length === 0 && filter && (
                    <p className="text-center text-white/40 text-sm py-4">
                      No subdomains match <span className="text-cyber-neon">"{filter}"</span>
                    </p>
                  )}
                </>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* ── EMAILS ── */}
      {tab === 'emails' && (
        <div className="glass p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Mail size={18} className="text-cyber-violet" /> Email Permutation Generator
          </h3>
          <p className="text-xs text-white/55 mb-3">
            Generate likely corporate email formats for a target — useful for OSINT validation.
          </p>
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] uppercase text-white/55">First name</label>
              <input className="cyber-input" value={first} onChange={(e) => setFirst(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] uppercase text-white/55">Last name</label>
              <input className="cyber-input" value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] uppercase text-white/55">Domain</label>
              <input className="cyber-input" value={emailDomain} onChange={(e) => setEmailDomain(e.target.value)} />
            </div>
          </div>
          <button onClick={runPerms} className="btn-primary">Generate</button>
          {perms && !perms.error && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-white/55">{perms.count} variants</span>
                <CopyBtn text={perms.permutations.join('\n')} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                {perms.permutations.map((e, i) => (
                  <div key={i} className="glass-dark px-2 py-1.5 text-xs font-mono flex items-center gap-2">
                    <span className="flex-1 truncate text-cyber-neon">{e}</span>
                    <CopyBtn text={e} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GITHUB DORKS ── */}
      {tab === 'ghdorks' && (
        <div className="glass p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Github size={18} className="text-cyber-amber" /> GitHub Code Search Dorks
          </h3>
          <p className="text-xs text-white/55 mb-3">
            Ready-to-paste GitHub search queries to find leaked secrets, configs, and credentials.
          </p>
          <div className="flex gap-2 mb-3">
            <input className="cyber-input flex-1" value={ghQuery} onChange={(e) => setGhQuery(e.target.value)} placeholder="company name or domain" />
            <button onClick={runDorks} className="btn-primary">Generate Dorks</button>
          </div>
          {dorks && !dorks.error && (
            <div className="space-y-1.5">
              {dorks.dorks.map((d, i) => (
                <div key={i} className="glass-dark p-2 flex items-center gap-2">
                  <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 text-xs font-mono text-cyber-neon hover:underline truncate">{d.query}</a>
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-white/55 hover:text-white p-1"><ExternalLink size={12} /></a>
                  <CopyBtn text={d.query} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── GOOGLE DORKS ── */}
      {tab === 'googledorks' && (
        <div className="glass p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Search size={18} className="text-cyber-rose" /> Google Dork Generator
          </h3>
          <p className="text-xs text-white/55 mb-3">
            Find indexed sensitive content, exposed admin panels, and pastebin leaks.
          </p>
          <div className="flex gap-2 mb-3">
            <input className="cyber-input flex-1" value={googleDomain} onChange={(e) => setGoogleDomain(e.target.value)} placeholder="target.com" />
            <button onClick={runGoogleDorks} className="btn-primary">Generate</button>
          </div>
          {gdorks && !gdorks.error && (
            <div className="space-y-1.5">
              {gdorks.dorks.map((d, i) => (
                <div key={i} className="glass-dark p-2 flex items-center gap-2">
                  <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 text-xs font-mono text-cyber-neon hover:underline truncate">{d.query}</a>
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-white/55 hover:text-white p-1"><ExternalLink size={12} /></a>
                  <CopyBtn text={d.query} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BREACH ── */}
      {tab === 'breach' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass p-5">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Mail size={18} className="text-cyber-rose" /> Email Breach Check (k-anon)
            </h3>
            <p className="text-xs text-white/55 mb-3">
              Privacy-preserving check — only the SHA-1 prefix is sent to the lookup service.
            </p>
            <div className="flex gap-2">
              <input className="cyber-input flex-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
              <button onClick={runBreach} disabled={busy} className="btn-primary flex items-center gap-2">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Check
              </button>
            </div>
            {breach && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`mt-4 p-4 rounded-xl border ${breach.found_in_breaches ? 'border-red-500/40 bg-red-500/5' : 'border-emerald-500/40 bg-emerald-500/5'}`}>
                <div className="font-black text-lg" style={{ color: breach.found_in_breaches ? '#ef4444' : '#10b981' }}>
                  {breach.found_in_breaches ? `⚠ Found in ${breach.breach_count_simulated} breach(es)` : '✓ Not found in known breaches'}
                </div>
                <div className="mt-3 space-y-1 text-xs font-mono">
                  <div><span className="text-white/55">SHA-1:</span> {breach.sha1}</div>
                  <div><span className="text-white/55">Prefix sent (k-anon):</span> <span className="text-cyber-neon">{breach.k_anon_prefix_sent}</span></div>
                  <div><span className="text-white/55">Suffix kept local:</span> <span className="text-cyber-violet">{breach.k_anon_suffix_local.slice(0, 12)}…</span></div>
                </div>
                {breach.note && <div className="mt-2 text-[11px] text-white/55 italic">{breach.note}</div>}
              </motion.div>
            )}
          </div>

          <div className="glass p-5">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-cyber-amber" /> Pwned Password Check
            </h3>
            <p className="text-xs text-white/55 mb-3">
              Check if a password appears in known breach datasets without ever sending the password.
            </p>
            <div className="flex gap-2">
              <input className="cyber-input flex-1" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="password to check" />
              <button onClick={runPwned} disabled={busy || !pwd} className="btn-primary flex items-center gap-2">
                {busy ? <Loader2 size={14} className="animate-spin" /> : 'Check'}
              </button>
            </div>
            {pwned && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`mt-4 p-4 rounded-xl border ${pwned.is_pwned ? 'border-red-500/40 bg-red-500/5' : 'border-emerald-500/40 bg-emerald-500/5'}`}>
                <div className="font-black text-lg" style={{ color: pwned.is_pwned ? '#ef4444' : '#10b981' }}>
                  {pwned.is_pwned ? `⚠ Seen ${pwned.pwned_count_simulated.toLocaleString()} times` : '✓ Not in known breach data'}
                </div>
                <div className="mt-2 text-[11px] text-white/55 font-mono">k-anon prefix: {pwned.k_anon_prefix_sent}</div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
