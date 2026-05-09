import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Save, X, ArrowUp, ArrowDown, LayoutTemplate } from 'lucide-react'
import toast from 'react-hot-toast'

// Standard photobooth resolutions
const PRESETS = {
  portrait_strip: { label: 'Portrait Strip (600×1800)', w: 600, h: 1800 },
  portrait_2: { label: 'Portrait 2-foto (600×1272)', w: 600, h: 1272 },
  landscape_4: { label: 'Landscape 4-foto (1800×600)', w: 1800, h: 600 },
  grid_4x6: { label: 'Grid 4x6 (900×600)', w: 900, h: 600 },
  square: { label: 'Square 1:1 (800×800)', w: 800, h: 800 },
}

const MIN_SIZE = 3

export default function TemplateEditor({ overlayUrl, initialSlots = [], sessionLayout = 'strip', onSave, onClose }) {
  // Parse custom resolution from sessionLayout (format: "custom_1000x2000")
  let defaultPreset = PRESETS[sessionLayout] ? sessionLayout : (sessionLayout === '4x6' ? 'grid_4x6' : 'portrait_strip')
  let initCustomW = 800
  let initCustomH = 800
  
  if (sessionLayout?.startsWith('custom_')) {
    defaultPreset = 'custom'
    const parts = sessionLayout.replace('custom_', '').split('x')
    if (parts.length === 2) {
      initCustomW = parseInt(parts[0]) || 800
      initCustomH = parseInt(parts[1]) || 800
    }
  }

  const [preset, setPreset] = useState(defaultPreset)
  const [customW, setCustomW] = useState(initCustomW)
  const [customH, setCustomH] = useState(initCustomH)
  const [slots, setSlots] = useState(initialSlots.length > 0 ? initialSlots : [])
  const [selected, setSelected] = useState(null)
  const [drag, setDrag] = useState(null)
  const containerRef = useRef(null)

  const getRect = () => containerRef.current?.getBoundingClientRect() || { width: 1, height: 1, left: 0, top: 0 }

  const currentW = preset === 'custom' ? customW : PRESETS[preset]?.w || 800
  const currentH = preset === 'custom' ? customH : PRESETS[preset]?.h || 800
  const currentRatio = `${currentW}/${currentH}`
  const isLandscape = currentW > currentH

  const addSlot = () => {
    const idx = slots.length
    if (isLandscape) {
      setSlots(prev => [...prev, { x: 2 + idx * 24, y: 10, w: 22, h: 80 }])
    } else {
      setSlots(prev => [...prev, { x: 5, y: 5 + idx * 32, w: 90, h: 28 }])
    }
    setSelected(slots.length)
  }

  const addDefaultSlots = (count) => {
    const newSlots = Array.from({ length: count }, (_, i) => {
      if (isLandscape) {
        const slotW = (96 / count) - 2
        return { x: 2 + i * (slotW + 2), y: 10, w: slotW, h: 80 }
      } else {
        const usableH = 80
        const slotH = (usableH / count) - 2
        return { x: 5, y: 5 + i * (slotH + 2), w: 90, h: slotH }
      }
    })
    setSlots(newSlots)
    setSelected(null)
  }

  const deleteSlot = (idx) => {
    setSlots(prev => prev.filter((_, i) => i !== idx))
    setSelected(null)
  }

  const duplicateSlot = (idx) => {
    const s = slots[idx]
    setSlots(prev => [...prev, { x: Math.min(100 - s.w, s.x + 4), y: Math.min(100 - s.h, s.y + 4), w: s.w, h: s.h }])
    setSelected(slots.length)
  }

  const moveSlotUp = (idx) => {
    if (idx === 0) return
    setSlots(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
    setSelected(idx - 1)
  }

  const moveSlotDown = (idx) => {
    if (idx === slots.length - 1) return
    setSlots(prev => {
      const next = [...prev];
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
      return next
    })
    setSelected(idx + 1)
  }

  const onMouseDown = useCallback((e, slotIdx, type) => {
    e.preventDefault()
    e.stopPropagation()
    setSelected(slotIdx)
    setDrag({ slotIdx, type, startMX: e.clientX, startMY: e.clientY, startSlot: { ...slots[slotIdx] } })
  }, [slots])

  const onMouseMove = useCallback((e) => {
    if (!drag) return
    const rect = getRect()
    const dx = ((e.clientX - drag.startMX) / rect.width) * 100
    const dy = ((e.clientY - drag.startMY) / rect.height) * 100
    const s = drag.startSlot

    setSlots(prev => {
      const next = [...prev]
      let { x, y, w, h } = s
      if (drag.type === 'move') {
        x = Math.max(0, Math.min(100 - w, s.x + dx))
        y = Math.max(0, Math.min(100 - h, s.y + dy))
      } else if (drag.type === 'br') {
        w = Math.max(MIN_SIZE, Math.min(100 - x, s.w + dx))
        h = Math.max(MIN_SIZE, Math.min(100 - y, s.h + dy))
      } else if (drag.type === 'bl') {
        const nx = Math.max(0, s.x + dx)
        w = Math.max(MIN_SIZE, s.w - (nx - s.x))
        x = nx; h = Math.max(MIN_SIZE, Math.min(100 - y, s.h + dy))
      } else if (drag.type === 'tr') {
        const ny = Math.max(0, s.y + dy)
        h = Math.max(MIN_SIZE, s.h - (ny - s.y))
        y = ny; w = Math.max(MIN_SIZE, Math.min(100 - x, s.w + dx))
      } else if (drag.type === 'tl') {
        const nx = Math.max(0, s.x + dx)
        const ny = Math.max(0, s.y + dy)
        w = Math.max(MIN_SIZE, s.w - (nx - s.x))
        h = Math.max(MIN_SIZE, s.h - (ny - s.y))
        x = nx; y = ny
      }
      next[drag.slotIdx] = { x, y, w, h }
      return next
    })
  }, [drag])

  const onMouseUp = useCallback(() => setDrag(null), [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  const handleSave = () => {
    if (slots.length === 0) { toast.error('Tambahkan minimal 1 slot foto'); return }
    const layoutValue = preset === 'custom' ? `custom_${customW}x${customH}` : preset
    onSave(slots.map(s => ({
      x: parseFloat(s.x.toFixed(2)), y: parseFloat(s.y.toFixed(2)),
      w: parseFloat(s.w.toFixed(2)), h: parseFloat(s.h.toFixed(2)),
    })), layoutValue)
  }

  const COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

  return (
    <div className="flex flex-col gap-4" style={{ minHeight: 560 }}>
      {/* Top Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Preset picker */}
        <div className="flex items-center gap-2">
          <LayoutTemplate size={14} style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Resolusi:</span>
          <select
            value={preset}
            onChange={e => { setPreset(e.target.value); setSlots([]) }}
            className="input-glass text-xs rounded-lg px-2 py-1.5"
            style={{ fontSize: 12 }}>
            {Object.entries(PRESETS).map(([key, p]) => (
              <option key={key} value={key}>{p.label}</option>
            ))}
            <option value="custom">Custom (Bebas)</option>
          </select>

          {preset === 'custom' && (
            <div className="flex items-center gap-1 ml-2">
              <input type="number" className="input-glass text-xs rounded-lg px-2 py-1" style={{ width: 60 }} 
                value={customW} onChange={e => setCustomW(parseInt(e.target.value) || 100)} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>×</span>
              <input type="number" className="input-glass text-xs rounded-lg px-2 py-1" style={{ width: 60 }} 
                value={customH} onChange={e => setCustomH(parseInt(e.target.value) || 100)} />
            </div>
          )}
        </div>

        {/* Quick add buttons */}
        <div className="flex gap-1 ml-auto">
          {[1, 2, 3, 4].map(n => (
            <button key={n} onClick={() => addDefaultSlots(n)}
              className="btn-secondary px-2 py-1 rounded-lg text-xs font-bold">
              {n} Slot
            </button>
          ))}
          <button onClick={addSlot}
            className="btn-secondary px-3 py-1.5 rounded-xl text-xs flex items-center gap-1">
            <Plus size={12} /> Tambah
          </button>
          <motion.button onClick={handleSave}
            className="btn-primary px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Save size={12} /> Simpan
          </motion.button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Canvas */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              CANVAS — {currentW}×{currentH}px
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              💡 Klik kotak untuk ubah ukuran (resize) · Drag untuk pindah
            </span>
          </div>

          {/* Canvas container */}
          <div className="flex-1 flex items-start justify-center overflow-auto">
            <div
              ref={containerRef}
              className="relative select-none flex-shrink-0"
              style={{
                aspectRatio: currentRatio,
                maxHeight: isLandscape ? 320 : 520,
                maxWidth: isLandscape ? '100%' : 260,
                width: isLandscape ? '100%' : 'auto',
                height: isLandscape ? 'auto' : '100%',
                background: '#1a1a2e',
                borderRadius: 12,
                border: '2px dashed rgba(168,85,247,0.3)',
                cursor: drag?.type === 'move' ? 'grabbing' : 'default',
                overflow: 'hidden',
              }}
              onClick={() => setSelected(null)}
            >
              {/* Template bg image */}
              {overlayUrl && (
                <img src={overlayUrl}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ objectFit: 'fill' }} />
              )}

              {/* Grid guide */}
              <div className="absolute inset-0 pointer-events-none opacity-5"
                style={{
                  backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                  backgroundSize: '10% 10%'
                }} />

              {/* Empty state */}
              {!overlayUrl && slots.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                  <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    Upload PNG template di session<br/>untuk melihat latar belakang
                  </p>
                  <p className="text-xs text-center" style={{ color: 'rgba(168,85,247,0.5)' }}>
                    Klik "1 Slot" / "2 Slot" dll. untuk mulai
                  </p>
                </div>
              )}

              {/* Slots */}
              {slots.map((slot, i) => {
                const color = COLORS[i % COLORS.length]
                const isSel = selected === i
                return (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${slot.x}%`, top: `${slot.y}%`,
                    width: `${slot.w}%`, height: `${slot.h}%`,
                    border: `2px solid ${color}`,
                    background: isSel ? `${color}33` : `${color}15`,
                    boxShadow: isSel ? `0 0 0 2px ${color}55, inset 0 0 20px ${color}22` : 'none',
                    zIndex: isSel ? 20 : 10,
                    transition: drag ? 'none' : 'box-shadow 0.15s',
                    boxSizing: 'border-box',
                    cursor: 'grab'
                  }}
                  onMouseDown={e => onMouseDown(e, i, 'move')}
                  >
                    {/* Label */}
                    <div style={{
                      position: 'absolute', top: 4, left: 4,
                      background: color, color: '#fff',
                      fontSize: 10, fontWeight: 700,
                      padding: '1px 6px', borderRadius: 3,
                      pointerEvents: 'none', lineHeight: '16px'
                    }}>
                      📷 {i + 1}
                    </div>

                    {/* Size badge */}
                    {isSel && (
                      <div style={{
                        position: 'absolute', bottom: 3, right: 3,
                        background: 'rgba(0,0,0,0.75)', color: '#fff',
                        fontSize: 8, padding: '2px 5px', borderRadius: 3,
                        pointerEvents: 'none'
                      }}>
                        {slot.w.toFixed(1)}% × {slot.h.toFixed(1)}%
                      </div>
                    )}

                    {/* Resize handles */}
                    {isSel && ['tl', 'tr', 'bl', 'br'].map(corner => (
                      <div key={corner} style={{
                        position: 'absolute',
                        width: 16, height: 16,
                        background: '#fff',
                        border: `2px solid ${color}`,
                        borderRadius: 4,
                        cursor: `${corner}-resize`,
                        ...(corner === 'tl' ? { top: -8, left: -8 } :
                            corner === 'tr' ? { top: -8, right: -8 } :
                            corner === 'bl' ? { bottom: -8, left: -8 } :
                                             { bottom: -8, right: -8 }),
                        zIndex: 30,
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                      }} onMouseDown={e => onMouseDown(e, i, corner)} />
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right panel: slot list */}
        <div className="w-44 flex flex-col gap-2 flex-shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Slot ({slots.length})
          </p>
          <div className="space-y-1.5 overflow-y-auto flex-1" style={{ maxHeight: 400 }}>
            {slots.length === 0 ? (
              <div className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
                Belum ada slot.<br/>Klik tombol Slot di atas.
              </div>
            ) : slots.map((slot, i) => {
              const color = COLORS[i % COLORS.length]
              return (
                <div key={i}
                  className="p-2.5 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: selected === i ? `${color}1a` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${selected === i ? color : 'rgba(255,255,255,0.08)'}`,
                  }}
                  onClick={() => setSelected(i)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <span className="text-xs font-semibold">Foto {i + 1}</span>
                    </div>
                    <div className="flex gap-0.5">
                      <button onClick={e => { e.stopPropagation(); moveSlotUp(i) }}
                        className="p-1 rounded hover:bg-white/10 text-white/50" title="Naik">▲</button>
                      <button onClick={e => { e.stopPropagation(); moveSlotDown(i) }}
                        className="p-1 rounded hover:bg-white/10 text-white/50" title="Turun">▼</button>
                      <button onClick={e => { e.stopPropagation(); duplicateSlot(i) }}
                        className="p-1 rounded hover:bg-white/10 text-blue-400" title="Duplikat ukuran ini">❐</button>
                      <button onClick={e => { e.stopPropagation(); deleteSlot(i) }}
                        className="p-1 rounded hover:bg-red-500/20 text-red-400" title="Hapus">✕</button>
                    </div>
                  </div>
                  <div className="text-xs leading-4" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                    x:{slot.x.toFixed(1)}% y:{slot.y.toFixed(1)}%<br />
                    {slot.w.toFixed(1)}% × {slot.h.toFixed(1)}%
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-2.5 rounded-xl text-xs" style={{
            background: 'rgba(168,85,247,0.08)',
            border: '1px solid rgba(168,85,247,0.2)',
            color: 'var(--text-muted)', fontSize: 10
          }}>
            📷 Urutan slot = urutan foto diambil.<br />
            Gunakan ▲▼ untuk reorder.
          </div>
        </div>
      </div>
    </div>
  )
}

