import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Sword, Radar, Code2, Globe, Copy, Check, Loader2 } from 'lucide-react'
import api from '../utils/api'
import Layout from '../components/Layout'
import Topbar from '../components/Topbar'

const PAYLOAD_TABS = [
  { id: 'reverse_shell', label: 'Reverse Shell' },
  { id: 'xss', label: 'XSS' },
  { id: 'sqli', label: 'SQL Injection' },
  { id: 'lfi', label: 'LFI' },
  { id: 'encode', label: 'Encoder' },
]

function Copyable({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setDone(true); setTimeout(() => setDone(false), 1500)
      }}
      className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition"
      title="Copy"
    >
      {done ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  )
}

export default function Offensive() {
  const [target, setTarget] = useState('scanme.nmap.org')
  const [scanResult, setScanResult] = useState(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [webResult, setWebResult] = useState(null)
  const [webLoading, setWebLoading] = useState(false)

  const [payloadTab, setPayloadTab] = useState('reverse_shell')
  const [lhost, setLhost] = useState('10.10.14.1')
  const [lport, setLport] = useState(4444)
  const [encText, setEncText] = useState("cat /etc/passwd")
  const [payloadResult, setPayloadResult] = useState(null)
  const [payloadLoading, setPayloadLoading] = useState(false)

  const runPortScan = async () => {
    setScanLoading(true); setScanResult(null)
    try {
      const { data } = await api.post('/api/offensive/scan/port', { target, scan_type: 'port' })
      setScanResult(data)
      toast.success(`Scan complete · ${data.open_count || 0} open ports`)
    } catch (e) { toast.error('Scan failed') }
    finally { setScanLoading(false) }
  }
  const runWebRecon = async () => {
    setWebLoading(true); setWebResult(null)
    try {
      const { data } = await api.post('/api/offensive/scan/web', { target, scan_type: 'web_recon' })
      setWebResult(data)
      toast.success('Web recon complete')
    } catch (e) { toast.error('Recon failed') }
    finally { setWebLoading(false) }
  }
  const genPayload = async () => {
    setPayloadLoading(true); setPayloadResult(null)
    try {
      const body = { payload_type: payloadTab, target_os: 'linux', lhost, lport: Number(lport), options: payloadTab === 'encode' ? { text: encText } : undefined }
      const { data } = await api.post('/api/offensive/payload/generate', body)
      setPayloadResult(data)
      toast.success('Payload generated')
    } catch (e) { toast.error('Generation failed') }
    finally { setPayloadLoading(false) }
  }

  const riskColor = scanResult?.risk_score >= 70 ? '#ef4444' : scanResult?.risk_score >= 40 ? '#fbbf24' : '#10b981'

  return (
    <Layout>
      <Topbar title="Red Team Operations" subtitle="Reconnaissance · vulnerability assessment · payload crafting" />

      {/* Target input */}
      <div className="glass p-5 mb-6">
        <label className="text-xs uppercase tracking-wider text-white/50 mb-1.5 block">Target Host / URL</label>
        <div className="flex gap-3">
          <input className="cyber-input flex-1" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="example.com or http://target.tld" />
          <button onClick={runPortScan} disabled={scanLoading} className="btn-primary flex items-center gap-2">
            {scanLoading ? <Loader2 size={16} className="animate-spin" /> : <Radar size={16} />} Port Scan
          </button>
          <button onClick={runWebRecon} disabled={webLoading} className="btn-ghost flex items-center gap-2">
            {webLoading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />} Web Recon
          </button>
        </div>
        <p className="text-xs text-white/45 mt-2">⚠️ Use only against systems you own or have explicit written permission to test.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Port scan results */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2"><Radar size={18} className="text-cyber-neon" /> Port Scan Results</h3>
            {scanResult && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/55">Risk</span>
                <span className="font-black font-mono text-lg" style={{ color: riskColor }}>{scanResult.risk_score}/100</span>
              </div>
            )}
          </div>
          {!scanResult && !scanLoading && <div className="text-sm text-white/50">Run a scan to see open ports, banners, and known CVEs.</div>}
          {scanLoading && <div className="terminal text-cyber-neon"><span className="terminal-prompt" />probing 20 ports… please wait</div>}
          {scanResult && (
            <div>
              <div className="text-xs font-mono text-white/55 mb-2">resolved → {scanResult.resolved_ip || scanResult.error}</div>
              <div className="space-y-2 max-h-[320px] overflow-auto pr-2">
                {scanResult.open_ports?.map((p, i) => (
                  <div key={i} className="glass-dark p-3">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-info">PORT {p.port}</span>
                      <span className="font-mono text-sm font-bold">{p.service}</span>
                      <span className="ml-auto pulse-dot danger" />
                    </div>
                    {p.banner && <div className="text-[11px] font-mono text-white/55 mt-1 truncate">{p.banner}</div>}
                    {p.vulnerabilities?.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {p.vulnerabilities.map((v, j) => (
                          <li key={j} className="text-xs text-cyber-rose flex items-start gap-1.5">
                            <span>▸</span><span>{v}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                {scanResult.open_ports?.length === 0 && <div className="text-sm text-emerald-400">No common ports open. Looks tight.</div>}
              </div>
            </div>
          )}
        </motion.div>

        {/* Web recon */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5">
          <h3 className="font-bold flex items-center gap-2 mb-3"><Globe size={18} className="text-cyber-violet" /> Web Recon</h3>
          {!webResult && !webLoading && <div className="text-sm text-white/50">Discover stack, security headers, and info disclosure.</div>}
          {webLoading && <div className="terminal text-cyber-violet"><span className="terminal-prompt"/>fingerprinting target…</div>}
          {webResult && !webResult.error && (
            <div className="space-y-3">
              <div>
                <div className="text-xs uppercase text-white/50 mb-1">Status / Tech</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="badge badge-info">HTTP {webResult.status}</span>
                  {webResult.technologies?.map((t) => <span key={t} className="badge badge-low">{t}</span>)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-white/50 mb-1">Security Issues</div>
                <ul className="space-y-1">
                  {webResult.security_issues?.map((s, i) => (
                    <li key={i} className="text-xs glass-dark px-3 py-2 flex items-start gap-2">
                      <span className="badge badge-medium">{s.type}</span>
                      <span className="text-white/75">{s.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-xs">
                <span className="text-white/55">Risk:</span> <span className="font-bold" style={{ color: webResult.risk_score >= 50 ? '#ef4444' : '#fbbf24' }}>{webResult.risk_score}/100</span>
              </div>
            </div>
          )}
          {webResult?.error && <div className="text-cyber-rose text-sm">{webResult.error}</div>}
        </motion.div>
      </div>

      {/* Payload generator */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5">
        <h3 className="font-bold flex items-center gap-2 mb-1"><Code2 size={18} className="text-cyber-rose" /> Payload Forge</h3>
        <p className="text-xs text-white/50 mb-4">Generate offensive payloads for authorized testing.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {PAYLOAD_TABS.map((t) => (
            <button key={t.id}
              onClick={() => setPayloadTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                payloadTab === t.id ? 'bg-gradient-to-r from-cyber-neon to-cyber-violet text-cyber-bg font-semibold' : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {payloadTab === 'reverse_shell' && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input className="cyber-input" placeholder="LHOST (your IP)" value={lhost} onChange={(e) => setLhost(e.target.value)} />
            <input className="cyber-input" type="number" placeholder="LPORT" value={lport} onChange={(e) => setLport(e.target.value)} />
          </div>
        )}
        {payloadTab === 'encode' && (
          <input className="cyber-input mb-3" placeholder="Text to encode" value={encText} onChange={(e) => setEncText(e.target.value)} />
        )}

        <button onClick={genPayload} disabled={payloadLoading} className="btn-primary flex items-center gap-2">
          {payloadLoading ? <Loader2 size={16} className="animate-spin" /> : <Sword size={16} />}
          Generate
        </button>

        {payloadResult?.payloads && (
          <div className="mt-4 space-y-2">
            {Array.isArray(payloadResult.payloads)
              ? payloadResult.payloads.map((p, i) => (
                <div key={i} className="terminal flex items-start gap-2">
                  <code className="flex-1 break-all whitespace-pre-wrap text-cyber-neon">{p}</code>
                  <Copyable text={p} />
                </div>
              ))
              : Object.entries(payloadResult.payloads).map(([k, v]) => (
                <div key={k} className="terminal">
                  <div className="text-[10px] uppercase tracking-wider text-cyber-violet mb-1">{k}</div>
                  <div className="flex items-start gap-2">
                    <code className="flex-1 break-all whitespace-pre-wrap text-cyber-neon">{v}</code>
                    <Copyable text={v} />
                  </div>
                </div>
              ))}
          </div>
        )}
      </motion.div>
    </Layout>
  )
}
