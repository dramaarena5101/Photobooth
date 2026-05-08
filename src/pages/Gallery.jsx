import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { QRCodeSVG } from 'qrcode.react'
import Modal from '../components/Modal'
import { Search, Download, Printer, Share2, Eye, Trash2, Images, Filter } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function Gallery() {
  const { photos, fetchPhotos, photosLoading, sessions } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterSession, setFilterSession] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => { fetchPhotos() }, [])

  const filtered = photos.filter(p => {
    const matchSearch = p.username?.toLowerCase().includes(search.toLowerCase()) ||
      p.filename?.toLowerCase().includes(search.toLowerCase())
    const matchSession = filterSession === 'all' || p.session_id === filterSession
    const matchType = filterType === 'all' || p.type === filterType
    return matchSearch && matchSession && matchType
  })

  const handleDownload = (photo) => {
    const a = document.createElement('a')
    a.href = photo.url
    a.download = `${photo.filename || 'photo'}.jpg`
    a.target = '_blank'
    a.click()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
            <span className="gradient-text">Gallery</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>All captured photobooth images</p>
        </div>
        <span className="badge badge-purple">{filtered.length} photos</span>
      </div>

      {/* Filters */}
      <div className="glass p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input className="input-glass w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
            placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['all', 'print', 'raw'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${filterType === t ? 'btn-primary' : 'btn-secondary'}`}>
              {t}
            </button>
          ))}
        </div>
        <select className="input-glass px-3 py-2 rounded-xl text-sm"
          value={filterSession} onChange={e => setFilterSession(e.target.value)}>
          <option value="all">All Sessions</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {photosLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array(10).fill(0).map((_, i) => <div key={i} className="shimmer aspect-[3/4] rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center py-24 text-center">
          <Images size={52} style={{ color: 'var(--text-muted)' }} className="mb-4" />
          <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No photos yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Head to the booth to take some shots</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimatePresence>
            {filtered.map((photo, i) => (
              <motion.div key={photo.id || i}
                className="relative group rounded-2xl overflow-hidden cursor-pointer"
                style={{ aspectRatio: photo.type === 'print' && photo.url ? '3/4' : '4/3' }}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }} whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedPhoto(photo)}>
                <img src={photo.url || photo.raw_urls?.[0] || 'https://via.placeholder.com/300x400'}
                  alt={photo.filename} className="w-full h-full object-cover" />
                {/* Hover overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-3"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%)' }}>
                  <p className="text-white text-xs font-semibold truncate">{photo.username}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {photo.created_at ? format(new Date(photo.created_at), 'dd MMM') : ''}
                  </p>
                  <div className="flex gap-1 mt-2">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedPhoto(photo); setShowQR(true) }}
                      className="p-1.5 rounded-lg" style={{ background: 'rgba(168,85,247,0.8)' }}>
                      <Share2 size={11} color="white" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDownload(photo) }}
                      className="p-1.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.8)' }}>
                      <Download size={11} color="white" />
                    </button>
                  </div>
                </div>
                {/* Badge */}
                <div className="absolute top-2 left-2">
                  <span className={`badge ${photo.type === 'print' ? 'badge-purple' : 'badge-blue'}`}
                    style={{ fontSize: 9, padding: '2px 6px' }}>
                    {photo.type || 'raw'}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Photo Detail Modal */}
      <Modal isOpen={!!selectedPhoto && !showQR} onClose={() => setSelectedPhoto(null)} title="Photo Details" size="lg">
        {selectedPhoto && (
          <div className="space-y-4">
            <div className="flex justify-center rounded-xl overflow-hidden" style={{ background: '#000', maxHeight: 480 }}>
              <img src={selectedPhoto.url || selectedPhoto.raw_urls?.[0]} alt="detail"
                className="object-contain max-h-[480px]" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Username</p>
                <p className="font-semibold">{selectedPhoto.username}</p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Type</p>
                <span className={`badge ${selectedPhoto.type === 'print' ? 'badge-purple' : 'badge-blue'}`}>
                  {selectedPhoto.type || 'raw'}
                </span>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Date</p>
                <p className="font-semibold">
                  {selectedPhoto.created_at ? format(new Date(selectedPhoto.created_at), 'dd MMM yyyy HH:mm') : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Filename</p>
                <p className="font-semibold text-xs truncate">{selectedPhoto.filename || 'N/A'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <motion.button onClick={() => handleDownload(selectedPhoto)}
                className="flex-1 btn-primary py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}>
                <Download size={15} /> Download
              </motion.button>
              <motion.button onClick={() => setShowQR(true)}
                className="flex-1 btn-secondary py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}>
                <Share2 size={15} /> Share QR
              </motion.button>
            </div>
          </div>
        )}
      </Modal>

      {/* QR Modal */}
      <Modal isOpen={showQR} onClose={() => setShowQR(false)} title="Share QR Code" size="sm">
        {selectedPhoto && (
          <div className="text-center space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Scan to download photo</p>
            <div className="qr-container mx-auto w-fit">
              <QRCodeSVG value={selectedPhoto.url || window.location.href} size={200} level="H" />
            </div>
            <button onClick={() => { navigator.clipboard.writeText(selectedPhoto.url || ''); toast.success('Copied!') }}
              className="w-full btn-secondary py-3 rounded-xl text-sm">Copy Link</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
