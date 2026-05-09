import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Webcam from 'react-webcam'
import { QRCodeSVG } from 'qrcode.react'
import { useAppStore } from '../store/useAppStore'
import Modal from '../components/Modal'
import {
  Camera, X, Maximize2, Minimize2, RotateCcw, Download,
  Printer, Share2, ChevronLeft, Zap, CheckCircle,
  Upload, WifiOff, User
} from 'lucide-react'
import { uploadToStorage, getPublicUrl, dataURLtoBlob, blobToFile, sleep, playShutterSound, playBeep } from '../utils/helpers'
import { generatePhotoComposite } from '../utils/canvasEngine'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const STEPS = {
  ENTER_NAME: 'enter_name', PREVIEW: 'preview', COUNTDOWN: 'countdown',
  CAPTURING: 'capturing', REVIEW: 'review', PROCESSING: 'processing', RESULT: 'result'
}

export default function Booth({ session, onBack }) {
  const { savePhoto, addToQueue } = useAppStore()
  const [step, setStep] = useState(STEPS.ENTER_NAME)
  const [username, setUsername] = useState('')
  const [countdown, setCountdown] = useState(null)
  const [capturedPhotos, setCapturedPhotos] = useState([])
  const [compositeUrl, setCompositeUrl] = useState(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [shotIndex, setShotIndex] = useState(0)
  const [flashActive, setFlashActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [driveUrl, setDriveUrl] = useState(null)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [shotDelay, setShotDelay] = useState(3)
  const [totalShots, setTotalShots] = useState(3)
  const [cameraFacing, setCameraFacing] = useState('user')
  const [templateLoaded, setTemplateLoaded] = useState(false)
  const [retakeSlot, setRetakeSlot] = useState(null) // null means normal, number means retaking that slot
  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState(null)
  const webcamRef = useRef(null)
  const containerRef = useRef(null)
  const captureRef = useRef(false)

  const isStrip = session?.layout === 'strip'
  const videoConstraints = {
    width: isStrip ? { ideal: 720 } : { ideal: 1280 },
    height: isStrip ? { ideal: 1280 } : { ideal: 720 },
    ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { facingMode: cameraFacing })
  }

  const toggleFullscreen = () => {
    if (!fullscreen) { containerRef.current?.requestFullscreen?.(); setFullscreen(true) }
    else { document.exitFullscreen?.(); setFullscreen(false) }
  }

  useEffect(() => {
    const h = () => { if (!document.fullscreenElement) setFullscreen(false) }
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  const handleDevices = useCallback(
    (mediaDevices) => {
      const videoDevices = mediaDevices.filter(({ kind }) => kind === 'videoinput')
      setDevices(videoDevices)
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId)
      }
    },
    [selectedDeviceId]
  )

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(handleDevices)
  }, [handleDevices])

  const startCapture = async () => {
    if (captureRef.current) return
    captureRef.current = true

    // If retaking a specific slot
    if (retakeSlot !== null) {
      setShotIndex(retakeSlot)
      for (let c = shotDelay; c >= 1; c--) {
        setCountdown(c); playBeep(c === 1 ? 900 : 600)
        setStep(STEPS.COUNTDOWN); await sleep(1000)
      }
      setCountdown(null); setStep(STEPS.CAPTURING)
      setFlashActive(true); playShutterSound(); await sleep(80)
      const rawImg = webcamRef.current?.getScreenshot()
      setFlashActive(false)
      if (rawImg) {
        const croppedImg = await cropToPreview(rawImg, isStrip ? 1.38 : 1.5)
        setCapturedPhotos(prev => {
          const next = [...prev]
          next[retakeSlot] = croppedImg
          return next
        })
      }
      setRetakeSlot(null); captureRef.current = false
      setStep(STEPS.REVIEW); return
    }

    // Normal: capture all shots
    const photos = []
    for (let shot = 0; shot < totalShots; shot++) {
      setShotIndex(shot)
      for (let c = shotDelay; c >= 1; c--) {
        setCountdown(c); playBeep(c === 1 ? 900 : 600)
        setStep(STEPS.COUNTDOWN); await sleep(1000)
      }
      setCountdown(null); setStep(STEPS.CAPTURING)
      setFlashActive(true); playShutterSound(); await sleep(80)
      const rawImg = webcamRef.current?.getScreenshot()
      setFlashActive(false)
      if (rawImg) {
        const croppedImg = await cropToPreview(rawImg, isStrip ? 1.38 : 1.5)
        photos.push(croppedImg)
        setCapturedPhotos([...photos])
      }
      if (shot < totalShots - 1) await sleep(800)
    }
    setStep(STEPS.REVIEW)
    captureRef.current = false
  }

  const processComposite = async () => {
    setStep(STEPS.PROCESSING)
    try {
      const composite = await generatePhotoComposite(capturedPhotos, session, username)
      setCompositeUrl(composite)
      await handleUpload(capturedPhotos, composite)
      setStep(STEPS.RESULT)
    } catch (e) {
      console.error('CAPTURE ERROR:', e)
      toast.error('Processing failed: ' + e.message)
      setStep(STEPS.REVIEW)
    }
  }

  const handleRetake = (idx) => {
    setRetakeSlot(idx)
    setStep(STEPS.PREVIEW)
    toast(`Retake foto #${idx + 1} — tekan Start Capture`, { icon: '📸' })
  }

  const cropToPreview = (dataUrl, targetRatio) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          let sourceW = img.width
          let sourceH = img.height
          const sourceRatio = sourceW / sourceH
          
          let targetW, targetH, offsetX, offsetY
          
          if (sourceRatio > targetRatio) {
            targetH = sourceH
            targetW = sourceH * targetRatio
            offsetX = (sourceW - targetW) / 2
            offsetY = 0
          } else {
            targetW = sourceW
            targetH = sourceW / targetRatio
            offsetX = 0
            offsetY = (sourceH - targetH) / 2
          }
          
          const targetW_internal = isStrip ? 552 : 900
          canvas.width = targetW_internal
          canvas.height = canvas.width / targetRatio
          
          ctx.drawImage(img, offsetX, offsetY, targetW, targetH, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.95))
        } catch (err) { reject(err) }
      }
      img.onerror = () => reject(new Error('Failed to load captured image'))
      img.src = dataUrl
    })
  }

  const handleUpload = async (rawPhotos, composite) => {
    setUploadStatus('uploading')
    setUploadProgress(0)
    const cs = (session?.name || 'session').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    const cu = (username || 'guest').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    const ts = format(new Date(), 'yyyyMMdd_HHmmss')
    const base = `${cs}_${cu}_${ts}`
    try {
      for (let i = 0; i < rawPhotos.length; i++) {
        const blob = dataURLtoBlob(rawPhotos[i])
        const file = blobToFile(blob, `${base}_raw${i + 1}.jpg`)
        await uploadToStorage('photobooth', `${cs}/RAW/${base}_raw${i + 1}.jpg`, file)
        setUploadProgress(Math.round(((i + 1) / (rawPhotos.length + 1)) * 80))
      }
      const compBlob = dataURLtoBlob(composite)
      const compFile = blobToFile(compBlob, `${base}_print.jpg`)
      const printPath = `${cs}/PRINT/${base}_print.jpg`
      await uploadToStorage('photobooth', printPath, compFile)
      setUploadProgress(90)
      const printUrl = getPublicUrl('photobooth', printPath)
      setDriveUrl(printUrl)
      await savePhoto({
        session_id: session?.id, username,
        raw_urls: rawPhotos.map((_, i) => getPublicUrl('photobooth', `${cs}/RAW/${base}_raw${i + 1}.jpg`)),
        url: printUrl, type: 'print', filename: base, created_at: new Date().toISOString(),
      })
      if (session?.id) {
        const { error: rpcError } = await supabase.rpc('increment_photo_count', { session_id: session.id })
        if (rpcError) console.error('RPC Error:', rpcError)
      }
      setUploadProgress(100)
      setUploadStatus('done')
      toast.success('Photos uploaded!')
    } catch (e) {
      console.error(e)
      setUploadStatus('error')
      addToQueue({ rawPhotos, composite, username, session, timestamp: Date.now() })
      toast.error('Upload failed — saved to offline queue')
    }
  }

  const handleReset = () => {
    setCapturedPhotos([]); setCompositeUrl(null); setStep(STEPS.PREVIEW)
    setUploadProgress(0); setUploadStatus(null); setDriveUrl(null)
    setShotIndex(0); captureRef.current = false
  }

  const handlePrint = () => {
    if (!compositeUrl) return
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>Print</title>
    <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;}
    img{max-width:100%;max-height:100vh;}</style></head><body>
    <img src="${compositeUrl}" onload="window.print();window.close();" /></body></html>`)
    win.document.close()
    setShowPrintModal(false)
  }

  const handleDownload = () => {
    if (!compositeUrl) return
    const a = document.createElement('a')
    a.href = compositeUrl
    a.download = `photobooth_${username}_${Date.now()}.jpg`
    a.click()
  }

  // ENTER NAME SCREEN
  if (step === STEPS.ENTER_NAME) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <motion.div className="glass p-10 w-full max-w-md text-center"
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-2 text-sm mb-6 btn-secondary px-3 py-1.5 rounded-lg mx-auto">
              <ChevronLeft size={14} /> Back to Sessions
            </button>
          )}
          <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center animate-pulse-glow btn-primary">
            <Camera size={36} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            <span className="gradient-text">{session?.name || 'Photobooth'}</span>
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Enter your name to begin</p>
          <div className="relative mb-6">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input className="input-glass w-full pl-10 pr-4 py-4 rounded-xl text-sm text-center"
              placeholder="Your name..." value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && username.trim() && setStep(STEPS.PREVIEW)}
              autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block text-left" style={{ color: 'var(--text-muted)' }}>Shots</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(n => (
                  <button key={n} onClick={() => setTotalShots(n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${totalShots === n ? 'btn-primary' : 'btn-secondary'}`}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block text-left" style={{ color: 'var(--text-muted)' }}>Delay</label>
              <div className="flex gap-2">
                {[3, 5, 10].map(n => (
                  <button key={n} onClick={() => setShotDelay(n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${shotDelay === n ? 'btn-primary' : 'btn-secondary'}`}>{n}s</button>
                ))}
              </div>
            </div>
          </div>
          <motion.button className="btn-primary w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
            onClick={() => username.trim() && setStep(STEPS.PREVIEW)}
            disabled={!username.trim()} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Camera size={18} /> Start Session
          </motion.button>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            {totalShots} photos • {shotDelay}s countdown • {session?.layout === '4x6' ? '4×6' : 'Strip'}
          </p>
        </motion.div>
      </div>
    )
  }

  // MAIN BOOTH SCREEN
  return (
    <div ref={containerRef}
      className={`flex flex-col ${fullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'}`}
      style={{ background: '#000' }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 z-10 flex-shrink-0"
        style={{ background: 'rgba(7,11,20,0.95)', borderBottom: '1px solid var(--border-glass)' }}>
        <div className="flex items-center gap-3">
          {onBack && step !== STEPS.COUNTDOWN && step !== STEPS.CAPTURING && (
            <button onClick={onBack} className="btn-secondary p-2 rounded-lg"><ChevronLeft size={16} /></button>
          )}
          <div>
            <h2 className="font-bold text-sm" style={{ fontFamily: 'Space Grotesk' }}>{session?.name || 'Booth'}</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{username}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {Array(totalShots).fill(0).map((_, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                style={{
                  background: i < capturedPhotos.length ? 'var(--accent-purple)'
                    : i === shotIndex && (step === STEPS.COUNTDOWN || step === STEPS.CAPTURING) ? 'var(--accent-pink)'
                    : 'rgba(255,255,255,0.15)'
                }} />
            ))}
          </div>
          <button onClick={toggleFullscreen} className="btn-secondary p-2 rounded-lg">
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Camera */}
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
          <AnimatePresence>
            {flashActive && (
              <motion.div className="absolute inset-0 bg-white z-20"
                initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.3 }} />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {step === STEPS.COUNTDOWN && countdown !== null && (
              <motion.div className="absolute inset-0 z-10 flex flex-col items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-white/60 text-lg font-semibold mb-2">Photo {shotIndex + 1} of {totalShots}</p>
                <AnimatePresence mode="wait">
                  <motion.div key={countdown} className="countdown-number"
                    initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.3, ease: 'backOut' }}>
                    {countdown}
                  </motion.div>
                </AnimatePresence>
                <p className="text-white/50 text-base mt-4">Smile! 😄</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {step === STEPS.PROCESSING && (
              <motion.div className="absolute inset-0 z-10 flex flex-col items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="w-16 h-16 border-4 rounded-full animate-spin mb-4"
                  style={{ borderColor: 'rgba(168,85,247,0.2)', borderTopColor: '#a855f7' }} />
                <p className="text-white font-semibold">Processing...</p>
                <p className="text-white/50 text-sm mt-1">Creating your photobooth strip</p>
              </motion.div>
            )}
          </AnimatePresence>

          {step !== STEPS.RESULT ? (
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
              {/* Full-Screen Camera Feed */}
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.95}
                videoConstraints={videoConstraints}
                mirrored={cameraFacing === 'user'}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
              />

              {/* Shot progress bar at top */}
              <div className="absolute top-0 left-0 right-0 z-20 flex"
                style={{ height: 4, background: 'rgba(0,0,0,0.3)' }}>
                {Array.from({ length: totalShots }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: '100%', marginRight: 2,
                    background: i < capturedPhotos.length ? '#10b981'
                      : i === shotIndex && (step === STEPS.COUNTDOWN || step === STEPS.CAPTURING) ? '#a855f7'
                      : 'rgba(255,255,255,0.2)',
                    transition: 'background 0.3s'
                  }} />
                ))}
              </div>

              {/* Guide text bottom */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
                <div className="px-4 py-2 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-xs text-white/80 flex items-center gap-2">
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: step === STEPS.COUNTDOWN || step === STEPS.CAPTURING ? '#ef4444' : '#10b981',
                    display: 'inline-block',
                    boxShadow: step === STEPS.CAPTURING ? '0 0 6px #ef4444' : 'none'
                  }} />
                  {capturedPhotos.length < totalShots
                    ? `Foto ${capturedPhotos.length + 1} dari ${totalShots} — lihat preview di kanan`
                    : 'Semua foto diambil — cek preview di kanan'}
                </div>
              </div>

              {/* Corner frame guides */}
              <div className="absolute z-10 pointer-events-none" style={{ inset: '10%' }}>
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2" style={{ borderColor: 'rgba(168,85,247,0.6)' }} />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2" style={{ borderColor: 'rgba(168,85,247,0.6)' }} />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2" style={{ borderColor: 'rgba(168,85,247,0.6)' }} />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2" style={{ borderColor: 'rgba(168,85,247,0.6)' }} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full p-8">
              <motion.img src={compositeUrl} alt="Result" className="max-h-full max-w-full rounded-2xl object-contain"
                style={{ boxShadow: '0 0 60px rgba(168,85,247,0.3)' }}
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'backOut' }} />
            </div>
          )}

          {(step === STEPS.PREVIEW || step === STEPS.COUNTDOWN || step === STEPS.CAPTURING) && (
            <div className="absolute inset-4 pointer-events-none" style={{ border: '2px solid rgba(168,85,247,0.3)', borderRadius: 12 }}>
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-xl" style={{ borderColor: '#a855f7' }} />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-xl" style={{ borderColor: '#a855f7' }} />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-xl" style={{ borderColor: '#a855f7' }} />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-xl" style={{ borderColor: '#a855f7' }} />
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-full md:w-72 flex flex-col flex-shrink-0 border-t md:border-t-0 md:border-l"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-glass)' }}>
          <div className="flex-1 p-4 overflow-y-auto max-h-60 md:max-h-none">
            {/* Template Live Preview */}
            {session?.overlay_url && session?.photo_slots?.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  Preview Template
                </p>
                <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '2/3' }}>
                  <img src={session.overlay_url} className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none" />
                  {session.photo_slots.map((slot, i) => {
                    const captured = capturedPhotos[i]
                    const isActive = i === shotIndex && step !== STEPS.RESULT && step !== STEPS.PROCESSING
                    return (
                      <div key={i} style={{
                        position: 'absolute',
                        left: `${slot.x}%`, top: `${slot.y}%`,
                        width: `${slot.w}%`, height: `${slot.h}%`,
                        zIndex: 5, overflow: 'hidden'
                      }}>
                        {captured ? (
                          <img src={captured} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"
                            style={{ background: isActive ? 'rgba(168,85,247,0.25)' : 'rgba(0,0,0,0.4)', border: `2px solid ${isActive ? '#a855f7' : 'rgba(255,255,255,0.1)'}` }}>
                            {isActive ? <span className="text-purple-400 text-xs font-bold animate-pulse">● LIVE</span>
                              : <Camera size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />}
                          </div>
                        )}
                        {captured && step === STEPS.REVIEW && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => handleRetake(i)}
                              className="px-2 py-1 rounded text-xs font-bold flex items-center gap-1"
                              style={{ background: '#a855f7', color: '#fff' }}>
                              <RotateCcw size={10} /> Retake
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                  {capturedPhotos.length}/{session.photo_slots.length} foto diambil
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  Captures ({capturedPhotos.length}/{totalShots})
                </p>
                <div className="space-y-3">
                  <AnimatePresence>
                    {capturedPhotos.map((photo, i) => (
                      <motion.div key={i} className="relative rounded-xl overflow-hidden group"
                        style={{ aspectRatio: '4/3' }}
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <img src={photo} alt={`Shot ${i + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 badge badge-purple" style={{ fontSize: 10 }}>#{i + 1}</div>
                        {step === STEPS.REVIEW && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => handleRetake(i)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                              style={{ background: '#a855f7', color: '#fff' }}>
                              <RotateCcw size={12} /> Retake
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                    {Array(Math.max(0, totalShots - capturedPhotos.length)).fill(0).map((_, i) => (
                      <div key={`e${i}`} className="rounded-xl flex items-center justify-center"
                        style={{ aspectRatio: '4/3', background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                        <Camera size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
                      </div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
            {uploadStatus && (
              <motion.div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)' }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-2 mb-2">
                  {uploadStatus === 'uploading' && <Upload size={12} style={{ color: '#a855f7' }} />}
                  {uploadStatus === 'done' && <CheckCircle size={12} style={{ color: '#10b981' }} />}
                  {uploadStatus === 'error' && <WifiOff size={12} style={{ color: '#ef4444' }} />}
                  <span className="text-xs font-semibold">
                    {uploadStatus === 'uploading' ? 'Uploading...' : uploadStatus === 'done' ? 'Uploaded!' : 'Offline Queue'}
                  </span>
                </div>
                <div className="w-full rounded-full" style={{ height: 3, background: 'rgba(255,255,255,0.1)' }}>
                  <motion.div className="upload-progress-bar" animate={{ width: `${uploadProgress}%` }} />
                </div>
              </motion.div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t space-y-2" style={{ borderColor: 'var(--border-glass)' }}>
            {step === STEPS.RESULT ? (
              <>
                <motion.button className="btn-primary w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                  onClick={() => setShowPrintModal(true)} whileHover={{ scale: 1.02 }}>
                  <Printer size={15} /> Print Photo
                </motion.button>
                <motion.button className="btn-secondary w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                  onClick={handleDownload} whileHover={{ scale: 1.02 }}>
                  <Download size={15} /> Download
                </motion.button>
                {driveUrl && (
                  <motion.button className="btn-secondary w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                    onClick={() => setShowQRModal(true)} whileHover={{ scale: 1.02 }}>
                    <Share2 size={15} /> QR Code
                  </motion.button>
                )}
                <motion.button className="btn-secondary w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                  onClick={handleReset} whileHover={{ scale: 1.02 }}>
                  <RotateCcw size={13} /> Take New Photos
                </motion.button>
              </>
            ) : step === STEPS.PREVIEW ? (
              <>
                {devices.length > 1 && (
                  <select
                    className="input-glass w-full py-2.5 px-3 rounded-xl text-xs mb-1"
                    value={selectedDeviceId || ''}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                  >
                    {devices.map((device, key) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Kamera ${key + 1}`}
                      </option>
                    ))}
                  </select>
                )}
                <motion.button className="btn-primary w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                  onClick={startCapture} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Zap size={16} /> Start Capture
                </motion.button>
              </>
            ) : step === STEPS.REVIEW ? (
              <>
                <motion.button className="btn-primary w-full py-4 rounded-xl font-semibold text-sm flex flex-col items-center justify-center gap-1"
                  onClick={processComposite} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <span className="flex items-center gap-2"><CheckCircle size={16} /> Lanjut Cetak</span>
                  <span className="text-xs font-normal opacity-80" style={{ fontSize: 10 }}>Gabung foto</span>
                </motion.button>
                <p className="text-xs text-center text-gray-400 mt-2 leading-tight">
                  💡 Arahkan kursor ke foto di preview untuk Retake
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center py-4 gap-3">
                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {step === STEPS.COUNTDOWN ? `Shot ${shotIndex + 1}/${totalShots}...` : 'Processing...'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} title="Print Preview" size="lg">
        <div className="space-y-4">
          {compositeUrl && (
            <div className="flex justify-center bg-gray-900 rounded-xl p-4">
              <img src={compositeUrl} alt="Print preview" className="max-h-96 object-contain rounded-xl" />
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setShowPrintModal(false)} className="flex-1 btn-secondary py-3 rounded-xl text-sm">Cancel</button>
            <motion.button onClick={handlePrint}
              className="flex-1 btn-primary py-3 rounded-xl text-sm flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}>
              <Printer size={15} /> Print Now
            </motion.button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} title="Share QR Code" size="sm">
        <div className="text-center space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Scan to download your photos</p>
          <div className="qr-container mx-auto w-fit">
            <QRCodeSVG value={`${window.location.origin}/?share=${session?.id}&user=${encodeURIComponent(username || '')}`} size={200} level="H" />
          </div>
          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?share=${session?.id}&user=${encodeURIComponent(username || '')}`); toast.success('Copied!') }}
            className="w-full btn-secondary py-3 rounded-xl text-sm">Copy Link</button>
        </div>
      </Modal>
    </div>
  )
}
