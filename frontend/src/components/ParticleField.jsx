import { useEffect, useRef } from 'react'

/**
 * Animated particle network background. Canvas-based, GPU-friendly.
 * Renders connected dots that drift and form lines when close.
 */
export default function ParticleField({ count = 80, color = '0,255,225' }) {
  const ref = useRef(null)
  const raf = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let w = canvas.width = canvas.offsetWidth
    let h = canvas.height = canvas.offsetHeight
    const onResize = () => { w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight }
    window.addEventListener('resize', onResize)

    const pts = Array.from({ length: count }).map(() => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.6,
    }))

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      // lines
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
          const d2 = dx * dx + dy * dy
          if (d2 < 14000) {
            const a = (1 - d2 / 14000) * 0.35
            ctx.strokeStyle = `rgba(${color},${a})`
            ctx.lineWidth = 0.6
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.stroke()
          }
        }
      }
      // dots
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        ctx.fillStyle = `rgba(${color},0.7)`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf.current = requestAnimationFrame(tick)
    }
    tick()
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener('resize', onResize) }
  }, [count, color])

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />
}
