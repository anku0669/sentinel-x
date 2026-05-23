import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Mail, Shield, Globe, Eye, Loader2, Copy, Check, AlertTriangle, Search, FileText, Zap, Clock, MapPin, Lock, Server } from 'lucide-react'
import api from '../utils/api'
import Layout from '../components/Layout'
import Topbar from '../components/Topbar'

function CopyBtn({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200) }}
      className="p-1.5 rounded hover:bg-white/10 text-white/60">
      {done ? <Check size={14} className="text-emerald-400"/> : <Copy size={14}/>}
    </button>
  )
}

export default function Phishing() {
  const [tab, setTab] = useState('templates')
  const [templates, setTemplates] = useState([])
  const [activeT, setActiveT] = useState(null)
  const [vars, setVars] = useState({ NAME: 'Alice', COMPANY: 'AcmeCorp', LINK: 'https://training.acmecorp.local/r/abc123', SENDER_NAME: 'Jane Doe', VENDOR: 'BlueOrbit', INV_NUM: '88472', TRACKING: '1Z999AA10123456784', COLLEAGUE: 'Mark from Sales', SERVICE: 'Microsoft 365', DATE: 'Friday 3:00 PM' })
  const [rendered, setRendered] = useState(null)

  // Email analyzer
  const [emailContent, setEmailContent] = useState(`Hi Alice,

Our records show your AcmeCorp password expires in 24 hours. Click below to verify and update immediately or your account will be locked.

Verify now → http://acme-corp-secure.tk/verify

AcmeCorp IT Support`)
  const [emailSender, setEmailSender] = useState('"AcmeCorp IT" <support@randomvendor.tk>')
  const [emailResult, setEmailResult] = useState(null)
  const [busy, setBusy] = useState(false)

  // URL analyzer (live + static)
  const [url, setUrl] = useState('http://example.com')
  const [urlResult, setUrlResult] = useState(null)
  const [deepCheck, setDeepCheck] = useState(true)

  // Lookalike
  const [brand, setBrand] = useState('paypal.com')
  const [lookalikes, setLookalikes] = useState(null)

  useEffect(() => {
    api.get('/api/phishing/templates').then(r => setTemplates(r.data.templates))
  }, [])

  const renderTemplate = async (id) => {
    setActiveT(id)
    const { data } = await api.post('/api/phishing/templates/render', { template_id: id, variables: vars })
    setRendered(data)
  }

  const analyzeEmail = async () => {
    setBusy(true); setEmailResult(null)
    try {
      const { data } = await api.post('/api/phishing/analyze/email', { content: emailContent, sender: emailSender, urls: [] })
      setEmailResult(data)
      toast[data.score >= 45 ? 'error' : 'success'](`${data.rating} (${data.score}/100)`)
    } finally { setBusy(false) }
  }

  const analyzeURL = async () => {
    setBusy(true); setUrlResult(null)
    try {
      const { data } = await api.post('/api/phishing/analyze/url/live', { url, deep: deepCheck })
      setUrlResult(data)
      const tot = (data.static?.risk_score || 0) + ((data.live?.runtime_findings || []).length * 5)
      if (tot >= 30) toast.error('Suspicious URL')
      else toast.success('Inspection complete')
    } catch (e) {
      toast.error('Inspection failed')
    } finally { setBusy(false) }
  }

  const findLookalikes = async () => {
    setBusy(true); setLookalikes(null)
    try {
      const { data } = await api.post('/api/phishing/lookalikes', { domain: brand })
      setLookalikes(data.lookalikes)
    } finally { setBusy(false) }
  }

  const ratingColor = (s) => s >= 70 ? '#ef4444' : s >= 45 ? '#f97316' : s >= 25 ? '#fbbf24' : s >= 10 ? '#22d3ee' : '#10b981'
  const sevColor = { critical: '#dc2626', high: '#f43f5e', medium: '#fbbf24', low: '#22d3ee' }

  return (
    <Layout>
      <Topbar title="Phishing Simulation Lab" subtitle="Awareness templates · email analyzer · live URL inspector · lookalike monitoring" />

      <div className="glass p-2 mb-4 inline-flex gap-1 flex-wrap">
        {[
          { id: 'templates', label: 'Email Templates', icon: Mail },
          { id: 'analyzer', label: 'Email Analyzer', icon: Eye },
          { id: 'url', label: 'URL Inspector', icon: Globe },
          { id: 'lookalike', label: 'Lookalike Finder', icon: Search },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition ${tab === t.id ? 'bg-gradient-to-r from-cyber-neon/20 to-cyber-violet/20 border border-cyber-neon/40' : 'text-white/65 hover:bg-white/5'}`}>
            <t.icon size={14}/> {t.label}
          </button>
        ))}
      </div>

      {/* TEMPLATES */}
      {tab === 'templates' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 glass p-4 max-h-[78vh] overflow-y-auto">
            <h3 className="font-bold mb-3 flex items-center gap-2"><FileText size={16}/> Templates ({templates.length})</h3>
            <div className="space-y-2">
              {templates.map(t => (
                <button key={t.id} onClick={() => renderTemplate(t.id)}
                  className={`w-full text-left p-3 rounded-lg border transition ${activeT === t.id ? 'border-cyber-neon/50 bg-cyber-neon/5' : 'border-white/10 hover:bg-white/5'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{t.name}</span>
                    <span className={`badge ml-auto ${t.difficulty === 'high' ? 'badge-critical' : t.difficulty === 'medium' ? 'badge-medium' : 'badge-low'}`}>{t.difficulty}</span>
                  </div>
                  <div className="text-[10px] text-white/55 mt-1 uppercase tracking-wider">{t.category}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="glass p-4">
              <h3 className="font-bold mb-3">Variables</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(vars).map(([k, v]) => (
                  <div key={k}>
                    <label className="text-[10px] uppercase tracking-wider text-white/55">{k}</label>
                    <input className="cyber-input text-sm" value={v} onChange={(e) => setVars(s => ({ ...s, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
              {activeT && <button onClick={() => renderTemplate(activeT)} className="btn-primary mt-3 text-sm">Re-render</button>}
            </div>

            {rendered && rendered.rendered_subject && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">{rendered.name}</h3>
                  <CopyBtn text={`Subject: ${rendered.rendered_subject}\n\n${rendered.rendered_body}`} />
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/55 mb-1">Subject</div>
                    <div className="terminal text-cyber-neon">{rendered.rendered_subject}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/55 mb-1">Body</div>
                    <div className="terminal whitespace-pre-wrap">{rendered.rendered_body}</div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="glass-dark p-3">
                      <div className="text-[10px] uppercase text-cyber-rose mb-2 font-bold">🎯 Red Flags This Teaches</div>
                      <ul className="space-y-1 text-xs">
                        {rendered.indicators_taught?.map((ind, i) => <li key={i}>▸ {ind}</li>)}
                      </ul>
                    </div>
                    <div className="glass-dark p-3">
                      <div className="text-[10px] uppercase text-cyber-neon mb-2 font-bold">🛡 Mitigation</div>
                      <div className="text-xs">{rendered.mitigation}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* EMAIL ANALYZER */}
      {tab === 'analyzer' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass p-5">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Eye size={18} className="text-cyber-neon"/> Paste an email to analyze</h3>
            <label className="text-[10px] uppercase tracking-wider text-white/55">From (header)</label>
            <input className="cyber-input mb-3 text-sm" value={emailSender} onChange={(e) => setEmailSender(e.target.value)} />
            <label className="text-[10px] uppercase tracking-wider text-white/55">Body</label>
            <textarea className="cyber-input font-mono text-xs h-56 resize-y" value={emailContent} onChange={(e) => setEmailContent(e.target.value)} />
            <button onClick={analyzeEmail} disabled={busy} className="btn-primary mt-3 flex items-center gap-2">
              {busy ? <Loader2 size={14} className="animate-spin"/> : <Shield size={14}/>} Analyze
            </button>
          </div>

          <div className="space-y-3">
            {emailResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5">
                <div className="text-xs uppercase text-white/55">Verdict</div>
                <div className="text-2xl font-black mt-1" style={{ color: ratingColor(emailResult.score) }}>{emailResult.rating}</div>
                <div className="font-mono text-sm text-white/70 mt-1">{emailResult.score}/100</div>
                <div className="h-2 mt-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${emailResult.score}%` }}
                    className="h-full rounded-full" style={{ background: ratingColor(emailResult.score) }}/>
                </div>
                <div className="mt-3 space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                  {emailResult.findings.map((f, i) => (
                    <div key={i} className="glass-dark p-2.5 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge badge-${f.severity}`}>{f.severity}</span>
                        <span className="font-medium">{f.label}</span>
                      </div>
                      {f.evidence && <div className="text-[11px] text-white/55 font-mono">{Array.isArray(f.evidence) ? f.evidence.join(', ') : f.evidence}</div>}
                    </div>
                  ))}
                  {emailResult.findings.length === 0 && <div className="text-emerald-400 text-sm">✓ No phishing indicators detected.</div>}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* URL INSPECTOR — enhanced with live check */}
      {tab === 'url' && (
        <div className="space-y-4">
          <div className="glass p-5">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Globe size={18} className="text-cyber-violet"/> Live URL Inspector</h3>
            <p className="text-xs text-white/55 mb-3">Combines static heuristics with a real HTTP fetch to follow redirects, inspect TLS, headers, and resolve IP/ASN.</p>
            <div className="flex gap-2 flex-wrap">
              <input className="cyber-input flex-1 min-w-0 font-mono text-sm" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com or suspicious-link.tld"/>
              <label className="flex items-center gap-1.5 text-xs text-white/70">
                <input type="checkbox" checked={deepCheck} onChange={(e) => setDeepCheck(e.target.checked)} className="accent-cyber-neon"/>
                Deep (live fetch)
              </label>
              <button onClick={analyzeURL} disabled={busy} className="btn-primary flex items-center gap-2">
                {busy ? <Loader2 size={14} className="animate-spin"/> : <Zap size={14}/>} Inspect
              </button>
            </div>
          </div>

          {urlResult && (
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Static analysis card */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5">
                <h4 className="font-bold mb-2 flex items-center gap-2"><AlertTriangle size={16} className="text-cyber-amber"/> Static Analysis</h4>
                {urlResult.static && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`badge badge-${urlResult.static.severity}`}>{urlResult.static.severity}</span>
                      <span className="font-black text-xl" style={{ color: ratingColor(urlResult.static.risk_score) }}>{urlResult.static.risk_score}/100</span>
                    </div>
                    <div className="text-xs font-mono text-white/55 break-all mb-3">{urlResult.static.domain}</div>
                    {urlResult.static.reasons?.length > 0 ? (
                      <ul className="space-y-1.5">
                        {urlResult.static.reasons.map((r, i) => (
                          <li key={i} className="text-xs glass-dark px-2 py-1.5 flex items-start gap-2">
                            <span className="text-cyber-amber">▸</span>{r}
                          </li>
                        ))}
                      </ul>
                    ) : <div className="text-emerald-400 text-sm">✓ No static red flags</div>}
                  </>
                )}
              </motion.div>

              {/* Live response card */}
              {urlResult.live && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5">
                  <h4 className="font-bold mb-3 flex items-center gap-2"><Server size={16} className="text-cyber-neon"/> Live Response</h4>
                  {urlResult.live.error ? (
                    <div className="text-cyber-rose text-sm">{urlResult.live.error}</div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-white/55">Final status</span><span className={`font-mono font-bold ${(urlResult.live.final_status || 0) >= 400 ? 'text-cyber-rose' : 'text-emerald-400'}`}>{urlResult.live.final_status || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-white/55"><Clock size={11} className="inline mr-1"/>Response</span><span className="font-mono">{urlResult.live.response_time_ms}ms</span></div>
                      <div className="flex justify-between"><span className="text-white/55">Redirects</span><span className="font-mono">{urlResult.live.redirects}</span></div>
                      <div className="flex justify-between"><span className="text-white/55"><MapPin size={11} className="inline mr-1"/>IP</span><span className="font-mono text-cyber-neon">{urlResult.live.ip || '—'}</span></div>
                      {urlResult.live.reverse_dns && <div className="flex justify-between gap-2"><span className="text-white/55">rDNS</span><span className="font-mono text-right truncate">{urlResult.live.reverse_dns}</span></div>}
                      {urlResult.live.asn_hint && <div className="flex justify-between"><span className="text-white/55">Hosting</span><span className="font-mono text-cyber-violet">{urlResult.live.asn_hint}</span></div>}
                      <div className="flex justify-between"><span className="text-white/55">Body size</span><span className="font-mono">{urlResult.live.body_size?.toLocaleString()} B</span></div>
                      {urlResult.live.content_type && <div className="text-[11px] font-mono text-white/55 break-all pt-1 border-t border-white/5">{urlResult.live.content_type}</div>}

                      {urlResult.live.runtime_findings?.length > 0 && (
                        <div className="pt-2 border-t border-white/5">
                          <div className="text-[10px] uppercase text-cyber-rose mb-1 font-bold">Runtime findings ({urlResult.live.runtime_findings.length})</div>
                          {urlResult.live.runtime_findings.map((f, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[11px] py-0.5">
                              <span className="px-1.5 rounded text-[9px] uppercase font-bold" style={{ background: sevColor[f.severity] + '22', color: sevColor[f.severity] }}>{f.severity}</span>
                              <span className="flex-1">{f.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TLS / chain card */}
              {urlResult.live && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5">
                  <h4 className="font-bold mb-3 flex items-center gap-2"><Lock size={16} className="text-cyber-emerald"/> TLS & Redirect Chain</h4>
                  {urlResult.live.tls && !urlResult.live.tls.error ? (
                    <div className="space-y-1 text-xs mb-3">
                      <div><span className="text-white/55">Issuer:</span> <span className="font-mono">{urlResult.live.tls.issuer_cn || urlResult.live.tls.issuer_org || '—'}</span></div>
                      <div><span className="text-white/55">Valid until:</span> <span className="font-mono">{urlResult.live.tls.valid_until}</span></div>
                      <div><span className="text-white/55">TLS:</span> <span className="font-mono text-cyber-emerald">{urlResult.live.tls.tls_version}</span></div>
                      {urlResult.live.tls.san?.length > 0 && (
                        <div className="pt-1">
                          <div className="text-white/55 text-[10px] uppercase">SAN ({urlResult.live.tls.san.length})</div>
                          <div className="font-mono text-[11px] max-h-20 overflow-y-auto">{urlResult.live.tls.san.slice(0, 8).join(', ')}{urlResult.live.tls.san.length > 8 ? '...' : ''}</div>
                        </div>
                      )}
                    </div>
                  ) : urlResult.live.tls?.error ? (
                    <div className="text-xs text-white/55 mb-3">{urlResult.live.tls.error}</div>
                  ) : (
                    <div className="text-xs text-white/55 mb-3">Not TLS</div>
                  )}

                  {urlResult.live.chain?.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase text-white/55 mb-1 font-bold">Hops</div>
                      <div className="space-y-1">
                        {urlResult.live.chain.map((h, i) => (
                          <div key={i} className="text-[11px] font-mono glass-dark px-2 py-1 flex items-center gap-2">
                            <span className={`px-1.5 rounded text-[9px] font-bold ${(h.status || 0) >= 400 ? 'bg-cyber-rose/20 text-cyber-rose' : (h.status || 0) >= 300 ? 'bg-cyber-amber/20 text-cyber-amber' : 'bg-emerald-500/20 text-emerald-400'}`}>{h.status || 'ERR'}</span>
                            <span className="flex-1 truncate">{h.url}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}

      {/* LOOKALIKE */}
      {tab === 'lookalike' && (
        <div className="glass p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2"><Search size={18} className="text-cyber-rose"/> Lookalike Domain Generator</h3>
          <p className="text-xs text-white/55 mb-3">Generate likely typo-squat / homograph variants of your domain to monitor for phishing infrastructure targeting your brand.</p>
          <div className="flex gap-2 max-w-md">
            <input className="cyber-input flex-1 font-mono" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="yourcompany.com" />
            <button onClick={findLookalikes} disabled={busy} className="btn-primary flex items-center gap-2">
              {busy ? <Loader2 size={14} className="animate-spin"/> : <Search size={14}/>} Generate
            </button>
          </div>
          {lookalikes && (
            <div className="mt-4">
              <div className="text-xs text-white/55 mb-2">{lookalikes.length} variants — register-monitor these on your defensive watch list</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {lookalikes.map((d, i) => (
                  <div key={i} className="glass-dark p-2 flex items-center gap-2 text-sm font-mono">
                    <span className="flex-1 truncate text-cyber-rose">{d}</span>
                    <CopyBtn text={d}/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 glass p-4 border border-cyber-amber/30 bg-cyber-amber/5">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-cyber-amber shrink-0 mt-0.5"/>
          <div className="text-xs text-white/75">
            <strong className="text-cyber-amber">Authorized awareness training only.</strong> These templates teach employees what phishing looks like and help you analyze suspect emails / URLs / domains. Deploy templates ONLY in internal awareness campaigns with leadership approval — never against real third parties.
          </div>
        </div>
      </div>
    </Layout>
  )
}
