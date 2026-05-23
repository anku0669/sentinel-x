import { useState, useEffect, useRef } from 'react'
import api from '../utils/api'

// Tiny in-memory cache for GET responses (per-tab lifetime)
const cache = new Map()

/**
 * useFetch — minimal SWR-style data hook for GET endpoints.
 * Returns { data, loading, error, refetch }.
 * Caches by URL across the page lifetime.
 */
export function useFetch(url, opts = {}) {
  const { skip = false, revalidateOnFocus = false, ttl = 30000 } = opts
  const [data, setData] = useState(() => cache.get(url)?.data || null)
  const [loading, setLoading] = useState(!cache.has(url) && !skip)
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  const load = async (force = false) => {
    if (!url || skip) return
    const hit = cache.get(url)
    if (!force && hit && Date.now() - hit.t < ttl) {
      setData(hit.data); setLoading(false); return
    }
    setLoading(true)
    try {
      const r = await api.get(url)
      cache.set(url, { data: r.data, t: Date.now() })
      if (mounted.current) { setData(r.data); setError(null) }
    } catch (e) {
      if (mounted.current) setError(e)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    mounted.current = true
    load()
    return () => { mounted.current = false }
    // eslint-disable-next-line
  }, [url, skip])

  useEffect(() => {
    if (!revalidateOnFocus) return
    const onFocus = () => load(true)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  })

  return { data, loading, error, refetch: () => load(true) }
}

export function clearCache(prefix) {
  if (!prefix) { cache.clear(); return }
  for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k)
}
