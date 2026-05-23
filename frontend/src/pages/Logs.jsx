import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollText, Filter, Pause, Play } from 'lucide-react'
import api from '../utils/api'
import Layout from '../components/Layout'
import Topbar from '../components/Topbar'

const LEVEL_CLR = {
  INFO: '#06b6d4', WARN: '#fbbf24', ERROR: '#f43f5e', CRITICAL: '#dc2626',
}

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [paused, setPaused] = useState(false)
  const [level, setLevel] = useState('all')

  const refresh = async () => {
    if (paused) return
    try {
      const { data } = await api.get('/api/defensive/logs/stream')
      setLogs(data.logs)
    } catch {}
  }
  useEffect(() => { refresh(); const i = setInterval(refresh, 4000); return () => clearInterval(i) }, [paused])

  const filtered = level === 'all' ? logs : logs.filter(l => l.level === level)

  return (
    <Layout>
      <Topbar title="SIEM Log Stream" subtitle="Aggregated logs from firewall · IDS · auth · EDR · k8s" />

      <div className="glass p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 mr-auto">
          <Filter size={14} className="text-white/55" />
          {['all','INFO','WARN','ERROR','CRITICAL'].map(l => (
            <button key={l} onClick={() => setLevel(l)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono ${level === l ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white'}`}>{l}</button>
          ))}
        </div>
        <button onClick={() => setPaused(!paused)} className="btn-ghost flex items-center gap-2 text-sm">
          {paused ? <><Play size={14}/> Resume</> : <><Pause size={14}/> Pause</>}
        </button>
        <span className="text-xs font-mono text-white/55">{filtered.length} entries</span>
      </div>

      <div className="glass p-0 overflow-hidden">
        <div className="terminal !rounded-none !border-0 !p-0 max-h-[70vh] overflow-auto">
          <AnimatePresence>
            {filtered.map((l, i) => (
              <motion.div key={i + l.timestamp} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="px-4 py-1.5 flex items-start gap-3 border-b border-white/5 hover:bg-white/[0.02]">
                <span className="text-[10px] font-mono text-white/40 shrink-0 mt-0.5">{l.timestamp.slice(11, 19)}</span>
                <span className="text-[10px] font-bold w-16 shrink-0 mt-0.5" style={{ color: LEVEL_CLR[l.level] }}>{l.level}</span>
                <span className="text-[10px] uppercase tracking-wider w-20 shrink-0 mt-0.5 text-cyber-violet font-mono">{l.source}</span>
                <span className="text-xs flex-1 break-all">{l.message}</span>
                <span className="text-[10px] font-mono text-white/40 shrink-0 mt-0.5">risk:{(l.risk*100).toFixed(0)}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  )
}
