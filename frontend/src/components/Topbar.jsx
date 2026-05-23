import { useEffect, useState } from 'react'
import { Search, Bell, Activity, Cpu } from 'lucide-react'

export default function Topbar({ title, subtitle }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <header className="glass mb-6 px-5 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
      </div>
      <div className="hidden md:flex items-center gap-2 text-xs text-white/60 font-mono">
        <Activity size={14} className="text-emerald-400" />
        <span>OPS · LIVE</span>
      </div>
      <div className="hidden md:flex items-center gap-2 text-xs text-white/60 font-mono">
        <Cpu size={14} className="text-cyber-neon" />
        <span>{time.toISOString().slice(11, 19)} UTC</span>
      </div>
      <button className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
        <Bell size={18} />
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyber-rose animate-pulse" />
      </button>
    </header>
  )
}
