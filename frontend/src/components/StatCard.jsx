import { motion } from 'framer-motion'
import Tilt from './Tilt'

export default function StatCard({ label, value, icon: Icon, color = 'cyber-neon', sub, accent }) {
  return (
    <Tilt intensity={8} className="rounded-[18px]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-5 relative overflow-hidden"
      >
        <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-30`} style={{ background: accent || '#00ffe1' }} />
        <div className="flex items-start justify-between relative">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-white/50">{label}</div>
            <div className="text-3xl font-black mt-2 tracking-tight">{value}</div>
            {sub && <div className="text-xs text-white/55 mt-1">{sub}</div>}
          </div>
          {Icon && (
            <div className="p-2.5 rounded-xl glass-dark">
              <Icon size={22} style={{ color: accent || '#00ffe1' }} />
            </div>
          )}
        </div>
      </motion.div>
    </Tilt>
  )
}
