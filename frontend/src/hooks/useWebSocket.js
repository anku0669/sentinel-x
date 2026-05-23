/**
 * useWebSocket — real WebSocket when backend configured, mock stream in demo mode.
 */
import { useState, useEffect, useRef, useCallback } from 'react'

const SERVER_KEY = 'sx_api_url'

const R  = () => Math.random()
const rnd = (a,b) => Math.floor(R()*(b-a+1))+a
const pick = arr => arr[Math.floor(R()*arr.length)]
const ip   = () => `${rnd(1,254)}.${rnd(1,254)}.${rnd(1,254)}.${rnd(1,254)}`

const SEV   = ['critical','high','medium','low']
const TYPES = ['DDoS','SQLi','XSS','RCE','Brute Force','MITM','Ransomware','Phishing','SSRF','LFI']
const SRCS  = ['firewall','ids','auth','proxy','dns','waf','endpoint','siem']
const MSGS  = [
  () => `Blocked ${pick(TYPES)} attempt from ${ip()}`,
  () => `Suspicious login from ${ip()} — ${rnd(3,30)} attempts`,
  () => `Port scan detected from ${ip()}`,
  () => `Malware signature matched: TROJAN.${rnd(100,999)}`,
  () => `Outbound C2 traffic to ${ip()}:${rnd(1024,9999)}`,
  () => `SSL cert mismatch on internal-api.local`,
  () => `Privilege escalation attempt by uid=${rnd(1000,9999)}`,
  () => `DNS exfil pattern — query length ${rnd(100,250)} chars`,
  () => `File integrity violation: /etc/${pick(['passwd','hosts','crontab'])}`,
  () => `Lateral movement detected from ${ip()} to ${ip()}`,
]

function mockThreat() {
  return {
    id: Math.random().toString(36).slice(2),
    severity: pick(SEV),
    source_ip: ip(),
    destination_ip: ip(),
    description: pick(MSGS)(),
    type: pick(TYPES),
    timestamp: new Date().toISOString(),
    country: pick(['CN','RU','US','BR','IN','KP','IR','DE','FR','UA']),
  }
}

function mockLog() {
  const levels = ['CRITICAL','ERROR','WARN','INFO','INFO','INFO','DEBUG']
  return {
    id: Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    level: pick(levels),
    source: pick(SRCS),
    src_ip: ip(),
    message: pick(MSGS)(),
    rule_id: `RULE-${rnd(1000,9999)}`,
  }
}

function buildWsUrl(path) {
  const serverUrl = localStorage.getItem(SERVER_KEY) || ''
  if (serverUrl) {
    // Use configured backend's WebSocket
    const base = serverUrl.replace(/^http/, 'ws').replace(/\/+$/, '')
    return base + path
  }
  // Fallback to same host (will fail gracefully — mock takes over)
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}${path}`
}

function isMockMode() {
  return !localStorage.getItem(SERVER_KEY)
}

export function useWebSocket(path, { maxHistory = 50 } = {}) {
  const [data,      setData]      = useState(null)
  const [history,   setHistory]   = useState([])
  const [connected, setConnected] = useState(false)
  const [error,     setError]     = useState(null)

  const wsRef      = useRef(null)
  const retryRef   = useRef(null)
  const mountedRef = useRef(true)
  const retryDelay = useRef(1000)

  // ── MOCK MODE: emit random events every 1-3 seconds ──────────────────────
  useEffect(() => {
    if (!isMockMode()) return

    // Seed with initial data
    const isThreat = path.includes('threat')
    const seed = Array.from({ length: 15 }, () => isThreat ? mockThreat() : mockLog())
    setHistory(seed)
    setConnected(true) // show as "connected" in demo

    const interval = setInterval(() => {
      if (!mountedRef.current) return
      const item = isThreat ? mockThreat() : mockLog()
      setData(item)
      setHistory(prev => [item, ...prev].slice(0, maxHistory))
    }, 1500 + Math.random() * 2000)

    return () => clearInterval(interval)
  }, [path, maxHistory])

  // ── REAL WebSocket: only when backend is configured ───────────────────────
  const connect = useCallback(() => {
    if (!mountedRef.current || isMockMode()) return
    try {
      const url = buildWsUrl(path)
      const ws  = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setConnected(true); setError(null)
        retryDelay.current = 1000
      }
      ws.onmessage = (evt) => {
        if (!mountedRef.current) return
        try {
          const parsed = JSON.parse(evt.data)
          setData(parsed)
          setHistory(prev => [parsed, ...prev].slice(0, maxHistory))
        } catch {}
      }
      ws.onerror  = () => { if (mountedRef.current) { setError('WebSocket error'); setConnected(false) } }
      ws.onclose  = () => {
        if (!mountedRef.current) return
        setConnected(false)
        const d = retryDelay.current
        retryDelay.current = Math.min(d * 2, 16000)
        retryRef.current = setTimeout(connect, d)
      }
    } catch (err) {
      setError(err.message)
      retryRef.current = setTimeout(connect, retryDelay.current)
    }
  }, [path, maxHistory])

  useEffect(() => {
    mountedRef.current = true
    retryDelay.current = 1000
    if (!isMockMode()) connect()
    return () => {
      mountedRef.current = false
      clearTimeout(retryRef.current)
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close() }
    }
  }, [connect])

  return { data, history, connected, error }
}
