import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Radar, Activity, Shield, AlertTriangle, Zap, Eye, Crosshair } from 'lucide-react'
import api from '../utils/api'
import Layout from '../components/Layout'
import Topbar from '../components/Topbar'
import {
  MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// ─── severity config ──────────────────────────────────────────────────────────
const SEV = {
  critical: { color: '#ff2d55', shadow: 'rgba(255,45,85,0.8)',  label: 'CRITICAL', icon: '🔴' },
  high:     { color: '#ff9f0a', shadow: 'rgba(255,159,10,0.8)', label: 'HIGH',     icon: '🟠' },
  medium:   { color: '#ffd60a', shadow: 'rgba(255,214,10,0.7)', label: 'MEDIUM',   icon: '🟡' },
  low:      { color: '#30d158', shadow: 'rgba(48,209,88,0.7)',  label: 'LOW',      icon: '🟢' },
}

// ─── great-circle arc ─────────────────────────────────────────────────────────
function arcPoints(lat1, lng1, lat2, lng2, steps = 90) {
  const R = Math.PI / 180
  const D = 180 / Math.PI
  const φ1 = lat1*R, λ1 = lng1*R, φ2 = lat2*R, λ2 = lng2*R
  const d = 2*Math.asin(Math.sqrt(
    Math.sin((φ2-φ1)/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin((λ2-λ1)/2)**2
  ))
  if (d < 0.001) return [[lat1,lng1],[lat2,lng2]]
  return Array.from({length:steps+1},(_,i)=>{
    const f=i/steps, A=Math.sin((1-f)*d)/Math.sin(d), B=Math.sin(f*d)/Math.sin(d)
    const x=A*Math.cos(φ1)*Math.cos(λ1)+B*Math.cos(φ2)*Math.cos(λ2)
    const y=A*Math.cos(φ1)*Math.sin(λ1)+B*Math.cos(φ2)*Math.sin(λ2)
    const z=A*Math.sin(φ1)+B*Math.sin(φ2)
    return [Math.atan2(z,Math.sqrt(x*x+y*y))*D, Math.atan2(y,x)*D]
  })
}

// ─── multi-layer glowing arc ──────────────────────────────────────────────────
function GlowArc({ attack, tick }) {
  const cfg = SEV[attack.severity] || SEV.low
  const pts = arcPoints(
    attack.source.lat, attack.source.lng,
    attack.target.lat, attack.target.lng
  )
  const dashOff = String(-((tick * 4) % 400))
  const pulse   = 5 + 4 * Math.sin(tick * 0.13)
  const ring2   = 14 + 8 * Math.sin(tick * 0.08 + 1)

  return (
    <>
      {/* Outer atmospheric glow */}
      <Polyline positions={pts} pathOptions={{ color: cfg.color, weight: 18, opacity: 0.04 }} />
      <Polyline positions={pts} pathOptions={{ color: cfg.color, weight: 10, opacity: 0.10 }} />
      <Polyline positions={pts} pathOptions={{ color: cfg.color, weight: 5,  opacity: 0.22 }} />
      {/* Core bright line */}
      <Polyline positions={pts} pathOptions={{ color: cfg.color, weight: 2,  opacity: 0.65 }} />
      {/* White-hot spark travelling along arc */}
      <Polyline
        key={`spark-${attack.id ?? attack.source.name}-${Math.floor(tick/90)}`}
        positions={pts}
        pathOptions={{ color: '#ffffff', weight: 4, opacity: 1, dashArray: '5 500', dashOffset: dashOff }}
      />
      {/* Bright point at spark head */}
      <Polyline
        positions={pts}
        pathOptions={{ color: cfg.color, weight: 6, opacity: 0.8, dashArray: '1 500', dashOffset: dashOff }}
      />

      {/* ── Source pulsing rings ──── */}
      <CircleMarker center={[attack.source.lat, attack.source.lng]} radius={ring2}
        pathOptions={{ color: cfg.color, fillColor:'transparent', fillOpacity:0, weight:1, opacity:0.15+0.15*Math.sin(tick*0.08) }} />
      <CircleMarker center={[attack.source.lat, attack.source.lng]} radius={pulse}
        pathOptions={{ color: cfg.color, fillColor:'transparent', fillOpacity:0, weight:1.5, opacity:0.45 }} />
      <CircleMarker center={[attack.source.lat, attack.source.lng]} radius={5}
        pathOptions={{ color: cfg.color, fillColor: cfg.color, fillOpacity: 1, weight: 2 }}>
        <Tooltip direction="top" offset={[0,-8]} opacity={0.97} permanent={false}>
          <div style={{fontFamily:'monospace',fontSize:11,lineHeight:1.5}}>
            <div style={{color:cfg.color,fontWeight:'bold',marginBottom:3}}>⚡ {cfg.label}</div>
            <div>📍 {attack.source.name}</div>
            <div style={{color:'#aaa'}}>🌏 {attack.source.country}</div>
            <div style={{color:'#aaa'}}>🔧 {attack.type}</div>
            <div style={{color:'rgba(255,255,255,0.4)',fontSize:10}}>{attack.source.lat?.toFixed(2)}°, {attack.source.lng?.toFixed(2)}°</div>
          </div>
        </Tooltip>
      </CircleMarker>

      {/* ── Target marker ──── */}
      <CircleMarker center={[attack.target.lat, attack.target.lng]} radius={10}
        pathOptions={{ color:'#00ffe1', fillColor:'transparent', fillOpacity:0, weight:1.5, opacity:0.5 }} />
      <CircleMarker center={[attack.target.lat, attack.target.lng]} radius={5}
        pathOptions={{ color:'#00ffe1', fillColor:'#00ffe1', fillOpacity:1, weight:2 }}>
        <Tooltip direction="top" offset={[0,-8]} opacity={0.97}>
          <div style={{fontFamily:'monospace',fontSize:11}}>
            <div style={{color:'#00ffe1',fontWeight:'bold'}}>🎯 TARGET</div>
            <div>{attack.target.name}</div>
          </div>
        </Tooltip>
      </CircleMarker>
    </>
  )
}

// ─── heatmap concentration layer ─────────────────────────────────────────────
function HeatLayer({ attacks }) {
  const buckets = {}
  attacks.forEach(a => {
    const k = `${Math.round(a.source.lat/12)*12},${Math.round(a.source.lng/12)*12}`
    buckets[k] = (buckets[k]||0) + 1
  })
  return Object.entries(buckets).map(([k, n]) => {
    const [lat, lng] = k.split(',').map(Number)
    return (
      <CircleMarker key={k} center={[lat,lng]}
        radius={Math.min(50, 15 + n*10)}
        pathOptions={{ color:'transparent', fillColor:'#ff2d55', fillOpacity: Math.min(0.3, 0.06+n*0.04) }} />
    )
  })
}

// ─── map dark init ────────────────────────────────────────────────────────────
function MapInit() {
  const map = useMap()
  useEffect(() => { map.getContainer().style.background = '#000510' }, [map])
  return null
}

// ─── animated counter ─────────────────────────────────────────────────────────
function useCounter(target) {
  const [val, setVal] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const from = prev.current
    prev.current = target
    let start = null
    const step = ts => {
      if (!start) start = ts
      const p = Math.min((ts-start)/800, 1)
      setVal(Math.floor(from + (target-from)*p))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target])
  return val
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function ThreatMap() {
  const [attacks,      setAttacks]      = useState([])
  const [tick,         setTick]         = useState(0)
  const [filter,       setFilter]       = useState('all')
  const [showHeat,     setShowHeat]     = useState(true)
  const [showLabels,   setShowLabels]   = useState(true)
  const [feedPaused,   setFeedPaused]   = useState(false)
  const [feedLog,      setFeedLog]      = useState([])

  // ── data fetch ──────────────────────────────────────────────────────────────
  const refresh = async () => {
    try {
      const { data } = await api.get('/api/defensive/threats/map')
      const incoming = data.attacks ?? []
      setAttacks(incoming)
      if (!feedPaused) {
        setFeedLog(prev => [...incoming.slice(-3), ...prev].slice(0, 40))
      }
    } catch {}
  }
  useEffect(() => { refresh(); const id = setInterval(refresh, 5000); return () => clearInterval(id) }, [feedPaused])

  // ── animation tick ~12 fps ──────────────────────────────────────────────────
  useEffect(() => { const id = setInterval(() => setTick(t => t+1), 80); return () => clearInterval(id) }, [])

  // ── derived stats ───────────────────────────────────────────────────────────
  const filtered = filter === 'all' ? attacks : attacks.filter(a => a.severity === filter)
  const sevCounts = attacks.reduce((acc, a) => { acc[a.severity] = (acc[a.severity]||0)+1; return acc }, {})
  const totalCount = useCounter(attacks.length)

  const threatLevel = Math.min(100,
    (sevCounts.critical||0)*22 + (sevCounts.high||0)*9 +
    (sevCounts.medium||0)*4  + (sevCounts.low||0)*2
  )
  const tlColor = threatLevel > 70 ? '#ff2d55' : threatLevel > 40 ? '#ff9f0a' : '#30d158'

  const countryStats = attacks.reduce((acc, a) => {
    const c = a.source?.country || '??'
    acc[c] = (acc[c]||0)+1
    return acc
  }, {})
  const topCountries = Object.entries(countryStats).sort((a,b)=>b[1]-a[1]).slice(0,8)
  const maxCtry = topCountries[0]?.[1] || 1

  const bandwidth = attacks.reduce((s, a) => s + (a.bytes || Math.floor(Math.random()*9000+1000)), 0)
  const bwAnimated = useCounter(bandwidth)

  return (
    <Layout>
      <Topbar title="Live Global Attack Map" subtitle="Satellite imagery · Real-time cyber threat visualization" />

      {/* ── Top severity filter badges ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {Object.entries(SEV).map(([sev, cfg]) => (
          <motion.button
            key={sev}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setFilter(f => f === sev ? 'all' : sev)}
            className="glass-dark p-3 text-left relative overflow-hidden"
            style={{
              borderColor: filter === sev ? cfg.color : 'rgba(255,255,255,0.07)',
              borderWidth: 1, borderStyle: 'solid',
              boxShadow: filter === sev ? `0 0 18px ${cfg.shadow}` : 'none',
            }}
          >
            {filter === sev && (
              <div className="absolute inset-0 opacity-10" style={{ background: cfg.color }} />
            )}
            <div className="text-xs font-mono mb-1" style={{ color: cfg.color }}>{cfg.icon} {cfg.label}</div>
            <div className="text-3xl font-bold font-mono leading-none">{sevCounts[sev]||0}</div>
            <div className="text-xs text-white/30 mt-1 font-mono">STREAMS</div>
          </motion.button>
        ))}
      </div>

      {/* ── Map wrapper ─────────────────────────────────────────────────────── */}
      <div className="relative mb-4" style={{
        borderRadius: 16, overflow: 'hidden',
        border: '1px solid rgba(0,255,225,0.18)',
        boxShadow: '0 0 40px rgba(0,255,225,0.08), 0 0 80px rgba(255,45,85,0.06)',
      }}>
        {/* ── HUD corner brackets ──── */}
        {[
          { top:10, left:10,  borderTop:'2px solid #00ffe1', borderLeft:'2px solid #00ffe1'  },
          { top:10, right:10, borderTop:'2px solid #00ffe1', borderRight:'2px solid #00ffe1' },
          { bottom:10, left:10,  borderBottom:'2px solid #00ffe1', borderLeft:'2px solid #00ffe1'  },
          { bottom:10, right:10, borderBottom:'2px solid #00ffe1', borderRight:'2px solid #00ffe1' },
        ].map((s,i) => (
          <div key={i} style={{ position:'absolute', width:22, height:22, zIndex:1200, ...s }} />
        ))}

        {/* ── Top-centre live badge ──── */}
        <div style={{
          position:'absolute', top:14, left:'50%', transform:'translateX(-50%)',
          zIndex:1100, display:'flex', alignItems:'center', gap:8,
          background:'rgba(0,0,0,0.72)', backdropFilter:'blur(10px)',
          border:'1px solid rgba(255,255,255,0.1)', borderRadius:999,
          padding:'6px 16px', fontFamily:'monospace', fontSize:12,
        }}>
          <span className="pulse-dot danger" />
          <span style={{ color:'#ff2d55', fontWeight:'bold' }}>{totalCount}</span>
          <span style={{ color:'rgba(255,255,255,0.55)' }}>ACTIVE THREATS</span>
          <span style={{ color:'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ color:'#00ffe1' }}>{(bwAnimated/1000).toFixed(1)} KB/s</span>
        </div>

        {/* ── Top-right map controls ──── */}
        <div style={{
          position:'absolute', top:14, right:40, zIndex:1100,
          display:'flex', gap:6,
        }}>
          {[
            { label:'HEAT', active:showHeat,   toggle:()=>setShowHeat(v=>!v) },
            { label:'LBL',  active:showLabels, toggle:()=>setShowLabels(v=>!v) },
          ].map(({label,active,toggle}) => (
            <button key={label} onClick={toggle} style={{
              fontFamily:'monospace', fontSize:10, fontWeight:'bold',
              background: active ? 'rgba(0,255,225,0.15)' : 'rgba(0,0,0,0.6)',
              border: `1px solid ${active ? '#00ffe1' : 'rgba(255,255,255,0.12)'}`,
              color: active ? '#00ffe1' : 'rgba(255,255,255,0.4)',
              borderRadius:6, padding:'4px 8px', cursor:'pointer',
            }}>{label}</button>
          ))}
        </div>

        {/* ── Bottom threat-level bar ──── */}
        <div style={{
          position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)',
          zIndex:1100, width:260,
          background:'rgba(0,0,0,0.72)', backdropFilter:'blur(10px)',
          border:'1px solid rgba(255,255,255,0.1)', borderRadius:999,
          padding:'8px 16px',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontFamily:'monospace', fontSize:10 }}>
            <span style={{ color:'rgba(255,255,255,0.45)' }}>GLOBAL THREAT LEVEL</span>
            <span style={{ color:tlColor, fontWeight:'bold' }}>{threatLevel}%</span>
          </div>
          <div style={{ height:4, background:'rgba(255,255,255,0.08)', borderRadius:99, overflow:'hidden' }}>
            <motion.div animate={{ width:`${threatLevel}%` }} transition={{ duration:1.2 }}
              style={{ height:'100%', borderRadius:99,
                background:'linear-gradient(90deg,#30d158 0%,#ffd60a 45%,#ff9f0a 70%,#ff2d55 100%)' }} />
          </div>
        </div>

        {/* ── Scan-line overlay ──── */}
        <div style={{
          position:'absolute', inset:0, zIndex:1050, pointerEvents:'none',
          background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)',
        }} />

        {/* ── The Map ──── */}
        <MapContainer
          center={[20, 10]} zoom={2} minZoom={1} maxZoom={10}
          scrollWheelZoom={true}
          style={{ height:540, width:'100%', background:'#000510' }}
          attributionControl={false} zoomControl={true}
        >
          <MapInit />

          {/* 🛰️ ESRI Satellite imagery */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="© ESRI"
            maxZoom={19}
          />

          {/* Country borders + city labels overlay */}
          {showLabels && (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              opacity={0.7}
              maxZoom={19}
            />
          )}

          {/* Heatmap concentration blobs */}
          {showHeat && <HeatLayer attacks={filtered} />}

          {/* Attack arcs + dots */}
          {filtered.map((a, i) => (
            <GlowArc key={`${i}-${a.source?.name}-${a.source?.lat}`} attack={a} tick={tick} />
          ))}
        </MapContainer>
      </div>

      {/* ── Bottom three-column panels ───────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* ── Live attack feed ──────────────────────────────────────────── */}
        <div className="glass p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2">
              <Activity size={18} className="text-cyber-rose" /> Live Attack Feed
            </h3>
            <button
              onClick={() => setFeedPaused(v => !v)}
              className="text-xs font-mono px-3 py-1 rounded-lg"
              style={{
                background: feedPaused ? 'rgba(255,214,10,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${feedPaused ? '#ffd60a' : 'rgba(255,255,255,0.1)'}`,
                color: feedPaused ? '#ffd60a' : 'rgba(255,255,255,0.4)',
              }}
            >
              {feedPaused ? '▶ RESUME' : '⏸ PAUSE'}
            </button>
          </div>
          <div className="space-y-1.5 max-h-[300px] overflow-auto pr-1 scrollbar-thin">
            {feedLog.length === 0 && (
              <p className="text-white/30 text-sm font-mono py-6 text-center">Awaiting threat data…</p>
            )}
            <AnimatePresence initial={false}>
              {feedLog.map((a, i) => {
                const cfg = SEV[a.severity] || SEV.low
                return (
                  <motion.div
                    key={`${i}-${a.source?.name}-${a.type}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1,  y: 0   }}
                    exit={{   opacity: 0,  y: 10   }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                    style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background:cfg.color, boxShadow:`0 0 6px ${cfg.color}` }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-xs font-bold" style={{ color:cfg.color }}>{cfg.label}</span>
                        <span className="text-sm truncate text-white/80">{a.type}</span>
                      </div>
                      <div className="text-xs text-white/40 truncate mt-0.5 font-mono">
                        {a.source?.name} ({a.source?.country})
                        <span className="text-white/20 mx-1.5">→</span>
                        {a.target?.name}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-white/25 flex-shrink-0 text-right">
                      <div>{a.source?.lat?.toFixed(1)}°N</div>
                      <div>{a.source?.lng?.toFixed(1)}°E</div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Origin leaderboard ───────────────────────────────────────── */}
        <div className="glass p-5">
          <h3 className="font-bold flex items-center gap-2 mb-4">
            <Globe size={18} className="text-cyber-neon" /> Top Origins
          </h3>
          <div className="space-y-3">
            {topCountries.length === 0 && (
              <p className="text-white/30 text-sm font-mono py-6 text-center">No data…</p>
            )}
            {topCountries.map(([country, n], i) => {
              const pct = (n / maxCtry) * 100
              const gradColor = i < 2 ? '#ff2d55' : i < 4 ? '#ff9f0a' : '#ffd60a'
              return (
                <div key={country} className="flex items-center gap-2">
                  <span className="text-xs text-white/30 w-4 font-mono font-bold">{i+1}</span>
                  <span className="font-mono text-sm w-10 text-white/80">{country}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.05)' }}>
                    <motion.div
                      animate={{ width:`${pct}%` }} transition={{ duration:0.9 }}
                      className="h-full rounded-full"
                      style={{ background:`linear-gradient(90deg,${gradColor},rgba(255,255,255,0.3))` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-5 text-right" style={{ color:gradColor }}>{n}</span>
                </div>
              )
            })}
          </div>

          {/* ── Mini severity breakdown ──── */}
          <div className="mt-5 pt-4" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs font-mono text-white/35 mb-2">SEVERITY MIX</div>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden">
              {Object.entries(SEV).map(([sev, cfg]) => {
                const pct = attacks.length ? ((sevCounts[sev]||0)/attacks.length)*100 : 0
                return pct > 0 ? (
                  <motion.div key={sev} animate={{ width:`${pct}%` }} transition={{ duration:1 }}
                    style={{ background:cfg.color, height:'100%' }}
                    title={`${cfg.label}: ${sevCounts[sev]||0}`}
                  />
                ) : null
              })}
            </div>
            <div className="flex gap-3 mt-2 flex-wrap">
              {Object.entries(SEV).map(([sev, cfg]) => (
                <span key={sev} className="text-xs font-mono flex items-center gap-1">
                  <span style={{ width:6, height:6, borderRadius:'50%', display:'inline-block', background:cfg.color }} />
                  <span style={{ color:'rgba(255,255,255,0.4)' }}>{cfg.label[0]}</span>
                  <span style={{ color:cfg.color }}>{sevCounts[sev]||0}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
