import { useState } from 'react'
import { FileText, Download, AlertCircle, CheckCircle, Target, Loader } from 'lucide-react'

const SAMPLE_FINDINGS = [
  {
    type: 'sql_injection', severity: 'critical',
    description: 'SQL injection detected on /api/auth/login endpoint.',
    source_ip: '203.0.113.42', target_ip: '10.0.0.5', confidence: 0.95,
    timestamp: new Date().toISOString(),
  },
  {
    type: 'brute_force', severity: 'high',
    description: 'SSH brute-force — 847 failed attempts in 60 seconds.',
    source_ip: '198.51.100.17', target_ip: '10.0.0.1', confidence: 0.89,
    timestamp: new Date().toISOString(),
  },
  {
    type: 'port_scan', severity: 'low',
    description: 'Sequential TCP port scan across /24 subnet.',
    source_ip: '192.0.2.10', target_ip: '10.0.0.0/24', confidence: 0.72,
    timestamp: new Date().toISOString(),
  },
  {
    type: 'prompt_injection', severity: 'high',
    description: 'Prompt injection attempt detected in AI Analyst input.',
    source_ip: '—', target_ip: '—', confidence: 0.91,
    timestamp: new Date().toISOString(),
  },
]

const SEV_STYLE = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low:      'bg-green-500/20 text-green-400 border-green-500/30',
}

export default function ReportExport() {
  const [target, setTarget]   = useState('')
  const [status, setStatus]   = useState(null)   // null | 'loading' | 'ok' | 'error'
  const [msg, setMsg]         = useState('')

  const handleGenerate = async () => {
    if (!target.trim()) {
      setStatus('error')
      setMsg('Please enter a target scope before generating.')
      return
    }
    setStatus('loading')
    setMsg('Building PDF report…')

    try {
      // ── FIX: token is stored as sx_token (not 'token') ──
      const token = localStorage.getItem('sx_token') ?? ''

      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          target:    target.trim(),
          findings:  SAMPLE_FINDINGS,
          scan_meta: { generated_by: 'SENTINEL-X', version: '2.0.0' },
        }),
      })

      if (res.status === 401) throw new Error('Session expired — please log in again.')
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(`Server error ${res.status}: ${detail}`)
      }

      const blob = await res.blob()
      if (blob.size < 100) throw new Error('Empty PDF received from server.')

      // Trigger browser download
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `sentinelx-report-${target.trim().replace(/[^a-z0-9]/gi, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setStatus('ok')
      setMsg('Report downloaded successfully!')
    } catch (err) {
      setStatus('error')
      setMsg(err.message)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-cyan-300 flex items-center gap-2">
          <FileText size={24} /> PDF Report Exporter
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Generate a branded engagement report with findings, MITRE ATT&amp;CK mappings and remediation advice.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Config panel ── */}
        <div className="rounded-2xl border border-cyan-400/20 bg-white/5 backdrop-blur-xl p-6 space-y-5">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Report Configuration</h2>

          {/* Target input */}
          <div>
            <label className="text-xs uppercase tracking-wider text-white/50 mb-2 block">
              Target Scope
            </label>
            <div className="relative flex items-center">
              <Target size={16} className="absolute left-3 z-10 text-white/40 pointer-events-none" />
              <input
                className="cyber-input pl-10"
                placeholder="e.g. example.com  or  192.168.1.0/24"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          </div>

          {/* What's included */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
            <p className="text-xs font-semibold text-white/70 mb-2">Report includes:</p>
            {[
              'Cover page — target, analyst, date',
              'Executive summary with severity counts',
              'Findings table with MITRE ATT&CK IDs',
              'Per-finding detail + remediation guidance',
              'Appendix with raw scan metadata',
              'Branded SENTINEL-X design (cyan / purple)',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                <span className="text-cyan-400">✓</span> {item}
              </div>
            ))}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={status === 'loading'}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {status === 'loading'
              ? <><Loader size={16} className="animate-spin" /> Building PDF…</>
              : <><Download size={16} /> Generate &amp; Download PDF</>
            }
          </button>

          {/* Status message */}
          {status && status !== 'loading' && (
            <div className={`flex items-start gap-2 text-sm rounded-lg p-3 ${
              status === 'ok'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {status === 'ok'
                ? <CheckCircle size={16} className="mt-0.5 shrink-0" />
                : <AlertCircle size={16} className="mt-0.5 shrink-0" />
              }
              {msg}
            </div>
          )}
        </div>

        {/* ── Findings preview ── */}
        <div className="rounded-2xl border border-purple-400/20 bg-white/5 backdrop-blur-xl p-6">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
            Findings Preview ({SAMPLE_FINDINGS.length})
          </h2>
          <div className="space-y-3">
            {SAMPLE_FINDINGS.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-3"
              >
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 mt-0.5 ${SEV_STYLE[f.severity] ?? SEV_STYLE.low}`}>
                  {f.severity.toUpperCase()}
                </span>
                <div>
                  <div className="text-xs font-semibold text-white/80">
                    {f.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </div>
                  <div className="text-xs text-white/50 mt-0.5">{f.description}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/30 mt-4">
            In production these findings are populated from your live scan results.
          </p>
        </div>
      </div>
    </div>
  )
}
