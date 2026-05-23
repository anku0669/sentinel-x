/**
 * useWebSocket — reconnecting WebSocket hook for SENTINEL-X real-time feeds.
 *
 * Works in both environments:
 *   Dev  → Vite proxies /ws/* to backend:8000 with ws:true
 *   Prod → Nginx proxies /ws/* to backend:8000 with Upgrade: websocket
 *
 * Usage:
 *   const { data, history, connected } = useWebSocket('/ws/threats');
 */
import { useState, useEffect, useRef, useCallback } from 'react'

function buildWsUrl(path) {
  // Always use the same host — Vite (dev) and Nginx (prod) both proxy /ws/*
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}${path}`
}

export function useWebSocket(path, { maxHistory = 50 } = {}) {
  const [data, setData]           = useState(null)
  const [history, setHistory]     = useState([])
  const [connected, setConnected] = useState(false)
  const [error, setError]         = useState(null)

  const wsRef      = useRef(null)
  const retryRef   = useRef(null)
  const mountedRef = useRef(true)
  const retryDelay = useRef(1000)

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    try {
      const url = buildWsUrl(path)
      const ws  = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setConnected(true)
        setError(null)
        retryDelay.current = 1000          // reset backoff on successful connect
      }

      ws.onmessage = (evt) => {
        if (!mountedRef.current) return
        try {
          const parsed = JSON.parse(evt.data)
          setData(parsed)
          setHistory((prev) => [parsed, ...prev].slice(0, maxHistory))
        } catch {
          /* ignore malformed frames */
        }
      }

      ws.onerror = () => {
        if (!mountedRef.current) return
        setError('WebSocket connection error')
        setConnected(false)
      }

      ws.onclose = (evt) => {
        if (!mountedRef.current) return
        setConnected(false)
        // Exponential back-off: 1 s → 2 s → 4 s → … up to 16 s
        const delay = retryDelay.current
        retryDelay.current = Math.min(delay * 2, 16000)
        retryRef.current = setTimeout(connect, delay)
      }
    } catch (err) {
      setError(err.message)
      retryRef.current = setTimeout(connect, retryDelay.current)
    }
  }, [path, maxHistory])

  useEffect(() => {
    mountedRef.current = true
    retryDelay.current = 1000
    connect()
    return () => {
      mountedRef.current = false
      clearTimeout(retryRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null   // prevent reconnect loop on unmount
        wsRef.current.close()
      }
    }
  }, [connect])

  return { data, history, connected, error }
}
