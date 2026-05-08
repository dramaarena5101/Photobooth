import { useAppStore } from '../store/useAppStore'
import {
  uploadToStorage,
  getPublicUrl,
  generateFilename,
  dataURLtoBlob,
  blobToFile,
} from '../utils/helpers'
import { supabase } from '../lib/supabase'

// Draw photobooth strip (portrait)
export const drawPortraitStrip = async (photos, options = {}) => {
  const {
    width = 600,
    photoHeight = 400,
    gap = 12,
    padding = 24,
    bgColor = '#111827',
    borderColor = '#a855f7',
    title = '',
    date = '',
    watermark = '',
    template = 'classic',
  } = options

  const photoCount = photos.length
  const totalHeight = padding * 2 + photoCount * photoHeight + (photoCount - 1) * gap + (title ? 60 : 0) + 40
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = totalHeight
  const ctx = canvas.getContext('2d')

  // Background
  if (template === 'gradient') {
    const grad = ctx.createLinearGradient(0, 0, width, totalHeight)
    grad.addColorStop(0, '#1a0533')
    grad.addColorStop(1, '#0a0a2e')
    ctx.fillStyle = grad
  } else if (template === 'dark') {
    ctx.fillStyle = '#0d1117'
  } else {
    ctx.fillStyle = bgColor
  }
  ctx.fillRect(0, 0, width, totalHeight)

  // Border accent
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 3
  ctx.strokeRect(8, 8, width - 16, totalHeight - 16)

  // Corner decorations
  const corners = [[8, 8], [width - 8, 8], [8, totalHeight - 8], [width - 8, totalHeight - 8]]
  corners.forEach(([x, y]) => {
    ctx.fillStyle = borderColor
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fill()
  })

  // Title
  let yOffset = padding
  if (title) {
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, width / 2, yOffset + 22)
    yOffset += 50
  }

  // Photos
  for (let i = 0; i < photos.length; i++) {
    const img = await loadImage(photos[i])
    const photoX = padding
    const photoW = width - padding * 2
    ctx.save()
    // Rounded corners for photo
    roundRect(ctx, photoX, yOffset, photoW, photoHeight, 8)
    ctx.clip()
    ctx.drawImage(img, photoX, yOffset, photoW, photoHeight)
    ctx.restore()
    // Photo border
    ctx.strokeStyle = 'rgba(168,85,247,0.3)'
    ctx.lineWidth = 1
    roundRect(ctx, photoX, yOffset, photoW, photoHeight, 8)
    ctx.stroke()
    // Photo number badge
    ctx.fillStyle = 'rgba(168,85,247,0.8)'
    ctx.beginPath()
    ctx.arc(photoX + 18, yOffset + 18, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${i + 1}`, photoX + 18, yOffset + 22)
    yOffset += photoHeight + gap
  }

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '12px Inter, sans-serif'
  ctx.textAlign = 'center'
  const footerText = [date, watermark].filter(Boolean).join(' • ')
  ctx.fillText(footerText || '✨ Captured with Photobooth', width / 2, yOffset + 16)

  return canvas.toDataURL('image/jpeg', 0.92)
}

// Draw 4x6 grid layout
export const draw4x6Layout = async (photos, options = {}) => {
  const {
    bgColor = '#111827',
    borderColor = '#a855f7',
    title = '',
    date = '',
    watermark = '',
    template = 'classic',
  } = options

  const width = 900
  const height = 600
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Background
  const grad = ctx.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, '#1a0533')
  grad.addColorStop(1, '#0a1628')
  ctx.fillStyle = template === 'gradient' ? grad : bgColor
  ctx.fillRect(0, 0, width, height)

  // Border
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 2
  ctx.strokeRect(6, 6, width - 12, height - 12)

  const padding = 20
  const gap = 10
  const cols = 2
  const rows = Math.ceil(photos.length / cols)
  const sidebarW = 160
  const photoAreaW = width - padding * 2 - sidebarW - gap
  const cellW = (photoAreaW - (cols - 1) * gap) / cols
  const cellH = (height - padding * 2 - 40 - (rows - 1) * gap) / rows

  // Draw photos grid
  for (let i = 0; i < Math.min(photos.length, cols * rows); i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = padding + col * (cellW + gap)
    const y = padding + row * (cellH + gap)
    const img = await loadImage(photos[i])
    ctx.save()
    roundRect(ctx, x, y, cellW, cellH, 6)
    ctx.clip()
    ctx.drawImage(img, x, y, cellW, cellH)
    ctx.restore()
    ctx.strokeStyle = 'rgba(168,85,247,0.3)'
    ctx.lineWidth = 1
    roundRect(ctx, x, y, cellW, cellH, 6)
    ctx.stroke()
  }

  // Sidebar
  const sbX = width - padding - sidebarW
  ctx.fillStyle = 'rgba(168,85,247,0.08)'
  roundRect(ctx, sbX, padding, sidebarW, height - padding * 2, 10)
  ctx.fill()
  ctx.strokeStyle = 'rgba(168,85,247,0.2)'
  ctx.lineWidth = 1
  roundRect(ctx, sbX, padding, sidebarW, height - padding * 2, 10)
  ctx.stroke()

  // Sidebar content
  ctx.save()
  ctx.translate(sbX + sidebarW / 2, padding + (height - padding * 2) / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = '#a855f7'
  ctx.font = 'bold 18px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(title || 'PHOTOBOOTH', 0, 0)
  ctx.restore()

  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.font = '11px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(date || new Date().toLocaleDateString(), sbX + sidebarW / 2, height - padding - 10)

  if (watermark) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.font = '10px Inter, sans-serif'
    ctx.fillText(watermark, sbX + sidebarW / 2, height - padding - 26)
  }

  return canvas.toDataURL('image/jpeg', 0.92)
}

// Load image helper
const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => resolve(img)
  img.onerror = reject
  img.src = src
})

// Rounded rect helper
const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// Generate composite photo
export const generatePhotoComposite = async (rawPhotos, session, username) => {
  const { layout = 'strip', template = 'classic', watermark = '' } = session || {}
  const options = {
    title: session?.name || 'Photobooth',
    date: new Date().toLocaleDateString('id-ID', { dateStyle: 'long' }),
    watermark,
    template,
    borderColor: '#a855f7',
  }
  if (layout === '4x6') {
    return await draw4x6Layout(rawPhotos, options)
  }
  return await drawPortraitStrip(rawPhotos, options)
}
