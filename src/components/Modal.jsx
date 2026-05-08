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
        <div className="modal-overlay" onClick={onClose}>
          <motion.div
            className={`glass w-full ${sizes[size]} max-h-[90vh] overflow-y-auto`}
            style={{ borderRadius: 20 }}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-glass)' }}>
                <h2 className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk' }}>{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-all btn-secondary"
                  style={{ borderRadius: 8 }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {/* Body */}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
