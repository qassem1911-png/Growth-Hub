'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, createContext, useContext } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'warning' | 'info'
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'warning' | 'info') => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-8 left-8 z-[1000] flex flex-col gap-4 max-w-md w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              className="pointer-events-auto"
            >
              <div className="glass-panel border-neon-green/20 p-6 flex items-start gap-4 bg-[#131313]/90 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-l-4 border-l-neon-green relative overflow-hidden group">
                <div className="absolute inset-0 bg-neon-green/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="material-symbols-outlined text-[#39FF14] text-3xl shrink-0">cognition</span>
                <div className="space-y-1 relative z-10">
                  <p className="text-[10px] font-space text-[#39FF14] tracking-[0.4em] uppercase font-black opacity-40">AI_FEEDBACK</p>
                  <p className="text-lg font-space font-black italic text-white leading-tight">
                    {toast.message}
                  </p>
                </div>
                <button 
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="ml-auto opacity-20 hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}
