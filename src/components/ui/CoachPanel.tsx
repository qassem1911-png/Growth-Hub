'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { chatWithCoach } from '@/app/actions/ai-magic'
import { useGrowth } from '@/context/GrowthContext'
import { useSound } from '@/context/SoundContext'

interface CoachPanelProps {
  isOpen: boolean
  onClose: () => void
  missions: any[]
}

export default function CoachPanel({ isOpen, onClose, missions }: CoachPanelProps) {
  const { profile, setLastAiMessage } = useGrowth()
  const { playNeuralLink, playBlip } = useSound()
  const [response, setResponse] = useState('AWAITING_ORDERS // SELECT_ACTION_BELOW')
  const [isLoading, setIsLoading] = useState(false)

  const activeMissions = missions.filter(m => !m.is_archived && m.sync_to_dashboard)
  
  const handleAction = async (actionType: string) => {
    if (isLoading) return
    setIsLoading(true)
    playNeuralLink()

    let prompt = ''
    switch (actionType) {
      case 'scan_status':
        prompt = 'Give me a full tactical status report of all my missions and overall performance'
        break
      case 'daily_plan':
        prompt = 'Based on my missions and deadlines, what exactly should I focus on today? Give me a priority order.'
        break
      case 'critical_alert':
        prompt = 'Which of my missions are in danger? What do I need to do immediately?'
        break
      case 'brief_mission':
        prompt = 'Brief me on my most critical mission. Give me a tactical breakdown of what I need to do next.'
        break
    }

    const userData = {
      username: profile?.full_name || 'OPERATOR',
      rank: profile?.rank || 'RECRUIT',
      xp: profile?.xp || 0,
      capacity_used: activeMissions.length,
      missions: activeMissions.map(m => ({
        title: m.title,
        progress: m.progress || 0,
        end_date: m.end_date || 'NO_DEADLINE',
        tasks_completed: m.tasks?.filter((t: any) => t.is_completed).length || 0,
        tasks_total: m.tasks?.length || 0,
        next_task: m.tasks?.find((t: any) => !t.is_completed)?.title || 'DONE'
      })),
      critical_missions: activeMissions.filter(m => {
        if (!m.end_date) return false
        const days = Math.ceil((new Date(m.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        return days > 0 && days <= 3
      }).map(m => ({
        title: m.title,
        progress: m.progress || 0,
        end_date: m.end_date || 'NO_DEADLINE',
        tasks_completed: m.tasks?.filter((t: any) => t.is_completed).length || 0,
        tasks_total: m.tasks?.length || 0,
        next_task: m.tasks?.find((t: any) => !t.is_completed)?.title || 'DONE'
      }))
    }

    const res = await chatWithCoach(prompt, userData)
    setResponse(res)
    setLastAiMessage(res)
    setIsLoading(false)
    playBlip()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-full max-w-[380px] bg-[#0a0a0a] border-l border-neon-green/30 z-[300] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col font-space"
          >
            {/* Header */}
            <div className="p-6 border-b border-neon-green/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-neon-green animate-pulse">bolt</span>
                <span className="text-sm font-black tracking-[0.3em] text-neon-green uppercase">
                  COACH_SAVAGE // ONLINE
                </span>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Response Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-neon-green/10 rounded opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                <div className="relative p-4 bg-black/40 border border-neon-green/10 min-h-[150px]">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-3 py-10">
                       <span className="text-neon-green text-[10px] font-black tracking-widest animate-pulse">
                         {profile?.language === 'ar' ? 'المدرب بيفكر...' : 'SAVAGE_PROCESSING...'}
                       </span>
                       <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <motion.div
                              key={i}
                              animate={{ opacity: [0.2, 1, 0.2] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                              className="w-1 h-1 bg-neon-green rounded-full"
                            />
                          ))}
                       </div>
                    </div>
                  ) : (
                    <p className="text-neon-green text-[15px] font-bold leading-relaxed whitespace-pre-wrap">
                      {response}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-4">
                <span className="text-[10px] font-black text-white/30 tracking-[0.4em] uppercase">SELECT_ACTION:</span>
                
                <div className="grid grid-cols-1 gap-3">
                  <ActionButton 
                    icon="analytics" 
                    title="SCAN_STATUS" 
                    subtitle={profile?.language === 'ar' ? 'اتحلل وضعي' : 'تحليل وضعك الحالي كامل'} 
                    onClick={() => handleAction('scan_status')}
                    disabled={isLoading}
                  />
                  <ActionButton 
                    icon="event_note" 
                    title="DAILY_PLAN" 
                    subtitle={profile?.language === 'ar' ? 'خطة النهارده' : 'إيه اللي المفروض تخلصه النهارده'} 
                    onClick={() => handleAction('daily_plan')}
                    disabled={isLoading}
                  />
                  <ActionButton 
                    icon="warning" 
                    title="CRITICAL_ALERT" 
                    subtitle={profile?.language === 'ar' ? 'تنبيهات خطيرة' : 'المهام اللي في خطر دلوقتي'} 
                    onClick={() => handleAction('critical_alert')}
                    disabled={isLoading}
                  />
                  <ActionButton 
                    icon="target" 
                    title="BRIEF_MISSION" 
                    subtitle={profile?.language === 'ar' ? 'بريف عن المهام' : 'تبريك عن أهم Mission'} 
                    onClick={() => handleAction('brief_mission')}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Footer Decorative */}
            <div className="p-4 border-t border-neon-green/10">
               <div className="flex justify-between items-center opacity-20">
                  <span className="text-[8px] font-black text-neon-green tracking-widest">PROTOCOL_V7.4</span>
                  <div className="flex gap-1">
                     <div className="w-8 h-1 bg-neon-green"></div>
                     <div className="w-2 h-1 bg-neon-green"></div>
                  </div>
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ActionButton({ icon, title, subtitle, onClick, disabled }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full p-4 bg-white/[0.03] border border-white/5 hover:border-neon-green/40 hover:bg-neon-green/5 transition-all duration-300 group flex items-start gap-4 text-start relative overflow-hidden",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-neon-green/5 blur-2xl group-hover:bg-neon-green/10 transition-colors"></div>
      <span className="material-symbols-outlined text-white/30 group-hover:text-neon-green transition-colors mt-1">
        {icon}
      </span>
      <div className="flex flex-col flex-1">
        <span className="text-[11px] font-black tracking-widest text-white group-hover:text-neon-green transition-colors">
          {title}
        </span>
        <span className="text-[10px] font-bold text-white/40 mt-1" dir="rtl">
          {subtitle}
        </span>
      </div>
      <span className="material-symbols-outlined text-xs text-white/10 group-hover:text-neon-green/40 mt-1">
        arrow_forward_ios
      </span>
    </button>
  )
}
