'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, createContext, useContext } from 'react'

import { useGrowth } from '@/context/GrowthContext'

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
  const { currentTheme, isRTL } = useGrowth()

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
      <div className={`fixed bottom-8 z-[1000] flex flex-col gap-4 max-w-md w-full pointer-events-none ${isRTL ? 'right-8' : 'left-8'}`}>
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: isRTL ? 50 : -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20, scale: 0.9 }}
              className="pointer-events-auto"
            >
              <div 
                className={`glass-panel p-6 flex items-start gap-4 bg-white/95 dark:bg-[#131313]/90 backdrop-blur-3xl relative overflow-hidden group ${isRTL ? 'border-r-4' : 'border-l-4'}`}
                style={{ 
                  borderColor: currentTheme.color,
                  boxShadow: `0 0 40px ${currentTheme.color}33`
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ backgroundColor: `${currentTheme.color}10` }} />
                <span className="material-symbols-outlined text-3xl shrink-0" style={{ color: currentTheme.color }}>cognition</span>
                <div className="space-y-1 relative z-10 flex-1">
                  <p className="text-[10px] font-space tracking-[0.4em] uppercase font-black opacity-40" style={{ color: currentTheme.color }}>
                    {isRTL ? 'إشعار النظام' : 'AI_FEEDBACK'}
                  </p>
                  <p className="text-lg font-space font-black italic text-zinc-900 dark:text-white leading-tight">
                    {toast.message}
                  </p>
                </div>
                <button 
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="opacity-20 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-sm text-zinc-900 dark:text-white">close</span>
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
