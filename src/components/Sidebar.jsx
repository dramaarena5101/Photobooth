import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import {
  LayoutDashboard, Camera, Images, Settings, LogOut,
  Menu, X, ChevronRight, Zap, FolderOpen, Users, Bell
} from 'lucide-react'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'sessions', label: 'Sessions', icon: FolderOpen },
  { id: 'booth', label: 'Camera Booth', icon: Camera },
  { id: 'gallery', label: 'Gallery', icon: Images },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ onNavigate, active }) {
  const { sidebarOpen, toggleSidebar, isAdmin, adminUser, logout } = useAppStore()

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`sidebar ${sidebarOpen ? 'open w-[240px]' : 'w-[240px] md:w-[72px]'}`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--border-glass)' }}>
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center btn-primary">
                <Camera size={18} />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2"
                style={{ borderColor: 'var(--bg-secondary)' }}></div>
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="font-bold text-sm" style={{ fontFamily: 'Space Grotesk' }}>
                    <span className="gradient-text">Photo</span>Booth
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pro Studio</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = active === item.id
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`nav-item w-full ${isActive ? 'active' : ''}`}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  title={!sidebarOpen ? item.label : ''}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 text-left"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isActive && sidebarOpen && (
                    <ChevronRight size={14} style={{ color: 'var(--accent-purple)' }} />
                  )}
                </motion.button>
              )
            })}
          </nav>

          {/* User info */}
          <div className="p-3 border-t" style={{ borderColor: 'var(--border-glass)' }}>
            {isAdmin && (
              <div className={`flex items-center gap-3 p-2 rounded-xl mb-2 ${sidebarOpen ? '' : 'justify-center'}`}
                style={{ background: 'rgba(168,85,247,0.08)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 btn-primary text-xs font-bold">
                  {adminUser?.name?.[0]?.toUpperCase() || 'A'}
                </div>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-xs font-semibold truncate">{adminUser?.name || 'Admin'}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Administrator</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <motion.button
              onClick={logout}
              className="nav-item w-full"
              style={{ color: '#ef4444' }}
              whileHover={{ x: 2 }}
              title={!sidebarOpen ? 'Logout' : ''}
            >
              <LogOut size={16} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    Logout
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.aside>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-4 md:top-5 z-50 p-2 rounded-xl btn-secondary transition-all duration-300 ${sidebarOpen ? 'left-[252px]' : 'left-[16px] md:left-[84px]'}`}
      >
        {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
      </button>
    </>
  )
}
