'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [bootLines, setBootLines] = useState<string[]>([])
  const supabase = createClient()
  const router = useRouter()

  const BOOT_SEQUENCE = [
    'GROWTH_HUB_OS v4.0 // CORE ENGINE ONLINE',
    'SCANNING OPERATOR PATHWAYS...',
    'ENCRYPTION ACTIVE: AES-256 // CHANNEL SECURED',
    'IDENTITY MATRIX: NOT FOUND',
    'INITIATING OPERATOR UPLINK PROTOCOL...',
  ]

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i < BOOT_SEQUENCE.length) {
        setBootLines(prev => [...prev, BOOT_SEQUENCE[i]])
        i++
      } else {
        clearInterval(interval)
      }
    }, 350)
    return () => clearInterval(interval)
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding` },
    })
    if (error) {
      alert(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 cyber-grid opacity-[0.04]" />

      {/* Central glow — subtle neon pulse */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#39FF14]/[0.04] blur-[100px] rounded-full pointer-events-none animate-pulse" />

      {/* Scanlines */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] scanlines z-20" />

      {/* Login Panel */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10 space-y-14"
      >
        {/* Logo */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h1 className="text-7xl font-black font-space tracking-tighter italic uppercase text-white leading-none"
              style={{ textShadow: '0 0 40px rgba(57,255,20,0.15)' }}>
              GROWTH<span className="text-[#39FF14]" style={{ textShadow: '0 0 30px #39FF14, 0 0 60px rgba(57,255,20,0.4)' }}>_HUB</span>
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{ delay: 0.5 }}
            className="text-[10px] font-space text-[#39FF14] tracking-[1em] uppercase font-bold"
          >
            GROWTH_HUB_OS
          </motion.p>
        </div>

        {/* Terminal boot log */}
        <div className="border border-white/5 bg-white/[0.02] p-6 space-y-2 font-space text-[11px] tracking-wider min-h-[120px]">
          <AnimatePresence>
            {bootLines.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={i === bootLines.length - 1 ? 'text-[#39FF14]' : 'text-white/30'}
              >
                <span className="text-[#39FF14]/40 mr-2">&gt;</span>{line}
              </motion.p>
            ))}
          </AnimatePresence>
          {bootLines.length === BOOT_SEQUENCE.length && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="inline-block w-2 h-4 bg-[#39FF14] ml-1"
            />
          )}
        </div>

        {/* Sync Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="space-y-4"
        >
          <button
            disabled={loading}
            onClick={handleLogin}
            className="group w-full relative overflow-hidden flex items-center justify-center gap-4 p-5 border border-[#39FF14] bg-transparent text-[#39FF14] font-space text-[12px] tracking-[0.3em] uppercase font-black transition-all hover:bg-[#39FF14]/10 shadow-[0_0_30px_rgba(57,255,20,0.15)] hover:shadow-[0_0_50px_rgba(57,255,20,0.3)] disabled:opacity-40"
          >
            <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4" style={{ filter: 'brightness(0) saturate(100%) invert(82%) sepia(50%) saturate(600%) hue-rotate(72deg) brightness(130%)' }} />
            <span>{loading ? 'SYNCING...' : 'Sync via Google'}</span>
            {/* Sweep animation */}
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-[#39FF14]/10 to-transparent transition-transform duration-700" />
          </button>

          <p className="text-center text-[9px] font-space text-white/15 tracking-[0.3em] uppercase">
            ENCRYPTED CHANNEL // NO DATA STORED
          </p>
        </motion.div>

        {/* Status footer */}
        <div className="flex items-center justify-center gap-3 opacity-20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse" />
          <span className="text-[8px] font-space text-[#39FF14] tracking-[0.5em] uppercase font-bold">SECURE_CHANNEL_ACTIVE</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-pulse" />
        </div>
      </motion.div>
    </div>
  )
}
