import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Image as ImageIcon, CheckCircle, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function PublicShare({ sessionId, username }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [selected, setSelected] = useState(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [{ data: sess }, { data: ph }] = await Promise.all([
          supabase.from('sessions').select('name,overlay_url').eq('id', sessionId).single(),
          supabase.from('photos').select('*').eq('session_id', sessionId).eq('username', username).order('created_at', { ascending: false })
        ])
        setSession(sess)
        setPhotos(ph || [])
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    if (sessionId && username) load()
  }, [sessionId, username])

  const downloadFile = async (url, filename) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(url, '_blank')
    }
  }

  const downloadAll = async () => {
    setDownloading(true)
    toast('Mengunduh semua foto...', { icon: '📥' })
    const allUrls = []
    photos.forEach((p, pi) => {
      if (p.url) allUrls.push({ url: p.url, name: `${username}_print_${pi + 1}.jpg` })
      ;(p.raw_urls || []).forEach((r, ri) => allUrls.push({ url: r, name: `${username}_raw${pi + 1}_${ri + 1}.jpg` }))
    })
    for (let i = 0; i < allUrls.length; i++) {
      await downloadFile(allUrls[i].url, allUrls[i].name)
      await new Promise(r => setTimeout(r, 400))
    }
    setDownloading(false)
    toast.success('Semua foto terunduh!')
  }

  const allPhotos = []
  photos.forEach(p => {
    if (p.url) allPhotos.push({ url: p.url, type: 'print', photo: p })
    ;(p.raw_urls || []).forEach((r, i) => allPhotos.push({ url: r, type: 'raw', idx: i + 1, photo: p }))
  })

  return (
    <div style={{ minHeight: '100vh', background: '#070b14', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(168,85,247,0.08)', borderBottom: '1px solid rgba(168,85,247,0.2)', padding: '20px 16px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Camera size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              {loading ? 'Loading...' : `Foto ${username}`}
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              {session?.name || ''} • {allPhotos.length} foto
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            {Array(4).fill(0).map((_, i) => (
              <div key={i} style={{ aspectRatio: '3/4', borderRadius: 12, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : allPhotos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <ImageIcon size={48} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: 12 }} />
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>Belum ada foto tersedia</p>
          </div>
        ) : (
          <>
            {/* Download All */}
            <motion.button
              onClick={downloadAll}
              disabled={downloading}
              style={{
                width: '100%', marginTop: 16, marginBottom: 16,
                padding: '14px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg,#a855f7,#ec4899)',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: downloading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: downloading ? 0.7 : 1
              }}
              whileHover={{ scale: downloading ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}>
              <Download size={18} />
              {downloading ? 'Mengunduh...' : `Unduh Semua (${allPhotos.length} foto)`}
            </motion.button>

            {/* Photo Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <AnimatePresence>
                {allPhotos.map((item, i) => (
                  <motion.div key={i}
                    style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', aspectRatio: item.type === 'print' ? '3/4' : '4/3' }}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelected(item)}>
                    <img src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {/* Badge */}
                    <div style={{
                      position: 'absolute', top: 6, left: 6,
                      background: item.type === 'print' ? 'rgba(168,85,247,0.9)' : 'rgba(59,130,246,0.9)',
                      color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4
                    }}>
                      {item.type === 'print' ? 'PRINT' : `RAW ${item.idx}`}
                    </div>
                    {/* Download button */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)', display: 'flex', alignItems: 'flex-end', padding: 8 }}>
                      <button
                        onClick={e => { e.stopPropagation(); downloadFile(item.url, `${username}_${item.type}${item.idx || ''}_${i + 1}.jpg`) }}
                        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                        <Download size={11} /> Unduh
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selected && (
          <motion.div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}>
            <motion.img src={selected.url}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12 }}
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()} />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                onClick={e => { e.stopPropagation(); downloadFile(selected.url, `${username}_${selected.type}_${Date.now()}.jpg`) }}
                style={{ padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#a855f7,#ec4899)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={16} /> Unduh Foto Ini
              </button>
              <button onClick={() => setSelected(null)}
                style={{ padding: '12px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
                Tutup
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
