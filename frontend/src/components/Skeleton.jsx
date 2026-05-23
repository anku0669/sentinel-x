import { motion } from 'framer-motion'

/**
 * Skeleton loader — shimmer placeholder for loading states.
 * Use lines={n} for stacked text rows, or pass children for custom shapes.
 */
export default function Skeleton({ lines = 3, className = '', height = 14 }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-md bg-gradient-to-r from-white/5 via-white/10 to-white/5"
          style={{ height, backgroundSize: '200% 100%', width: `${100 - i * 8}%` }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  )
}

export function CardSkeleton({ className = '' }) {
  return (
    <div className={`glass p-5 ${className}`}>
      <Skeleton lines={1} height={10} className="mb-3" />
      <Skeleton lines={1} height={28} className="mb-2" />
      <Skeleton lines={1} height={10} />
    </div>
  )
}
