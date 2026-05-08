import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { Camera, Lock, Eye, EyeOff, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { setAdmin } = useAppStore()
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const handleLogin = async (e) => {
    e?.preventDefault()
    if (!password) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    const storedPass = localStorage.getItem('admin_pass') || 'admin123'
    if (password === storedPass) {
      setAdmin({ name: 'Admin', role: 'admin' })
      toast.success('Welcome back, Admin!')
    } else {
      setShake(true)
      toast.error('Invalid password')
      setTimeout(() => setShake(false), 500)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{ background: 'var(--bg-primary)' }}>
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #ec4899, transparent)' }} />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'linear-gradient(rgba(168,85,247,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <motion.div className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

        {/* Logo area */}
        <div className="text-center mb-12">
          <motion.div
            className="w-20 h-20 rounded-[2rem] mx-auto mb-10 flex items-center justify-center animate-float relative"
            style={{ 
              background: 'linear-gradient(135deg, #a855f7, #ec4899)', 
              boxShadow: '0 0 50px rgba(168,85,247,0.3)',
              border: '2px solid rgba(255,255,255,0.1)'
            }}
            whileHover={{ rotate: 8, scale: 1.1 }}>
            <Camera size={36} color="white" />
            <div className="absolute inset-0 rounded-[2rem] animate-pulse" style={{ boxShadow: '0 0 30px rgba(168,85,247,0.5)' }}></div>
          </motion.div>
          <h1 className="text-6xl font-black mb-4 tracking-tighter flex items-center justify-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
            <span className="gradient-text">Photo</span>
            <span style={{ color: 'var(--text-primary)' }}>Booth</span>
          </h1>
          <p className="text-xs tracking-[0.2em] uppercase font-bold opacity-40" style={{ color: 'var(--text-secondary)' }}>
            Professional Event Studio Platform
          </p>
        </div>

        {/* Login card */}
        <motion.form
          className="glass p-8 space-y-5"
          animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
          onSubmit={handleLogin}>

          <div className="text-center mb-6">
            <span className="badge badge-purple px-5 py-2 text-[9px] tracking-widest font-black border-white/10">
              <Lock size={12} className="mr-1.5 opacity-70" />
              ADMINISTRATOR LOGIN
            </span>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] ml-1 opacity-50" style={{ color: 'var(--text-primary)' }}>
              Access Key
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type={showPass ? 'text' : 'password'}
                className="input-glass w-full pl-10 pr-12 py-4 rounded-xl text-sm"
                placeholder="Enter admin password..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 transition-all hover:text-white opacity-40 hover:opacity-100"
                style={{ color: 'var(--text-muted)' }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-4 ml-1">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-30" style={{ color: 'var(--text-primary)' }}>
                Master Key:
              </span>
              <code className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10" style={{ color: 'var(--accent-purple)' }}>
                admin123
              </code>
            </div>
          </div>

          <motion.button type="submit" disabled={loading || !password}
            className="btn-primary w-full py-4.5 mt-4 rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden"
            whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Zap size={18} /> INITIALIZE DASHBOARD</>}
          </motion.button>
        </motion.form>

        {/* Features preview */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { label: 'Live Camera', icon: '📸' },
            { label: 'Auto Upload', icon: '☁️' },
            { label: 'QR Share', icon: '📱' },
          ].map((f, i) => (
            <motion.div key={i} className="glass p-4 text-center border-white/5"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}>
              <div className="text-2xl mb-2 drop-shadow-md">{f.icon}</div>
              <p className="text-[10px] font-bold uppercase tracking-tighter opacity-50" style={{ color: 'var(--text-primary)' }}>{f.label}</p>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          PhotoBooth Pro © {new Date().getFullYear()} — Built for Events
        </p>
      </motion.div>
    </div>
  )
}
