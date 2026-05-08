'use client'

import Sidebar from './Sidebar'
import { useGrowth } from '@/context/GrowthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'

interface ShellProps {
  children: React.ReactNode
  syncedMissions?: any[]
  onMissionsRefresh?: () => void
}

export default function Shell({ children, syncedMissions = [], onMissionsRefresh }: ShellProps) {
  // 1. ALL HOOKS AT THE TOP (No logic before this)
  const { isRTL, profile, calculateAccountability, getAiMessage } = useGrowth()
  const pathname = usePathname()
  const router = useRouter()
  const [aiOpen, setAiOpen] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    async function calculateStreak() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('task_completion_log')
        .select('completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })

      if (!data || data.length === 0) return

      const days = [...new Set(data.map(r =>
        new Date(r.completed_at).toISOString().split('T')[0]
      ))].sort((a, b) => b.localeCompare(a))

      let count = 0
      const today = new Date().toISOString().split('T')[0]
      let cursor = new Date(today)

      for (const day of days) {
        const cursorStr = cursor.toISOString().split('T')[0]
        if (day === cursorStr) {
          count++
          cursor.setDate(cursor.getDate() - 1)
        } else {
          break
        }
      }
      setStreak(count)
    }
    calculateStreak()
  }, [])

  // Close AI bubble after 8 seconds automatically
  useEffect(() => {
    if (!aiOpen) return
    const timer = setTimeout(() => setAiOpen(false), 8000)
    return () => clearTimeout(timer)
  }, [aiOpen])

  // Red Zone Interruption Logic
  const hasRedZoneMission = useMemo(() => {
    return (syncedMissions || []).some(m => calculateAccountability(m).isInRedZone)
  }, [syncedMissions, calculateAccountability])

  useEffect(() => {
    if (hasRedZoneMission && !aiOpen) {
      setAiOpen(true)
    }
  }, [hasRedZoneMission])

  // Dynamic system progress from the active HUD missions only
  const systemProgress = useMemo(() => {
    if (!syncedMissions || syncedMissions.length === 0) return 0
    let totalPct = 0
    syncedMissions.forEach(m => {
      totalPct += calculateAccountability(m).progress
    })
    return Math.round(totalPct / syncedMissions.length)
  }, [syncedMissions, calculateAccountability])

  // AI message — personality + streak aware + dynamic task logic
  const aiMessage = useMemo(() => {
    const redMission = (syncedMissions || []).find(m => calculateAccountability(m).isInRedZone)
    if (redMission) return getAiMessage('RED', redMission.title)

    const aheadMission = (syncedMissions || []).find(m => calculateAccountability(m).isAheadOfSchedule)
    if (aheadMission) return getAiMessage('AHEAD', aheadMission.title)

    return getAiMessage('DEFAULT')
  }, [syncedMissions, calculateAccountability, getAiMessage])

  return (
    <div
      className={cn(
        'min-h-screen bg-[#050505] text-foreground flex relative selection:bg-neon-green/30 selection:text-neon-green'
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none z-[100] scanlines opacity-[0.02]" />
      <div className="fixed inset-0 pointer-events-none z-0 cyber-grid opacity-[0.05]" />

      <Sidebar isRTL={isRTL} />

      <main className={cn(
        'flex-grow min-h-screen transition-all duration-500 relative z-10',
        isRTL ? 'md:pe-72' : 'md:ps-72'
      )}>
        {/* Top Navigation */}
        <header className="w-full px-6 md:px-12 h-16 flex justify-between items-center border-b border-white/5 bg-[#050505]/95 backdrop-blur-2xl z-[50] relative header-target">
          <div className="absolute -bottom-[1px] inset-inline-start-12 w-48 h-[1px] bg-neon-green shadow-[0_0_15px_#39FF14]" />

          {/* Left: Status */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              <span className="text-[9px] font-space text-foreground/40 tracking-[0.4em] uppercase font-bold">CORE_UPLINK_ACTIVE</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-secondary/5 border border-secondary/20 rounded-full">
              <span className="material-symbols-outlined text-[12px] text-secondary animate-spin-slow">cognition</span>
              <span className="text-[8px] font-space text-secondary tracking-widest uppercase font-black">
                {profile?.ai_name || 'CORE'}: {profile?.ai_personality === 'SAVAGE' ? '🔥 SAVAGE' : '💚 ONLINE'}
              </span>
            </div>
          </div>

          {/* Right: Dynamic Telemetry */}
          <div className="flex items-center gap-10">
            {/* Help Bulb */}
            <div className="relative">
              <button 
                onClick={() => setShowHelp(!showHelp)}
                className={cn(
                  "p-2 transition-all flex items-center justify-center rounded-full",
                  showHelp ? "text-neon-green bg-neon-green/10" : "text-white/20 hover:text-white/40 hover:bg-white/5"
                )}
              >
                <span className="material-symbols-outlined text-xl">lightbulb</span>
              </button>
              
              <AnimatePresence>
                {showHelp && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-12 right-0 w-64 glass-panel p-4 z-[100] border-neon-green/30 bg-[#050505]/95 backdrop-blur-xl"
                  >
                    <p className="text-[10px] font-space text-neon-green/80 tracking-widest uppercase font-bold leading-relaxed">
                      NEURAL_LOGIC: Red borders mean you're behind schedule based on mission duration. Green means you're a legend.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <div className="flex justify-between w-44 text-[9px] font-space text-foreground/40 tracking-widest uppercase font-black">
                <span>HUD_PROGRESS</span>
                <span className="text-neon-green">{systemProgress}%</span>
              </div>
              <div className="w-44 h-[2px] bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${systemProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-neon-green shadow-[0_0_8px_#39FF14]"
                />
              </div>
            </div>

            <div className="h-6 w-[1px] bg-white/5" />

            {/* Streak */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-space text-foreground/30 uppercase tracking-[0.3em] font-black leading-none mb-1">STREAK</span>
              <div className="flex items-center gap-2">
                <span className={cn("material-symbols-outlined text-base", streak > 0 ? "text-secondary" : "text-white/20")}>local_fire_department</span>
                <span className={cn("text-[11px] font-space tracking-tighter font-black uppercase", streak > 0 ? "text-secondary" : "text-white/20")}>
                  {streak} {streak === 1 ? 'DAY' : 'DAYS'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="relative">
          {children}
        </div>
      </main>

      {/* Side separator */}
      <div className={cn(
        "fixed top-0 bottom-0 w-[1px] bg-white/5 z-20 hidden md:block",
        isRTL ? "right-72" : "left-72"
      )} />

      {/* AI COACH — Floating Icon */}
      <div className="fixed bottom-8 inset-inline-end-8 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {aiOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={cn(
                "w-full max-w-[300px] glass-panel p-5 backdrop-blur-md shadow-[0_0_40px_rgba(57,255,20,0.12)] space-y-3",
                profile?.ai_personality === 'SAVAGE'
                  ? "border-[#FF3131]/30 bg-[#FF3131]/5"
                  : "border-neon-green/30 bg-[#050505]/90"
              )}
            >
              <div className="flex justify-between items-center">
                <span className={cn(
                  "text-[9px] font-space tracking-[0.3em] font-black uppercase",
                  profile?.ai_personality === 'SAVAGE' ? "text-[#FF3131]" : "text-neon-green"
                )}>
                  {profile?.ai_name || 'CORE'} // {profile?.ai_personality === 'SAVAGE' ? 'SAVAGE_MODE' : 'ONLINE'}
                </span>
                <button onClick={() => setAiOpen(false)} className="text-white/20 hover:text-white transition-all">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
              <p className="text-[12px] font-space font-bold text-white/80 leading-relaxed" dir="auto">
                "{aiMessage}"
              </p>
              <p className="text-[8px] font-space text-white/20 tracking-widest uppercase">AUTO_CLOSE // 8S</p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setAiOpen(o => !o)}
          className={cn(
            'w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-lg',
            aiOpen
              ? profile?.ai_personality === 'SAVAGE'
                ? 'bg-[#FF3131] border-[#FF3131] text-white shadow-[0_0_20px_rgba(255,49,49,0.4)]'
                : 'bg-neon-green border-neon-green text-black shadow-[0_0_20px_rgba(57,255,20,0.4)]'
              : 'bg-[#050505] border-white/10 text-white/40 hover:border-neon-green/50 hover:text-neon-green'
          )}
        >
          <span className="material-symbols-outlined text-xl">
            {profile?.ai_personality === 'SAVAGE' ? 'whatshot' : 'cognition'}
          </span>
        </button>
      </div>
    </div>
  )
}
