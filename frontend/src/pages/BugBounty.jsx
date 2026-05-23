import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Bug, ListChecks, Calculator, FileText, Database, Globe, Copy, Check, ExternalLink, ChevronDown, ChevronUp, Award } from 'lucide-react'
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

const CVSS_OPTIONS = {
  AV: [{v:'N',l:'Network'},{v:'A',l:'Adjacent'},{v:'L',l:'Local'},{v:'P',l:'Physical'}],
  AC: [{v:'L',l:'Low'},{v:'H',l:'High'}],
  PR: [{v:'N',l:'None'},{v:'L',l:'Low'},{v:'H',l:'High'}],
  UI: [{v:'N',l:'None'},{v:'R',l:'Required'}],
  S:  [{v:'U',l:'Unchanged'},{v:'C',l:'Changed'}],
  C:  [{v:'N',l:'None'},{v:'L',l:'Low'},{v:'H',l:'High'}],
  I:  [{v:'N',l:'None'},{v:'L',l:'Low'},{v:'H',l:'High'}],
  A:  [{v:'N',l:'None'},{v:'L',l:'Low'},{v:'H',l:'High'}],
}
const CVSS_LABELS = {
  AV: 'Attack Vector', AC: 'Attack Complexity', PR: 'Privileges Required',
  UI: 'User Interaction', S: 'Scope', C: 'Confidentiality', I: 'Integrity', A: 'Availability',
}

export default function BugBounty() {
  const [tab, setTab] = useState('methodology')
  const [methodology, setMethodology] = useState(null)
  const [vulns, setVulns] = useState([])
  const [expandedVuln, setExpandedVuln] = useState(null)
  const [platforms, setPlatforms] = useState([])
  const [wordlists, setWordlists] = useState([])
  const [activeWL, setActiveWL] = useState(null)
  const [wlContent, setWlContent] = useState(null)

  // CVSS
  const [cvss, setCvss] = useState({ AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'H', I: 'H', A: 'N' })
  const [cvssResult, setCvssResult] = useState(null)

  // Report
  const [report, setReport] = useState({
    title: 'IDOR in /api/users/{id} allows reading any user profile',
    severity: 'High',
    cvss_score: 7.5,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    asset: 'https://target.com',
    reporter: '@yourhandle',
    summary: 'The /api/users/{id} endpoint does not verify that the requesting user owns the requested profile, allowing any authenticated user to read any other user\'s data.',
    steps: '1. Log in as user A\n2. Note your user ID: 42\n3. Request /api/users/43 with your token\n4. Observe full profile data of user 43 returned',
    poc: 'GET /api/users/43 HTTP/1.1\nHost: target.com\nAuthorization: Bearer eyJ...\n\n→ 200 OK with full profile of user 43',
    impact: 'Any authenticated user can enumerate and read sensitive PII (email, phone, address) of all platform users. With ~2M users, this is a critical data exposure.',
    fix: 'Verify ownership: ensure `requesting_user.id == requested_user.id` (or admin role). Use indirect references where possible.',
    refs: '- OWASP A01:2021 Broken Access Control\n- CWE-639\n- HackerOne disclosure: example.com/h1/12345',
  })
  const [reportMd, setReportMd] = useState(null)

  useEffect(() => {
    api.get('/api/bugbounty/methodology').then(r => setMethodology(r.data))
    api.get('/api/bugbounty/vulns').then(r => setVulns(r.data.vulns))
    api.get('/api/bugbounty/platforms').then(r => setPlatforms(r.data.platforms))
    api.get('/api/bugbounty/wordlists').then(r => setWordlists(r.data.wordlists))
  }, [])

  const calcCvss = async () => {
    const { data } = await api.post('/api/bugbounty/cvss', cvss)
    setCvssResult(data)
  }
  // Auto-calc on change
  useEffect(() => { calcCvss() }, [cvss])

  const loadWL = async (name) => {
    setActiveWL(name)
    const { data } = await api.get(`/api/bugbounty/wordlists/${name}`)
    setWlContent(data)
  }

  const generateReport = async () => {
    const { data } = await api.post('/api/bugbounty/report', report)
    setReportMd(data.markdown)
    toast.success('Report generated')
  }

  const sevColor = (s) => ({Critical:'#dc2626',High:'#f43f5e',Medium:'#fbbf24',Low:'#22d3ee',None:'#6b7280'}[s] || '#fff')

  return (
    <Layout>
      <Topbar title="Bug Bounty Hub" subtitle="Methodology · vuln library · CVSS · report templates · wordlists · platforms" />

      <div className="glass p-2 mb-4 inline-flex gap-1 flex-wrap">
        {[
          { id: 'methodology', label: 'Methodology', icon: ListChecks },
          { id: 'vulns', label: 'Vuln Library', icon: Bug },
          { id: 'cvss', label: 'CVSS Calc', icon: Calculator },
          { id: 'report', label: 'Report Template', icon: FileText },
          { id: 'wordlists', label: 'Wordlists', icon: Database },
          { id: 'platforms', label: 'Platforms', icon: Globe },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition ${tab === t.id ? 'bg-gradient-to-r from-cyber-neon/20 to-cyber-violet/20 border border-cyber-neon/40' : 'text-white/65 hover:bg-white/5'}`}>
            <t.icon size={14}/> {t.label}
          </button>
        ))}
      </div>

      {/* METHODOLOGY */}
      {tab === 'methodology' && methodology && (
        <div className="space-y-4">
          {methodology.phases.map((ph, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="glass p-5">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyber-neon to-cyber-violet text-cyber-bg flex items-center justify-center font-black text-sm">{i + 1}</span>
                {ph.name.replace(/^\d+\.\s/, '')}
              </h3>
              <ul className="space-y-1.5">
                {ph.checks.map((c, j) => (
                  <li key={j} className="text-sm flex items-start gap-2 text-white/85">
                    <span className="text-cyber-neon mt-0.5">▸</span><span>{c}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      )}

      {/* VULNS */}
      {tab === 'vulns' && (
        <div className="space-y-3">
          {vulns.map((v, i) => (
            <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              className="glass p-4">
              <button onClick={() => setExpandedVuln(expandedVuln === v.id ? null : v.id)} className="w-full flex items-center gap-3 text-left">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{v.name}</span>
                    <span className="badge badge-info">{v.owasp}</span>
                    <span className="text-xs text-cyber-emerald font-mono ml-auto md:ml-0">💰 {v.avg_payout}</span>
                  </div>
                </div>
                {expandedVuln === v.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </button>
              <AnimatePresence>
                {expandedVuln === v.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-4 grid md:grid-cols-2 gap-4">
                      <div className="glass-dark p-3">
                        <div className="text-[10px] uppercase text-cyber-violet mb-2 font-bold">Where to look</div>
                        <ul className="space-y-1 text-xs">
                          {v.where.map((w, j) => <li key={j} className="font-mono text-white/85">▸ {w}</li>)}
                        </ul>
                      </div>
                      <div className="glass-dark p-3">
                        <div className="text-[10px] uppercase text-cyber-rose mb-2 font-bold">How to test</div>
                        <ul className="space-y-1 text-xs">
                          {v.test.map((t, j) => <li key={j} className="text-white/85">▸ {t}</li>)}
                        </ul>
                      </div>
                      <div className="glass-dark p-3">
                        <div className="text-[10px] uppercase text-cyber-neon mb-2 font-bold">Fix</div>
                        <div className="text-xs text-white/85">{v.fix}</div>
                      </div>
                      <div className="glass-dark p-3">
                        <div className="text-[10px] uppercase text-cyber-amber mb-2 font-bold">Tools</div>
                        <div className="flex flex-wrap gap-1.5">
                          {v.tools.map((t, j) => <span key={j} className="badge badge-info">{t}</span>)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* CVSS */}
      {tab === 'cvss' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass p-5">
            <h3 className="font-bold mb-3">CVSS 3.1 Base Score Calculator</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(CVSS_OPTIONS).map(([k, opts]) => (
                <div key={k}>
                  <label className="text-[10px] uppercase tracking-wider text-white/55 mb-1 block font-mono">{k} · {CVSS_LABELS[k]}</label>
                  <div className="flex flex-wrap gap-1">
                    {opts.map(o => (
                      <button key={o.v} onClick={() => setCvss(c => ({ ...c, [k]: o.v }))}
                        className={`px-2.5 py-1 rounded text-xs font-mono transition ${cvss[k] === o.v ? 'bg-cyber-neon/25 text-white border border-cyber-neon/50' : 'bg-white/5 text-white/65 border border-white/10 hover:bg-white/10'}`}>
                        {o.v} <span className="text-white/40">{o.l}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-5">
            <h3 className="font-bold mb-3">Result</h3>
            {cvssResult && !cvssResult.error && (
              <>
                <div className="text-center py-4">
                  <div className="text-6xl font-black" style={{ color: sevColor(cvssResult.severity) }}>{cvssResult.score}</div>
                  <div className="text-sm uppercase tracking-wider mt-1" style={{ color: sevColor(cvssResult.severity) }}>{cvssResult.severity}</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-white/55">Impact subscore</span><span className="font-mono">{cvssResult.impact_subscore}</span></div>
                  <div className="flex justify-between"><span className="text-white/55">Exploitability subscore</span><span className="font-mono">{cvssResult.exploitability_subscore}</span></div>
                </div>
                <div className="mt-4">
                  <div className="text-[10px] uppercase text-white/55 mb-1">Vector string</div>
                  <div className="terminal text-xs flex items-center gap-2">
                    <span className="text-cyber-neon flex-1 break-all">{cvssResult.vector_string}</span>
                    <CopyBtn text={cvssResult.vector_string}/>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* REPORT */}
      {tab === 'report' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass p-5 max-h-[78vh] overflow-y-auto">
            <h3 className="font-bold mb-3 flex items-center gap-2"><FileText size={16}/> Fields</h3>
            <div className="space-y-3">
              {Object.entries(report).map(([k, v]) => {
                const isLong = ['summary','steps','poc','impact','fix','refs'].includes(k)
                return (
                  <div key={k}>
                    <label className="text-[10px] uppercase tracking-wider text-white/55 mb-1 block">{k.replace('_', ' ')}</label>
                    {isLong
                      ? <textarea className="cyber-input font-mono text-xs h-24 resize-y" value={v} onChange={(e) => setReport(s => ({ ...s, [k]: e.target.value }))}/>
                      : <input className="cyber-input text-sm" value={v} onChange={(e) => setReport(s => ({ ...s, [k]: e.target.value }))}/>
                    }
                  </div>
                )
              })}
              <button onClick={generateReport} className="btn-primary w-full">Generate Report</button>
            </div>
          </div>
          <div className="glass p-5 max-h-[78vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Markdown Output</h3>
              {reportMd && <CopyBtn text={reportMd}/>}
            </div>
            {reportMd
              ? <pre className="terminal whitespace-pre-wrap text-xs text-white/85">{reportMd}</pre>
              : <div className="text-sm text-white/55">Click "Generate Report" to render.</div>
            }
          </div>
        </div>
      )}

      {/* WORDLISTS */}
      {tab === 'wordlists' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="glass p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2"><Database size={16}/> Categories</h3>
            <div className="space-y-2">
              {wordlists.map(name => (
                <button key={name} onClick={() => loadWL(name)}
                  className={`w-full text-left p-3 rounded-lg border transition ${activeWL === name ? 'border-cyber-neon/50 bg-cyber-neon/5' : 'border-white/10 hover:bg-white/5'}`}>
                  <span className="font-mono text-sm">{name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 glass p-4">
            {wlContent ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold font-mono">{wlContent.name} ({wlContent.items.length})</h3>
                  <CopyBtn text={wlContent.items.join('\n')}/>
                </div>
                <pre className="terminal text-xs whitespace-pre-wrap max-h-[60vh] overflow-y-auto">{wlContent.items.join('\n')}</pre>
              </>
            ) : <div className="text-sm text-white/55">Pick a wordlist to view.</div>}
          </div>
        </div>
      )}

      {/* PLATFORMS */}
      {tab === 'platforms' && (
        <div className="grid md:grid-cols-2 gap-4">
          {platforms.map((p, i) => (
            <motion.a key={p.name} href={p.url} target="_blank" rel="noreferrer"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              whileHover={{ y: -4 }}
              className="glass p-5 flex items-center gap-4 group">
              <Award size={28} className="text-cyber-neon shrink-0"/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="font-bold">{p.name}</span><ExternalLink size={12} className="text-white/45 group-hover:text-cyber-neon"/></div>
                <div className="text-xs text-white/55">{p.type}</div>
                <div className="text-xs text-cyber-emerald font-mono mt-1">💰 {p.payouts}</div>
              </div>
            </motion.a>
          ))}
        </div>
      )}

      <div className="mt-6 glass p-4 border border-cyber-amber/30 bg-cyber-amber/5">
        <div className="flex items-start gap-3">
          <Bug size={18} className="text-cyber-amber shrink-0 mt-0.5"/>
          <div className="text-xs text-white/75">
            <strong className="text-cyber-amber">Hunt only in scope.</strong> Always read each program's scope, prohibited testing list, and disclosure policy before testing. The data here is reference material — apply it on authorized targets only.
          </div>
        </div>
      </div>
    </Layout>
  )
}
