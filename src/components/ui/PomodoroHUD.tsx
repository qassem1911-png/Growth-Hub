'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePomodoro } from '@/context/PomodoroContext'
import { cn } from '@/lib/utils'

export default function PomodoroHUD() {
  const { 
    timeRemaining, isActive, isPaused, isInitialized, sessionType, taskName, isMinimized,
    focusDuration, breakDuration,
    startTimer, pause, resume, stop, toggleMinimize, updateConfig 
  } = usePomodoro()

  const isRTL = typeof document !== 'undefined' && (document.dir === 'rtl' || document.documentElement.lang === 'ar');

  const [showSettings, setShowSettings] = React.useState(false)
  const [localFocus, setLocalFocus] = React.useState(focusDuration)
  const [localBreak, setLocalBreak] = React.useState(breakDuration)

  if (!isInitialized) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleSave = () => {
    updateConfig(localFocus, localBreak)
    setShowSettings(false)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: 50 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, x: 50 }}
        className={cn(
          "fixed bottom-6 right-6 z-[400] font-space border rounded-sm shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-300",
          isMinimized 
            ? "w-auto px-4 py-2 bg-black border-neon-green cursor-pointer hover:border-white group" 
            : "w-64 overflow-hidden",
          !isMinimized && (sessionType === 'FOCUS' ? "border-neon-green bg-[#050505]/95" : "border-cyan-400 bg-[#050505]/95")
        )}
        style={{ 
          boxShadow: sessionType === 'FOCUS' ? '0 0 20px rgba(57,255,20,0.1)' : '0 0 20px rgba(0,229,255,0.1)'
        }}
        onClick={() => isMinimized && toggleMinimize()}
      >
        {isMinimized ? (
          /* FLOATING PILL VIEW */
          <div className="flex items-center gap-3">
             <motion.span 
               animate={isActive && !isPaused ? { opacity: [0.4, 1, 0.4] } : {}}
               transition={{ duration: 2, repeat: Infinity }}
               className="text-[10px] font-black" 
               style={{ color: sessionType === 'FOCUS' ? '#39FF14' : '#00E5FF' }}
             >
               {sessionType === 'FOCUS' ? '⚡' : '☕'}
             </motion.span>
             <span className="text-sm font-black italic text-white group-hover:text-neon-green transition-colors">
               {formatTime(timeRemaining)}
             </span>
          </div>
        ) : (
          /* FULL HUD VIEW */
          <>
            {/* Header */}
            <div className={cn(
              "px-3 py-1.5 flex justify-between items-center border-b",
              sessionType === 'FOCUS' ? "border-neon-green/20" : "border-cyan-400/20"
            )}>
              <div className="flex items-center gap-2">
                <motion.div 
                  animate={isActive && !isPaused ? { opacity: [0.3, 1, 0.3] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: sessionType === 'FOCUS' ? '#39FF14' : '#00E5FF' }}
                />
                <span className="text-[12px] font-black tracking-[0.2em] uppercase italic" style={{ color: sessionType === 'FOCUS' ? '#39FF14' : '#00E5FF' }}>
                  {sessionType === 'FOCUS' ? (isRTL ? '⚡ وضع التركيز شغّال' : '⚡ FOCUS_MODE_ACTIVE') : (isRTL ? '☕ وقت الراحة' : '☕ RECOVERY_PERIOD')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isMinimized && (
                  <button 
                    onClick={() => setShowSettings(!showSettings)} 
                    className={cn("material-symbols-outlined text-xs transition-colors", showSettings ? "text-neon-green" : "text-white/40 hover:text-white")}
                  >
                    settings
                  </button>
                )}
                <button onClick={toggleMinimize} className="material-symbols-outlined text-xs text-white/40 hover:text-white">
                  unfold_less
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {showSettings ? (
                <div className="space-y-4 py-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-black text-white tracking-widest uppercase">{isRTL ? 'إعدادات التايمر' : 'TIMER_CONFIG'}</span>
                  </div>
                  <div className="space-y-3">
                     <div className="space-y-1">
                        <label className={cn("font-black uppercase tracking-widest", isRTL ? "text-[14px] text-white" : "text-[8px] text-white/30")}>{isRTL ? 'مدة التركيز (دقيقة)' : 'FOCUS_DURATION (MIN)'}</label>
                        <input 
                          type="number"
                          min="1"
                          max="120"
                          value={localFocus}
                          onChange={e => setLocalFocus(parseInt(e.target.value) || 1)}
                          className="w-full bg-white/5 border border-neon-green/30 p-2 text-xs font-space font-black text-neon-green outline-none focus:border-neon-green"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className={cn("font-black uppercase tracking-widest", isRTL ? "text-[14px] text-white" : "text-[8px] text-white/30")}>{isRTL ? 'مدة الراحة (دقيقة)' : 'BREAK_DURATION (MIN)'}</label>
                        <input 
                          type="number"
                          min="1"
                          max="120"
                          value={localBreak}
                          onChange={e => setLocalBreak(parseInt(e.target.value) || 1)}
                          className="w-full bg-white/5 border border-cyan-400/30 p-2 text-xs font-space font-black text-cyan-400 outline-none focus:border-cyan-400"
                        />
                     </div>
                  </div>
                  <button 
                    onClick={handleSave}
                    className="w-full py-2 bg-neon-green text-black font-space font-black text-[11px] uppercase tracking-widest"
                  >
                    {isRTL ? 'حفظ الإعدادات' : 'SAVE_CONFIG'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className={cn("font-black uppercase tracking-widest", isRTL ? "text-[14px] text-white" : "text-[8px] text-white/30")}>{isRTL ? 'المهمة الحالية:' : 'CURRENT_OBJECTIVE:'}</p>
                    <p className="text-[11px] font-bold text-white uppercase truncate">{taskName || (isRTL ? 'بدون عنوان' : 'UNTITLED_PROTOCOL')}</p>
                  </div>

                  <div className="flex flex-col items-center justify-center py-2">
                    <motion.p 
                      animate={isActive && !isPaused ? { opacity: [0.8, 1, 0.8], scale: [1, 1.02, 1] } : {}}
                      transition={{ duration: 1, repeat: Infinity }}
                      className={cn(
                        "text-4xl font-black italic tracking-tighter transition-colors",
                        sessionType === 'FOCUS' ? "text-neon-green" : "text-cyan-400",
                        !isActive && "text-white/20"
                      )}
                      style={{ filter: `drop-shadow(0 0 8px ${isActive && (sessionType === 'FOCUS' ? '#39FF1444' : '#00E5FF44')})` }}
                    >
                      {formatTime(timeRemaining)}
                    </motion.p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    {!isActive ? (
                      <button 
                        onClick={startTimer}
                        className="flex-1 py-2 bg-neon-green text-black font-space font-black text-[12px] uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(57,255,20,0.4)]"
                      >
                        {isRTL ? 'ابدأ الجلسة' : 'START_SESSION'}
                      </button>
                    ) : isPaused ? (
                      <button 
                        onClick={resume}
                        className="flex-1 py-1.5 bg-neon-green text-black font-space font-black text-[9px] uppercase tracking-widest hover:brightness-110"
                      >
                        RESUME
                      </button>
                    ) : (
                      <button 
                        onClick={pause}
                        className="flex-1 py-1.5 bg-white/10 text-white font-space font-black text-[9px] uppercase tracking-widest hover:bg-white/20"
                      >
                        PAUSE
                      </button>
                    )}
                    <button 
                      onClick={stop}
                      className="px-3 py-1.5 bg-[#FF0055]/10 text-[#FF0055] border border-[#FF0055]/30 font-space font-black text-[11px] uppercase tracking-widest hover:bg-[#FF0055]/20"
                    >
                      {isActive ? (isRTL ? 'وقف' : 'STOP') : (isRTL ? 'قفل' : 'CLOSE')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
