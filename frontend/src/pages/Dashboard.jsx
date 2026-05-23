import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldAlert, ShieldCheck, Activity, Cpu, Eye, Bug, AlertTriangle,
  TrendingUp, Server, Zap
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts'
import api from '../utils/api'
import Layout from '../components/Layout'
import Topbar from '../components/Topbar'
import StatCard from '../components/StatCard'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [dist, setDist] = useState([])
  const [threats, setThreats] = useState([])

  const load = async () => {
    try {
      const [s, t, d, lt] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/dashboard/timeline'),
        api.get('/api/dashboard/threat-distribution'),
        api.get('/api/defensive/threats/live?limit=8'),
      ])
      setStats(s.data); setTimeline(t.data.timeline); setDist(d.data.distribution); setThreats(lt.data.threats)
    } catch (e) { /* handled by interceptor */ }
  }

  useEffect(() => {
    load()
    const i = setInterval(load, 15000)
    return () => clearInterval(i)
  }, [])

  return (
    <Layout>
      <Topbar title="Command Center" subtitle="Real-time security posture across your environment" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Threats Blocked / 24h" value={stats?.threats_blocked_24h?.toLocaleString() ?? '—'} icon={ShieldCheck} accent="#10b981" sub="+12% vs yesterday" />
        <StatCard label="Threats Detected" value={stats?.threats_detected_24h?.toLocaleString() ?? '—'} icon={ShieldAlert} accent="#f43f5e" sub="ML + rule based" />
        <StatCard label="Active Incidents" value={stats?.active_incidents ?? '—'} icon={AlertTriangle} accent="#fbbf24" sub="Awaiting triage" />
        <StatCard label="Systems Protected" value={stats?.systems_protected ?? '—'} icon={Server} accent="#00ffe1" sub={`Uptime ${stats?.uptime_pct ?? '—'}%`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 glass p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold flex items-center gap-2"><Activity size={18} className="text-cyber-neon" /> 24h Threat Timeline</h3>
              <p className="text-xs text-white/50 mt-0.5">Attacks vs. blocked vs. ML anomalies</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="pulse-dot" /> <span className="text-white/60 font-mono">LIVE</span>
            </div>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="atk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="blk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00ffe1" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#00ffe1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="ano" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <Tooltip contentStyle={{ background: 'rgba(11,13,26,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Area type="monotone" dataKey="attacks" stroke="#f43f5e" fill="url(#atk)" strokeWidth={2} />
                <Area type="monotone" dataKey="blocked" stroke="#00ffe1" fill="url(#blk)" strokeWidth={2} />
                <Area type="monotone" dataKey="anomalies" stroke="#fbbf24" fill="url(#ano)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass p-5">
          <h3 className="font-bold mb-1 flex items-center gap-2"><Bug size={18} className="text-cyber-rose" /> Threat Distribution</h3>
          <p className="text-xs text-white/50 mb-3">Last 24 hours by category</p>
          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dist} dataKey="count" nameKey="type" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {dist.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(11,13,26,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[10px] mt-2">
            {dist.map((d) => (
              <div key={d.type} className="flex items-center gap-1.5 text-white/70">
                <span className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
                <span className="truncate">{d.type}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Live threat feed + system signals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-2 glass p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2"><Zap size={18} className="text-cyber-amber" /> Live Threat Feed</h3>
            <span className="text-[11px] font-mono text-white/55">auto-refresh · 15s</span>
          </div>
          <div className="space-y-2 max-h-[360px] overflow-auto pr-2">
            {threats.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-dark p-3 flex items-center gap-3 hover:border-cyber-neon/30 transition-all"
              >
                <span className={`badge badge-${t.severity}`}>{t.severity}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.description}</div>
                  <div className="text-xs text-white/50 font-mono">
                    {t.source_ip} <span className="text-white/30">→</span> {t.target_ip} · {t.country} · {(t.confidence*100).toFixed(0)}% conf
                  </div>
                </div>
                {t.is_blocked
                  ? <span className="text-emerald-400 text-xs font-mono">BLOCKED</span>
                  : <span className="text-cyber-rose text-xs font-mono animate-pulse">ALLOWED</span>}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-5">
          <h3 className="font-bold flex items-center gap-2 mb-3"><Cpu size={18} className="text-cyber-violet" /> System Signals</h3>
          <div className="space-y-3">
            {[
              { label: 'CPU Load', val: 32, color: '#00ffe1' },
              { label: 'Memory', val: 64, color: '#8b5cf6' },
              { label: 'Network I/O', val: 78, color: '#fbbf24' },
              { label: 'Disk I/O', val: 21, color: '#10b981' },
              { label: 'ML Engine', val: 88, color: '#f43f5e' },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/70">{m.label}</span>
                  <span className="font-mono text-white/90">{m.val}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${m.val}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${m.color}, ${m.color}aa)` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 p-3 rounded-xl bg-gradient-to-br from-cyber-neon/10 to-cyber-violet/10 border border-cyber-neon/20">
            <div className="flex items-center gap-2 text-xs text-cyber-neon font-mono">
              <Eye size={14} /> GLOBAL THREAT LEVEL
            </div>
            <div className="text-2xl font-black mt-1 neon-text">{stats?.global_threat_level ?? '—'}</div>
            <div className="text-xs text-white/50 mt-1">{stats?.ml_anomalies_today ?? 0} ML anomalies flagged today</div>
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
