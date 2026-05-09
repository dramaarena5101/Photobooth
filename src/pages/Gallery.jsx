import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { QRCodeSVG } from 'qrcode.react'
import Modal from '../components/Modal'
import { Search, Download, Printer, Share2, Eye, Images, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function printImage(url, printerSettings = {}) {
  const { paperSize = 'A4', orientation = 'portrait', copies = 1 } = printerSettings
  const win = window.open('', '_blank')
  if (!win) { toast.error('Popup diblokir browser. Izinkan popup.'); return }
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Print Photo</title>
  <style>
    @page { size: ${paperSize} ${orientation}; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
    img { max-width: 100%; max-height: 100vh; object-fit: contain; }
  </style>
</head>
<body>
  <img src="${url}" onload="window.print(); setTimeout(() => window.close(), 500);" />
</body>
</html>`)
  win.document.close()
}

export default function Gallery() {
  const { photos, fetchPhotos, photosLoading, sessions, galleryFilterSession, setGalleryFilterSession } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewMode, setViewMode] = useState('print') // 'print' | 'raw'
  const [rawIndex, setRawIndex] = useState(0)
  const [printerSettings, setPrinterSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('printer_settings') || '{}') } catch { return {} }
  })

  useEffect(() => { fetchPhotos() }, [])

  const filtered = photos.filter(p => {
    const matchSearch = p.username?.toLowerCase().includes(search.toLowerCase()) ||
      p.filename?.toLowerCase().includes(search.toLowerCase())
    const matchSession = galleryFilterSession === 'all' || p.session_id === galleryFilterSession
    const matchType = filterType === 'all' || p.type === filterType
    return matchSearch && matchSession && matchType
  })

  const openDetail = (photo) => {
    setSelectedPhoto(photo)
    setViewMode('print')
    setRawIndex(0)
    setShowQR(false)
    setShowDeleteConfirm(false)
  }

  const rawPhotos = selectedPhoto?.raw_urls || []
  const currentRawUrl = rawPhotos[rawIndex]
  const printUrl = selectedPhoto?.url

  const handleDownload = (url, suffix = '') => {
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedPhoto?.filename || 'photo'}${suffix}.jpg`
    a.target = '_blank'
    a.click()
  }

  const handlePrint = (url) => {
    printImage(url, printerSettings)
  }

  const handleDelete = async () => {
    if (!selectedPhoto) return
    setIsDeleting(true)
    const { deletePhoto } = useAppStore.getState()
    const { error } = await deletePhoto(selectedPhoto)
    setIsDeleting(false)
    if (error) {
      toast.error('Gagal menghapus foto')
    } else {
      toast.success('Foto dan file berhasil dihapus!')
      setSelectedPhoto(null)
      setShowDeleteConfirm(false)
    }
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
          value={galleryFilterSession} onChange={e => setGalleryFilterSession(e.target.value)}>
          <option value="all">All Sessions</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Grid */}
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
                style={{ aspectRatio: photo.type === 'print' ? '3/4' : '4/3' }}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }} whileHover={{ scale: 1.02 }}
                onClick={() => openDetail(photo)}>
                <img src={photo.raw_urls?.[0] || photo.url || 'https://via.placeholder.com/300x400'}
                  alt={photo.filename} className="w-full h-full object-cover" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-3"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%)' }}>
                  <p className="text-white text-xs font-semibold truncate">{photo.username}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {photo.created_at ? format(new Date(photo.created_at), 'dd MMM') : ''}
                  </p>
                  <div className="flex gap-1 mt-2">
                    <button onClick={e => { e.stopPropagation(); openDetail(photo); setShowQR(true) }}
                      className="p-1.5 rounded-lg" style={{ background: 'rgba(168,85,247,0.8)' }}>
                      <Share2 size={11} color="white" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDownload(photo.url, '_print') }}
                      className="p-1.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.8)' }}>
                      <Download size={11} color="white" />
                    </button>
                  </div>
                </div>
                <div className="absolute top-2 left-2">
                  <span className={`badge ${photo.type === 'print' ? 'badge-purple' : 'badge-blue'}`}
                    style={{ fontSize: 9, padding: '2px 6px' }}>
                    {photo.type || 'raw'}
                  </span>
                </div>
                {/* Indicator: has raw photos */}
                {photo.raw_urls?.length > 0 && (
                  <div className="absolute top-2 right-2">
                    <span className="badge badge-blue" style={{ fontSize: 9, padding: '2px 5px' }}>
                      {photo.raw_urls.length} raw
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ===== PHOTO DETAIL MODAL ===== */}
      <Modal isOpen={!!selectedPhoto && !showQR} onClose={() => setSelectedPhoto(null)} title="Detail Foto" size="lg">
        {selectedPhoto && (
          <div className="space-y-4">
            {/* Tab: Print / Raw */}
            <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <button onClick={() => setViewMode('print')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${viewMode === 'print' ? 'btn-primary' : ''}`}>
                <Printer size={13} /> Hasil Print
              </button>
              <button onClick={() => setViewMode('raw')}
                disabled={rawPhotos.length === 0}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${viewMode === 'raw' ? 'btn-primary' : ''} disabled:opacity-40`}>
                <Images size={13} /> Foto Mentahan ({rawPhotos.length})
              </button>
            </div>

            {/* Delete Modal Confirmation layered over detail */}
            {showDeleteConfirm ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-900 rounded-xl space-y-4" style={{ minHeight: 200 }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500/20">
                  <Trash2 size={28} className="text-red-500" />
                </div>
                <h3 className="font-bold text-lg">Hapus Permanen?</h3>
                <p className="text-sm text-gray-400">
                  Aksi ini akan menghapus data foto dan file gambar dari database dan storage secara permanen. Tidak bisa dikembalikan.
                </p>
                <div className="flex gap-3 w-full mt-4">
                  <button onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 btn-secondary py-3 rounded-xl text-sm" disabled={isDeleting}>Batal</button>
                  <button onClick={handleDelete}
                    className="flex-1 btn-danger py-3 rounded-xl text-sm flex items-center justify-center gap-2" disabled={isDeleting}>
                    {isDeleting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={14} />}
                    Ya, Hapus
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Image display */}
                {viewMode === 'print' ? (
                  <div className="flex justify-center rounded-xl overflow-hidden" style={{ background: '#000', minHeight: 200, maxHeight: 460 }}>
                    {printUrl ? (
                      <img src={printUrl} alt="print" className="object-contain max-h-[460px] w-auto" />
                    ) : (
                      <div className="flex items-center justify-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
                        Tidak ada foto hasil print
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative flex justify-center rounded-xl overflow-hidden" style={{ background: '#000', minHeight: 200, maxHeight: 400 }}>
                      {currentRawUrl ? (
                        <img src={currentRawUrl} alt={`raw ${rawIndex + 1}`} className="object-contain max-h-[400px] w-auto" />
                      ) : (
                        <div className="flex items-center justify-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
                          Tidak ada foto mentahan
                        </div>
                      )}
                      {/* Prev / Next raw */}
                      {rawPhotos.length > 1 && (
                        <>
                          <button onClick={() => setRawIndex(i => Math.max(0, i - 1))}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg"
                            style={{ background: 'rgba(0,0,0,0.6)' }} disabled={rawIndex === 0}>
                            <ChevronLeft size={16} />
                          </button>
                          <button onClick={() => setRawIndex(i => Math.min(rawPhotos.length - 1, i + 1))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg"
                            style={{ background: 'rgba(0,0,0,0.6)' }} disabled={rawIndex === rawPhotos.length - 1}>
                            <ChevronRight size={16} />
                          </button>
                        </>
                      )}
                    </div>
                    {/* Raw thumbnail strip */}
                    {rawPhotos.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {rawPhotos.map((url, i) => (
                          <button key={i} onClick={() => setRawIndex(i)}
                            className="flex-shrink-0 rounded-lg overflow-hidden"
                            style={{ width: 64, height: 48, border: `2px solid ${i === rawIndex ? '#a855f7' : 'transparent'}` }}>
                            <img src={url} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Info */}
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Nama</p>
                    <p className="font-semibold text-sm truncate">{selectedPhoto.username || 'N/A'}</p>
                  </div>
                  <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Tanggal</p>
                    <p className="font-semibold text-xs">
                      {selectedPhoto.created_at ? format(new Date(selectedPhoto.created_at), 'dd MMM yyyy') : 'N/A'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Sesi</p>
                    <p className="font-semibold text-xs truncate">
                      {sessions.find(s => s.id === selectedPhoto.session_id)?.name || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                  {viewMode === 'print' && printUrl && (
                    <>
                      <motion.button onClick={() => handlePrint(printUrl)}
                        className="btn-primary py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}>
                        <Printer size={14} /> Print Hasil
                      </motion.button>
                      <motion.button onClick={() => handleDownload(printUrl, '_print')}
                        className="btn-secondary py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}>
                        <Download size={14} /> Download
                      </motion.button>
                    </>
                  )}
                  {viewMode === 'raw' && currentRawUrl && (
                    <>
                      <motion.button onClick={() => handlePrint(currentRawUrl)}
                        className="btn-primary py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}>
                        <Printer size={14} /> Print Mentahan
                      </motion.button>
                      <motion.button onClick={() => handleDownload(currentRawUrl, `_raw${rawIndex + 1}`)}
                        className="btn-secondary py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02 }}>
                        <Download size={14} /> Download
                      </motion.button>
                    </>
                  )}
                  <motion.button onClick={() => setShowQR(true)}
                    className="btn-secondary py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}>
                    <Share2 size={14} /> Share QR
                  </motion.button>
                  {printUrl && rawPhotos.length > 0 && (
                    <motion.button
                      onClick={() => { handlePrint(printUrl); rawPhotos.forEach(u => handlePrint(u)) }}
                      className="btn-secondary py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                      style={{ fontSize: 12 }}
                      whileHover={{ scale: 1.02 }}>
                      <Printer size={14} /> Print Semua
                    </motion.button>
                  )}
                  <motion.button onClick={() => setShowDeleteConfirm(true)}
                    className="btn-danger py-3 rounded-xl text-sm flex items-center justify-center gap-2 col-span-2 mt-2"
                    whileHover={{ scale: 1.02 }}>
                    <Trash2 size={14} /> Hapus Foto & Mentahan
                  </motion.button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* QR Modal */}
      <Modal isOpen={showQR} onClose={() => setShowQR(false)} title="Share QR Code" size="sm">
        {selectedPhoto && (
          <div className="text-center space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Scan untuk download foto</p>
            <div className="qr-container mx-auto w-fit">
              <QRCodeSVG value={`${window.location.origin}/?share=${selectedPhoto.session_id}&user=${encodeURIComponent(selectedPhoto.username || '')}`} size={200} level="H" />
            </div>
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?share=${selectedPhoto.session_id}&user=${encodeURIComponent(selectedPhoto.username || '')}`); toast.success('Link disalin!') }}
              className="w-full btn-secondary py-3 rounded-xl text-sm">Salin Link</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
