import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import Modal from '../components/Modal'
import {
  Plus, Search, Filter, Edit2, Trash2, ExternalLink,
  FolderOpen, Eye, EyeOff, Copy, Check, Camera, ChevronDown, Images
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const TEMPLATES = ['classic', 'gradient', 'dark', 'minimal', 'neon']
const LAYOUTS = ['strip', '4x6']

const defaultForm = {
  name: '', passcode: '', drive_url: '', template: 'classic',
  layout: 'strip', watermark: '', status: 'active', photo_count: 0
}

export default function Sessions({ onStartBooth }) {
  const { sessions, fetchSessions, createSession, updateSession, deleteSession, sessionsLoading, setActiveRoute, setGalleryFilterSession } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [showPasscode, setShowPasscode] = useState({})
  const [copiedId, setCopiedId] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { fetchSessions() }, [])

  const filtered = sessions.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || s.status === filterStatus
    return matchSearch && matchStatus
  })

  const openCreate = () => {
    setEditingSession(null)
    setForm(defaultForm)
    setShowModal(true)
  }

  const openEdit = (session) => {
    setEditingSession(session)
    setForm({ ...defaultForm, ...session })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.passcode.trim()) {
      toast.error('Session name and passcode are required')
      return
    }
    setSaving(true)
    try {
      if (editingSession) {
        const { error } = await updateSession(editingSession.id, form)
        if (error) throw error
        toast.success('Session updated!')
      } else {
        const { error } = await createSession({ ...form, created_at: new Date().toISOString() })
        if (error) throw error
        toast.success('Session created!')
      }
      setShowModal(false)
    } catch (e) {
      toast.error(e.message || 'Something went wrong')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    const { error } = await deleteSession(id)
    if (error) toast.error('Failed to delete')
    else toast.success('Session deleted')
    setDeleteConfirm(null)
  }

  const copyPasscode = (id, passcode) => {
    navigator.clipboard.writeText(passcode)
    setCopiedId(id)
    toast.success('Passcode copied!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleViewGallery = (sessionId) => {
    setGalleryFilterSession(sessionId)
    setActiveRoute('gallery')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
            <span className="gradient-text">Sessions</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage your photobooth event sessions
          </p>
        </div>
        <motion.button
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
          onClick={openCreate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={16} />
          New Session
        </motion.button>
      </div>

      {/* Filters */}
      <div className="glass p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            className="input-glass w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
            placeholder="Search sessions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                filterStatus === s
                  ? 'btn-primary'
                  : 'btn-secondary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} sessions</span>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        {sessionsLoading ? (
          <div className="p-8 space-y-3">
            {Array(4).fill(0).map((_, i) => <div key={i} className="shimmer h-14 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FolderOpen size={48} style={{ color: 'var(--text-muted)' }} className="mb-4" />
            <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No sessions found</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Create your first session to get started</p>
            <motion.button className="btn-primary px-6 py-2.5 rounded-xl mt-4 text-sm flex items-center gap-2"
              onClick={openCreate} whileHover={{ scale: 1.02 }}>
              <Plus size={14} /> Create Session
            </motion.button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-glass">
              <thead>
                <tr>
                  <th className="text-left">Session</th>
                  <th className="text-left">Passcode</th>
                  <th className="text-left">Template</th>
                  <th className="text-left">Layout</th>
                  <th className="text-left">Photos</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Created</th>
                  <th className="text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((session, i) => (
                    <motion.tr
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <td>
                        <div>
                          <p className="font-semibold text-sm">{session.name}</p>
                          {session.drive_url && (
                            <a href={session.drive_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs flex items-center gap-1" style={{ color: 'var(--accent-blue)' }}>
                              <ExternalLink size={10} /> Drive
                            </a>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {showPasscode[session.id] ? session.passcode : '••••••'}
                          </span>
                          <button onClick={() => setShowPasscode(p => ({ ...p, [session.id]: !p[session.id] }))}
                            className="text-gray-500 hover:text-white transition-colors">
                            {showPasscode[session.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button onClick={() => copyPasscode(session.id, session.passcode)}
                            className="text-gray-500 hover:text-white transition-colors">
                            {copiedId === session.id ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>
                      <td><span className="badge badge-purple capitalize">{session.template || 'classic'}</span></td>
                      <td><span className="badge badge-blue capitalize">{session.layout || 'strip'}</span></td>
                      <td><span className="font-semibold" style={{ color: 'var(--accent-cyan)' }}>{session.photo_count || 0}</span></td>
                      <td>
                        <span className={`badge ${session.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>
                          {session.status || 'active'}
                        </span>
                      </td>
                      <td className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {session.created_at ? format(new Date(session.created_at), 'dd MMM yyyy') : 'N/A'}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <motion.button
                            onClick={() => onStartBooth?.(session)}
                            className="p-2 rounded-lg transition-all btn-primary"
                            style={{ padding: '6px 8px' }}
                            title="Start Booth"
                            whileHover={{ scale: 1.1 }}
                          >
                            <Camera size={13} />
                          </motion.button>
                          <motion.button
                            onClick={() => handleViewGallery(session.id)}
                            className="p-2 rounded-lg transition-all"
                            style={{ padding: '6px 8px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}
                            title="View Photos"
                            whileHover={{ scale: 1.1 }}
                          >
                            <Images size={13} />
                          </motion.button>
                          <motion.button
                            onClick={() => openEdit(session)}
                            className="p-2 rounded-lg btn-secondary"
                            title="Edit"
                            whileHover={{ scale: 1.1 }}
                          >
                            <Edit2 size={13} />
                          </motion.button>
                          <motion.button
                            onClick={() => setDeleteConfirm(session.id)}
                            className="p-2 rounded-lg btn-danger"
                            style={{ padding: '6px 8px' }}
                            title="Delete"
                            whileHover={{ scale: 1.1 }}
                          >
                            <Trash2 size={13} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editingSession ? 'Edit Session' : 'Create New Session'} size="md">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>
              Session Name *
            </label>
            <input
              className="input-glass w-full px-4 py-3 rounded-xl text-sm"
              placeholder="e.g. Wedding Photo 2024"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>
              Passcode *
            </label>
            <input
              className="input-glass w-full px-4 py-3 rounded-xl text-sm font-mono"
              placeholder="e.g. 1234"
              value={form.passcode}
              onChange={e => setForm(f => ({ ...f, passcode: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>
              Google Drive Folder URL
            </label>
            <input
              className="input-glass w-full px-4 py-3 rounded-xl text-sm"
              placeholder="https://drive.google.com/..."
              value={form.drive_url}
              onChange={e => setForm(f => ({ ...f, drive_url: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>
                Template
              </label>
              <select
                className="input-glass w-full px-4 py-3 rounded-xl text-sm"
                value={form.template}
                onChange={e => setForm(f => ({ ...f, template: e.target.value }))}
              >
                {TEMPLATES.map(t => <option key={t} value={t} className="bg-gray-900 capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>
                Layout
              </label>
              <select
                className="input-glass w-full px-4 py-3 rounded-xl text-sm"
                value={form.layout}
                onChange={e => setForm(f => ({ ...f, layout: e.target.value }))}
              >
                {LAYOUTS.map(l => <option key={l} value={l} className="bg-gray-900">{l === 'strip' ? 'Portrait Strip' : '4×6 Grid'}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>
              Watermark Text (optional)
            </label>
            <input
              className="input-glass w-full px-4 py-3 rounded-xl text-sm"
              placeholder="e.g. © My Event 2024"
              value={form.watermark}
              onChange={e => setForm(f => ({ ...f, watermark: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>
              Status
            </label>
            <div className="flex gap-2">
              {['active', 'inactive'].map(s => (
                <button
                  key={s}
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                    form.status === s ? 'btn-primary' : 'btn-secondary'
                  }`}
                >{s}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary px-4 py-3 rounded-xl text-sm">
              Cancel
            </button>
            <motion.button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 btn-primary px-4 py-3 rounded-xl text-sm flex items-center justify-center gap-2"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {saving ? 'Saving...' : editingSession ? 'Update Session' : 'Create Session'}
            </motion.button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Session" size="sm">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.1)' }}>
            <Trash2 size={28} style={{ color: '#ef4444' }} />
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to delete this session? This action cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 btn-secondary px-4 py-3 rounded-xl text-sm">
              Cancel
            </button>
            <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 btn-danger px-4 py-3 rounded-xl text-sm">
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
