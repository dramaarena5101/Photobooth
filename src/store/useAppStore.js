import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAppStore = create((set, get) => ({
  // Auth
  isAdmin: false,
  adminUser: null,
  setAdmin: (user) => {
    set({ isAdmin: true, adminUser: user })
    localStorage.setItem('admin_logged_in', 'true')
  },
  logout: () => {
    set({ isAdmin: false, adminUser: null, activeRoute: 'dashboard' })
    localStorage.removeItem('admin_logged_in')
  },

  // Settings
  inactivityTimeout: parseInt(localStorage.getItem('inactivity_timeout')) || 45, // in minutes
  setInactivityTimeout: (minutes) => {
    set({ inactivityTimeout: minutes })
    localStorage.setItem('inactivity_timeout', minutes.toString())
  },

  // Sessions
  sessions: [],
  currentSession: null,
  sessionsLoading: false,
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (session) => set({ currentSession: session }),

  fetchSessions: async () => {
    set({ sessionsLoading: true })
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) set({ sessions: data || [] })
    set({ sessionsLoading: false })
  },

  createSession: async (sessionData) => {
    const { data, error } = await supabase
      .from('sessions')
      .insert([sessionData])
      .select()
      .single()
    if (!error && data) {
      set((state) => ({ sessions: [data, ...state.sessions] }))
      return { data, error: null }
    }
    return { data: null, error }
  },

  updateSession: async (id, updates) => {
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      set((state) => ({
        sessions: state.sessions.map(s => s.id === id ? data : s)
      }))
    }
    return { data, error }
  },

  deleteSession: async (id) => {
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (!error) {
      set((state) => ({ sessions: state.sessions.filter(s => s.id !== id) }))
    }
    return { error }
  },

  // Photos
  photos: [],
  photosLoading: false,
  setPhotos: (photos) => set({ photos }),

  fetchPhotos: async (sessionId) => {
    set({ photosLoading: true })
    const query = supabase
      .from('photos')
      .select('*, sessions(name)')
      .order('created_at', { ascending: false })
    if (sessionId) query.eq('session_id', sessionId)
    const { data, error } = await query.limit(50)
    if (!error) set({ photos: data || [] })
    set({ photosLoading: false })
  },

  savePhoto: async (photoData) => {
    const { data, error } = await supabase
      .from('photos')
      .insert([photoData])
      .select()
      .single()
    if (!error && data) {
      set((state) => ({ photos: [data, ...state.photos] }))
      return { data, error: null }
    }
    return { data: null, error }
  },

  deletePhoto: async (photo) => {
    // Extract file paths from URLs
    const paths = []
    if (photo.url) {
      const path = photo.url.split('/photobooth/')[1]
      if (path) paths.push(path)
    }
    if (photo.raw_urls) {
      photo.raw_urls.forEach(url => {
        const path = url.split('/photobooth/')[1]
        if (path) paths.push(path)
      })
    }
    // Delete files from storage
    if (paths.length > 0) {
      await supabase.storage.from('photobooth').remove(paths)
    }
    // Delete DB record
    const { error } = await supabase.from('photos').delete().eq('id', photo.id)
    if (!error) {
      set((state) => ({ photos: state.photos.filter(p => p.id !== photo.id) }))
    }
    return { error }
  },

  // Stats
  stats: { totalSessions: 0, totalPhotos: 0, totalPrints: 0 },
  fetchStats: async () => {
    const [sessRes, photoRes, printRes] = await Promise.all([
      supabase.from('sessions').select('id', { count: 'exact', head: true }),
      supabase.from('photos').select('id', { count: 'exact', head: true }),
      supabase.from('photos').select('id', { count: 'exact', head: true }).eq('type', 'print'),
    ])
    set({
      stats: {
        totalSessions: sessRes.count || 0,
        totalPhotos: photoRes.count || 0,
        totalPrints: printRes.count || 0,
      }
    })
  },

  // UI
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  activeRoute: 'dashboard',
  setActiveRoute: (route) => set({ activeRoute: route }),
  galleryFilterSession: 'all',
  setGalleryFilterSession: (id) => set({ galleryFilterSession: id }),

  // Upload queue (offline support)
  uploadQueue: [],
  addToQueue: (item) => set((state) => ({ uploadQueue: [...state.uploadQueue, item] })),
  removeFromQueue: (id) => set((state) => ({ uploadQueue: state.uploadQueue.filter(i => i.id !== id) })),
  clearQueue: () => set({ uploadQueue: [] }),
}))
