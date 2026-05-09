import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { useAppStore } from './store/useAppStore'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Sessions from './pages/Sessions'
import Booth from './pages/Booth'
import Gallery from './pages/Gallery'
import Settings from './pages/Settings'
import Sidebar from './components/Sidebar'
import PublicShare from './pages/PublicShare'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export default function App() {
  const { isAdmin, sidebarOpen, activeRoute, setActiveRoute, logout, inactivityTimeout } = useAppStore()
  const [boothSession, setBoothSession] = useState(null)

  // Check for public share URL: ?share=sessionId&user=username
  const urlParams = new URLSearchParams(window.location.search)
  const shareSessionId = urlParams.get('share')
  const shareUser = urlParams.get('user')
  if (shareSessionId && shareUser) {
    return <PublicShare sessionId={shareSessionId} username={shareUser} />
  }

  // Auto-logout due to inactivity
  useEffect(() => {
    if (!isAdmin) return
    let timeoutId

    const resetTimer = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        logout()
        toast('Logged out due to inactivity', { icon: '💤' })
      }, inactivityTimeout * 60 * 1000)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(e => document.addEventListener(e, resetTimer))
    resetTimer()

    return () => {
      clearTimeout(timeoutId)
      events.forEach(e => document.removeEventListener(e, resetTimer))
    }
  }, [isAdmin, inactivityTimeout, logout])

  // Sidebar width classes
  const sidebarClasses = sidebarOpen ? 'md:ml-[240px]' : 'md:ml-[72px]'

  const handleNavigate = (route) => {
    setActiveRoute(route)
    if (route !== 'booth') setBoothSession(null)
  }

  const handleStartBooth = (session) => {
    setBoothSession(session)
    setActiveRoute('booth')
  }

  if (!isAdmin) return (
    <>
      <Login />
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1a1f2e', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 },
        duration: 3000,
      }} />
    </>
  )

  const renderPage = () => {
    switch (activeRoute) {
      case 'dashboard': return <Dashboard />
      case 'sessions': return <Sessions onStartBooth={handleStartBooth} />
      case 'booth':
        if (boothSession) return (
          <Booth session={boothSession} onBack={() => { setBoothSession(null); setActiveRoute('sessions') }} />
        )
        return <Sessions onStartBooth={handleStartBooth} />
      case 'gallery': return <Gallery />
      case 'settings': return <Settings />
      default: return <Dashboard />
    }
  }

  // Booth is fullscreen - no sidebar
  const isBooth = activeRoute === 'booth' && boothSession

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {!isBooth && <Sidebar onNavigate={handleNavigate} active={activeRoute} />}

      <main
        className={`min-h-screen transition-all duration-300 ${isBooth ? 'p-0 ml-0' : `p-4 md:p-6 lg:p-8 pt-16 md:pt-6 lg:pt-8 ${sidebarClasses}`}`}
      >

        {/* Top header bar */}
        {!isBooth && (
          <div className="flex items-center justify-between mb-6 md:pl-0 pl-10">
            <div /> {/* Spacer for sidebar toggle button */}
            <div className="flex items-center gap-3 ml-auto">
              <div className="badge badge-green">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
                Live
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeRoute + (boothSession?.id || '')}
            variants={isBooth ? {} : pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25 }}
            style={{ paddingLeft: isBooth ? 0 : 0 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1f2e',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            fontSize: 14,
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          duration: 3500,
        }}
      />
    </div>
  )
}
