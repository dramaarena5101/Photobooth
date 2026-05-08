import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

// Upload file to Supabase Storage
export const uploadToStorage = async (bucket, path, file, onProgress) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })
  return { data, error }
}

// Get public URL from storage
export const getPublicUrl = (bucket, path) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Generate filename
export const generateFilename = (sessionName, username, type = 'raw') => {
  const ts = format(new Date(), 'yyyyMMdd_HHmmss')
  const clean = (s) => s.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  return `${clean(sessionName)}_${clean(username)}_${ts}_${type}`
}

// Convert dataURL to Blob
export const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) u8arr[n] = bstr.charCodeAt(n)
  return new Blob([u8arr], { type: mime })
}

// Convert blob to File
export const blobToFile = (blob, filename) => {
  return new File([blob], filename, { type: blob.type })
}

// Format bytes
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

// Generate QR data URL
export const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// Play shutter sound
export const playShutterSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.frequency.setValueAtTime(800, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1)
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.1)
  } catch (e) {}
}

// Play countdown beep
export const playBeep = (freq = 600) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime)
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.15)
  } catch (e) {}
}

// Validate passcode
export const validatePasscode = (input, passcode) => {
  return input.trim() === passcode.trim()
}
