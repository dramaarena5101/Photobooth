import { motion } from 'framer-motion'

export default function StatCard({ title, value, icon: Icon, color, suffix = '', loading }) {
  const colors = {
    purple: { bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)', text: '#a855f7', glow: 'stat-card-purple' },
    pink: { bg: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.2)', text: '#ec4899', glow: 'stat-card-pink' },
    blue: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', text: '#3b82f6', glow: 'stat-card-blue' },
    cyan: { bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', text: '#06b6d4', glow: 'stat-card-cyan' },
  }
  const c = colors[color] || colors.purple

  return (
    <motion.div
      className={`glass p-6 ${c.glow}`}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>{title}</p>
          {loading ? (
            <div className="shimmer h-8 w-24 rounded" />
          ) : (
            <motion.p
              className="text-3xl font-bold"
              style={{ fontFamily: 'Space Grotesk', color: c.text }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {value?.toLocaleString()}{suffix}
            </motion.p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          <Icon size={22} style={{ color: c.text }} />
        </div>
      </div>
    </motion.div>
  )
}
