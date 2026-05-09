import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 md:p-10"
          style={{
            zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)'
          }}
          onClick={onClose}
        >
          <motion.div
            className={`glass w-full flex flex-col relative ${sizes[size]}`}
            style={{ borderRadius: 20, maxHeight: '90vh' }}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between p-5 md:p-6 border-b shrink-0" style={{ borderColor: 'var(--border-glass)' }}>
                <h2 className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk' }}>{title}</h2>
                <button onClick={onClose} className="p-2 rounded-lg transition-all btn-secondary">
                  <X size={16} />
                </button>
              </div>
            )}
            {/* Body */}
            <div className="p-5 md:p-6 overflow-y-auto flex-1 min-h-0">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

