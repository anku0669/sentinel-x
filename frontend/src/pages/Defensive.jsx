import { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const SEV_COLOR = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low:      'bg-green-500/20 text-green-400 border-green-500/30',
};

function LiveDot({ connected }) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
      {connected ? 'LIVE' : 'Reconnecting…'}
    </span>
  );
}

export default function Defensive() {
  const { history: threats, connected: tcOn } = useWebSocket('/ws/threats', { maxHistory: 30 });
  const { history: logs,    connected: logOn } = useWebSocket('/ws/logs',    { maxHistory: 40 });

  const [tab, setTab] = useState('threats');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cyan-300">Defensive SOC — Blue Team</h1>
          <p className="text-white/50 text-sm mt-1">Real-time threat detection via WebSocket</p>
        </div>
        <LiveDot connected={tcOn && logOn} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['threats', 'logs'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {t === 'threats' ? '🔴 Threat Feed' : '📋 SIEM Logs'}
          </button>
        ))}
      </div>

      {/* Threat Feed */}
      {tab === 'threats' && (
        <div className="rounded-2xl border border-cyan-400/20 bg-white/5 backdrop-blur-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-semibold text-white/80">Live Threat Detection Queue</span>
            <LiveDot connected={tcOn} />
          </div>
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
            {threats.length === 0 && (
              <p className="p-6 text-center text-white/40">Connecting to threat feed…</p>
            )}
            {threats.map((t, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors">
                <span className={`text-xs px-2 py-0.5 rounded border ${SEV_COLOR[t.severity] ?? SEV_COLOR.low}`}>
                  {t.severity?.toUpperCase()}
                </span>
                <span className="text-white/70 font-mono text-xs w-32 shrink-0">{t.source_ip}</span>
                <span className="text-white/80 text-sm flex-1">{t.description}</span>
                <span className="text-white/40 text-xs font-mono">
                  {new Date(t.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SIEM Logs */}
      {tab === 'logs' && (
        <div className="rounded-2xl border border-purple-400/20 bg-white/5 backdrop-blur-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-semibold text-white/80">SIEM Log Stream</span>
            <LiveDot connected={logOn} />
          </div>
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto font-mono text-xs">
            {logs.length === 0 && (
              <p className="p-6 text-center text-white/40">Connecting to log stream…</p>
            )}
            {logs.map((l, i) => {
              const lvlColor = {
                CRITICAL: 'text-red-400',
                ERROR:    'text-orange-400',
                WARN:     'text-yellow-400',
                INFO:     'text-cyan-400',
              }[l.level] ?? 'text-white/60';
              return (
                <div key={i} className="flex items-start gap-3 px-4 py-2 hover:bg-white/5">
                  <span className="text-white/30 w-20 shrink-0">
                    {new Date(l.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`w-16 shrink-0 font-bold ${lvlColor}`}>{l.level}</span>
                  <span className="text-purple-300 w-20 shrink-0">[{l.source}]</span>
                  <span className="text-white/70">{l.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
