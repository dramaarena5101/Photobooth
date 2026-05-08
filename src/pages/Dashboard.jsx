import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import StatCard from '../components/StatCard'
import { Camera, FolderOpen, Images, Printer, Clock, ExternalLink, Download, Eye, Zap } from 'lucide-react'
import { format } from 'date-fns'

export default function Dashboard() {
  const { stats, fetchStats, photos, fetchPhotos, sessions, fetchSessions, photosLoading } = useAppStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchStats(), fetchPhotos(), fetchSessions()])
      setLoading(false)
    }
    load()
  }, [])

  const recentPhotos = photos.slice(0, 8)
  const recentSessions = sessions.slice(0, 5)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
            <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Welcome back — {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-green">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
            System Online
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Sessions" value={stats.totalSessions} icon={FolderOpen} color="purple" loading={loading} />
        <StatCard title="Total Photos" value={stats.totalPhotos} icon={Camera} color="pink" loading={loading} />
        <StatCard title="Total Prints" value={stats.totalPrints} icon={Printer} color="blue" loading={loading} />
        <StatCard title="Active Now" value={sessions.filter(s => s.status === 'active').length} icon={Zap} color="cyan" loading={loading} />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Photos */}
        <div className="lg:col-span-2 glass p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-base" style={{ fontFamily: 'Space Grotesk' }}>Recent Captures</h2>
            <span className="badge badge-purple">{photos.length} total</span>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="shimmer aspect-[3/4] rounded-xl" />
              ))}
            </div>
          ) : recentPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Camera size={40} style={{ color: 'var(--text-muted)' }} className="mb-3" />
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No photos yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Start a booth session to capture photos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <AnimatePresence>
                {recentPhotos.map((photo, i) => (
                  <motion.div
                    key={photo.id}
                    className="relative group rounded-xl overflow-hidden aspect-[3/4] cursor-pointer"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.03 }}
                  >
                    <img
                      src={photo.url || photo.raw_url || 'https://via.placeholder.com/300x400/1a1a2e/a855f7?text=Photo'}
                      alt="capture"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      <p className="text-xs text-white font-medium truncate">{photo.username}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {photo.created_at ? format(new Date(photo.created_at), 'dd MMM') : ''}
                      </p>
                    </div>
                    {photo.type === 'print' && (
                      <div className="absolute top-2 right-2">
                        <span className="badge badge-purple" style={{ fontSize: 9, padding: '2px 6px' }}>PRINT</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-base" style={{ fontFamily: 'Space Grotesk' }}>Recent Sessions</h2>
            <Clock size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="shimmer h-16 rounded-xl" />
              ))}
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen size={32} style={{ color: 'var(--text-muted)' }} className="mb-3" />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No sessions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session, i) => (
                <motion.div
                  key={session.id}
                  className="p-3 rounded-xl border"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border-glass)' }}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{session.name}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {session.created_at ? format(new Date(session.created_at), 'dd MMM yyyy') : 'N/A'}
                      </p>
                    </div>
                    <span className={`badge ${session.status === 'active' ? 'badge-green' : 'badge-yellow'} flex-shrink-0`}>
                      {session.status || 'active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {session.photo_count || 0}
                      </span> photos
                    </span>
                    <span className="badge badge-blue" style={{ fontSize: 9, padding: '1px 6px' }}>
                      {session.layout || 'strip'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
