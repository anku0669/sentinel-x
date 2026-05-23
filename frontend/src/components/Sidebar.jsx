import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Sword, Shield, Brain, Globe, KeyRound,
  ScrollText, LogOut, Skull, Mail, Bug, Plug, Key, Search,
  FileText, Server, Wifi, WifiOff
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import ServerConfig, { useServerUrl } from './ServerConfig'

const NAV = [
  { to: '/dashboard', label: 'Command Center', icon: LayoutDashboard, group: 'main' },
  { to: '/offensive', label: 'Red Team Ops',   icon: Sword,           group: 'offense' },
  { to: '/phishing',  label: 'Phishing Lab',    icon: Mail,            group: 'offense' },
  { to: '/bugbounty', label: 'Bug Bounty Hub',  icon: Bug,             group: 'offense' },
  { to: '/osint',     label: 'OSINT Hub',       icon: Search,          group: 'offense' },
  { to: '/jwt',       label: 'JWT Toolkit',     icon: Key,             group: 'offense' },
  { to: '/defensive', label: 'Blue Team SOC',   icon: Shield,          group: 'defense' },
  { to: '/threatmap', label: 'Live Attack Map', icon: Globe,           group: 'defense' },
  { to: '/passlab',   label: 'Password Lab',    icon: KeyRound,        group: 'defense' },
  { to: '/logs',      label: 'SIEM Stream',     icon: ScrollText,      group: 'defense' },
  { to: '/ai',        label: 'AI Analyst',      icon: Brain,           group: 'ai' },
  { to: '/airedteam', label: 'AI Red Team',     icon: Skull,           group: 'ai' },
  { to: '/mcp',       label: 'MCP Hub',         icon: Plug,            group: 'ai' },
  { to: '/reports',   label: 'Report Export',   icon: FileText,        group: 'ai' },
]

const GROUP_LABELS = {
  main: '', offense: 'OFFENSIVE', defense: 'DEFENSIVE', ai: 'AI / INTEGRATION',
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const { url: serverUrl } = useServerUrl()
  const [showConfig, setShowConfig] = useState(false)

  const grouped = NAV.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  const isConnected = !!serverUrl
  const shortUrl = serverUrl
    ? serverUrl.replace(/^https?:\/\//, '').replace(/\/.*/, '')
    : 'Demo Mode'

  return (
    <>
      <aside className="w-64 shrink-0 h-screen sticky top-0 p-4 hidden lg:flex flex-col gap-3">
        {/* Brand */}
        <div className="glass-strong p-5 flex flex-col gap-1 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-cyber-neon/15 blur-2xl" />
          <div className="flex items-center gap-3 relative">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyber-neon to-cyber-violet flex items-center justify-center font-black text-cyber-bg text-lg shadow-lg shadow-cyber-violet/40">
              <Shield size={20} strokeWidth={3}/>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-cyber-bg animate-pulse" />
            </div>
            <div>
              <div className="font-black tracking-tight text-lg leading-none neon-text">SENTINEL-X</div>
              <div className="text-[10px] text-white/50 font-mono mt-1">v1.3 · OPS-CENTER</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
            <span className="pulse-dot" />
            <span className="font-mono">DEFCON · 3 · GUARDED</span>
          </div>
        </div>

        {/* ── Server connection badge ── */}
        <button
          onClick={() => setShowConfig(true)}
          className="glass p-3 flex items-center gap-3 hover:bg-white/5 transition-all group w-full text-left"
          style={{
            borderColor: isConnected ? 'rgba(48,209,88,0.35)' : 'rgba(255,255,255,0.07)',
            boxShadow:   isConnected ? '0 0 16px rgba(48,209,88,0.08)' : 'none',
          }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: isConnected ? 'rgba(48,209,88,0.15)' : 'rgba(255,45,85,0.12)' }}>
            {isConnected
              ? <Wifi size={16} style={{ color: '#30d158' }} />
              : <WifiOff size={16} style={{ color: '#ff2d55' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Backend Server</div>
            <div className="text-xs font-mono truncate mt-0.5"
              style={{ color: isConnected ? '#30d158' : 'rgba(255,255,255,0.35)' }}>
              {shortUrl}
            </div>
          </div>
          <Server size={14} className="text-white/25 group-hover:text-white/60 transition-colors flex-shrink-0" />
        </button>

        {/* Nav */}
        <nav className="glass flex-1 p-3 space-y-3 overflow-y-auto">
          {Object.entries(grouped).map(([gKey, items]) => (
            <div key={gKey}>
              {GROUP_LABELS[gKey] && (
                <div className="px-2 pt-1 pb-1.5 text-[9px] font-mono tracking-widest text-white/35 font-bold">
                  {GROUP_LABELS[gKey]}
                </div>
              )}
              <div className="space-y-1">
                {items.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-cyber-neon/20 to-cyber-violet/20 text-white border border-cyber-neon/30 shadow-lg shadow-cyber-violet/20'
                          : 'text-white/65 hover:bg-white/5 hover:text-white'
                      }`
                    }>
                    <Icon size={16} />
                    <span className="font-medium">{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User row */}
        <div className="glass p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyber-rose to-cyber-violet flex items-center justify-center font-bold uppercase">
            {user?.username?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.username}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/50">{user?.role}</div>
          </div>
          <button onClick={() => { logout(); nav('/login') }}
            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-cyber-rose transition-colors"
            title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Server config modal */}
      {showConfig && <ServerConfig onClose={() => setShowConfig(false)} />}
    </>
  )
}
