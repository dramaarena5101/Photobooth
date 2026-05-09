import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Database, Bell, Shield, Globe, Save, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/useAppStore'

const SUPABASE_SQL = `-- Run this SQL in your Supabase SQL Editor
-- 1. Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  passcode TEXT NOT NULL,
  drive_url TEXT,
  template TEXT DEFAULT 'classic',
  layout TEXT DEFAULT 'strip',
  watermark TEXT DEFAULT '',
  overlay_url TEXT DEFAULT '',
  photo_slots JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  photo_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  username TEXT,
  url TEXT,
  raw_urls TEXT[],
  type TEXT DEFAULT 'print',
  filename TEXT,
  drive_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Increment function
CREATE OR REPLACE FUNCTION increment_photo_count(session_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE sessions SET photo_count = photo_count + 1 WHERE id = session_id;
END;
$$;

-- 4. Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- 5. Policies (allow all for now - secure later with auth)
CREATE POLICY "Allow all" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all" ON photos FOR ALL USING (true);

-- 6. Storage bucket (run in Supabase Storage settings)
-- Create a public bucket named: photobooth`

export default function SettingsPage() {
  const { inactivityTimeout, setInactivityTimeout } = useAppStore()
  const [supabaseUrl, setSupabaseUrl] = useState(import.meta.env.VITE_SUPABASE_URL || '')
  const [supabaseKey, setSupabaseKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || '')
  const [adminPass, setAdminPass] = useState(localStorage.getItem('admin_pass') || 'admin123')
  const [timeoutVal, setTimeoutVal] = useState(inactivityTimeout)
  const [showSql, setShowSql] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    localStorage.setItem('admin_pass', adminPass)
    setInactivityTimeout(timeoutVal)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    toast.success('Settings saved! Update .env file for Supabase credentials.')
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
          <span className="gradient-text">Settings</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Configure your photobooth application</p>
      </div>

      {/* Admin Password */}
      <div className="glass p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
            <Shield size={16} style={{ color: '#a855f7' }} />
          </div>
          <h2 className="font-bold" style={{ fontFamily: 'Space Grotesk' }}>Admin Access</h2>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>
            Admin Password
          </label>
          <input type="password" className="input-glass w-full px-4 py-3 rounded-xl text-sm"
            placeholder="Admin password" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            This password is stored locally. For production, use Supabase Auth.
          </p>
        </div>
        <div className="pt-2">
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>
            Auto Logout Timeout (Minutes)
          </label>
          <input type="number" className="input-glass w-full px-4 py-3 rounded-xl text-sm"
            placeholder="e.g. 45" value={timeoutVal} onChange={e => setTimeoutVal(parseInt(e.target.value) || 0)} min="1" max="1440" />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Automatically logout admin after this many minutes of inactivity.
          </p>
        </div>
      </div>

      {/* Supabase Config */}
      <div className="glass p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <Database size={16} style={{ color: '#3b82f6' }} />
          </div>
          <h2 className="font-bold" style={{ fontFamily: 'Space Grotesk' }}>Supabase Configuration</h2>
        </div>
        <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <Globe size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#3b82f6' }} />
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Set these in your <code className="font-mono px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>.env</code> file.
            Create a Supabase project at{' '}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer"
              className="underline" style={{ color: '#3b82f6' }}>supabase.com</a>
          </p>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>
            VITE_SUPABASE_URL
          </label>
          <input className="input-glass w-full px-4 py-3 rounded-xl text-sm font-mono"
            placeholder="https://xxx.supabase.co" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>
            VITE_SUPABASE_ANON_KEY
          </label>
          <input type="password" className="input-glass w-full px-4 py-3 rounded-xl text-sm font-mono"
            placeholder="eyJhbGci..." value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} />
        </div>
      </div>

      {/* Database Setup */}
      <div className="glass p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.1)' }}>
              <Database size={16} style={{ color: '#06b6d4' }} />
            </div>
            <h2 className="font-bold" style={{ fontFamily: 'Space Grotesk' }}>Database Setup SQL</h2>
          </div>
          <button onClick={() => setShowSql(!showSql)} className="btn-secondary px-3 py-1.5 rounded-lg text-xs">
            {showSql ? 'Hide' : 'Show'} SQL
          </button>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Run this SQL in your Supabase SQL Editor to create the required tables.
        </p>
        {showSql && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="relative">
              <pre className="p-4 rounded-xl text-xs overflow-x-auto"
                style={{ background: 'rgba(0,0,0,0.4)', color: '#a5f3fc', fontFamily: 'monospace', lineHeight: 1.6 }}>
                {SUPABASE_SQL}
              </pre>
              <button
                onClick={() => { navigator.clipboard.writeText(SUPABASE_SQL); toast.success('SQL copied!') }}
                className="absolute top-3 right-3 btn-secondary px-2 py-1 rounded-lg text-xs">
                Copy
              </button>
            </div>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1 text-xs" style={{ color: '#06b6d4' }}>
              <ExternalLink size={11} /> Open Supabase Dashboard
            </a>
          </motion.div>
        )}
      </div>

      {/* Vercel Deploy */}
      <div className="glass p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.1)' }}>
            <Globe size={16} style={{ color: '#ec4899' }} />
          </div>
          <h2 className="font-bold" style={{ fontFamily: 'Space Grotesk' }}>Deploy to Vercel</h2>
        </div>
        <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <p>1. Push your code to GitHub</p>
          <p>2. Connect repo at <a href="https://vercel.com" target="_blank" className="underline" style={{ color: '#ec4899' }}>vercel.com</a></p>
          <p>3. Add environment variables:</p>
          <code className="block p-3 rounded-xl text-xs"
            style={{ background: 'rgba(0,0,0,0.3)', fontFamily: 'monospace', color: '#a5f3fc' }}>
            {`VITE_SUPABASE_URL=https://xxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGci...`}
          </code>
          <p>4. Deploy! 🚀</p>
        </div>
      </div>

      <motion.button onClick={handleSave} disabled={saving}
        className="btn-primary px-8 py-3 rounded-xl font-semibold flex items-center gap-2"
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
        {saving ? 'Saving...' : 'Save Settings'}
      </motion.button>
    </div>
  )
}
