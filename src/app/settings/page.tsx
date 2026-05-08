'use client'

import { useState, useEffect } from 'react'
import Shell from '@/components/layout/Shell'
import { useGrowth, type Language } from '@/context/GrowthContext'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

export default function SettingsPage() {
  const { profile, refreshProfile, t } = useGrowth()
  const [updating, setUpdating] = useState(false)
  const [localProfile, setLocalProfile] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    if (profile) {
      setLocalProfile(profile)
    }
  }, [profile])

  const updateProfileField = async (field: string, value: any) => {
    setUpdating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', user.id)
      
      if (!error) {
        await refreshProfile()
      }
    }
    setUpdating(false)
  }

  if (!localProfile) return null

  return (
    <Shell>
      <div className="p-6 md:p-16 space-y-12 md:space-y-16 max-w-4xl mx-auto">
        <header className="space-y-4">
           <div className="flex items-center gap-4">
             <span className="material-symbols-outlined text-[#39FF14] text-4xl md:text-5xl">settings</span>
             <h1 className="text-4xl md:text-6xl font-black font-space tracking-tighter uppercase italic text-white leading-none">
               SYSTEM<span className="text-[#39FF14]">_CONFIG</span>
             </h1>
           </div>
           <p className="text-[10px] font-space text-[#39FF14] tracking-[0.8em] uppercase font-bold opacity-40">
             CALIBRATING_NEURAL_INTERFACE // {profile?.full_name?.toUpperCase()}
           </p>
        </header>

        <section className="space-y-16">
           {/* Language Selection */}
           <div className="space-y-6">
              <h3 className="text-[10px] font-space tracking-[0.5em] text-white/20 uppercase font-black">NEURAL_LEXICON</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'en', label: 'ENGLISH', sub: 'STANDARD' },
                  { id: 'ar', label: 'ARABIC', sub: 'CLASSIC' },
                  { id: 'ar-eg', label: 'EGYPTIAN', sub: 'LOCAL' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    disabled={updating}
                    onClick={() => updateProfileField('language', lang.id)}
                    className={cn(
                      "p-8 border rounded-sm text-left transition-all relative overflow-hidden group",
                      profile?.language === lang.id 
                        ? "bg-[#39FF14]/10 border-[#39FF14] shadow-[0_0_30px_#39FF1411]" 
                        : "bg-white/5 border-white/5 hover:border-white/10"
                    )}
                  >
                    <div className="relative z-10 space-y-2">
                       <p className={cn("text-[9px] font-space font-black tracking-widest", profile?.language === lang.id ? "text-[#39FF14]" : "text-white/20")}>{lang.sub}</p>
                       <p className={cn("text-xl font-space font-black", profile?.language === lang.id ? "text-white" : "text-white/40")}>{lang.label}</p>
                    </div>
                  </button>
                ))}
              </div>
           </div>

           {/* AI Coach Config */}
           <div className="space-y-6">
              <h3 className="text-[10px] font-space tracking-[0.5em] text-white/20 uppercase font-black">{profile?.ai_name || 'NEURAL_CORE'}_CALIBRATION</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { id: 'GENTLE', label: 'GENTLE', sub: 'SUPPORTIVE_MODE', icon: 'favorite' },
                  { id: 'SAVAGE', label: 'SAVAGE', sub: 'DRILL_SERGEANT', icon: 'bolt' }
                ].map((p) => (
                  <button
                    key={p.id}
                    disabled={updating}
                    onClick={() => updateProfileField('ai_personality', p.id)}
                    className={cn(
                      "p-6 border rounded-sm text-left transition-all relative overflow-hidden group",
                      profile?.ai_personality === p.id 
                        ? "bg-secondary/10 border-secondary shadow-[0_0_30px_rgba(0,240,255,0.1)]" 
                        : "bg-white/5 border-white/5 hover:border-white/10"
                    )}
                  >
                    <div className="relative z-10 flex items-center gap-4">
                       <span className={cn("material-symbols-outlined text-2xl", profile?.ai_personality === p.id ? "text-secondary" : "text-white/20")}>{p.icon}</span>
                       <div>
                          <p className={cn("text-[9px] font-space font-black tracking-widest", profile?.ai_personality === p.id ? "text-secondary" : "text-white/20")}>{p.sub}</p>
                          <p className={cn("text-lg font-space font-black", profile?.ai_personality === p.id ? "text-white" : "text-white/40")}>{p.label}</p>
                       </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="glass-panel p-6 md:p-10 border-white/5 space-y-8 relative overflow-hidden group">
                 <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="space-y-4 relative z-10">
                    <label className="text-[9px] font-space text-secondary tracking-widest font-black uppercase">COACH_DESIGNATION</label>
                    <input 
                      type="text"
                      className="w-full bg-white/5 border border-white/5 p-4 md:p-6 rounded-sm font-space text-2xl md:text-3xl font-black italic text-white outline-none focus:border-secondary/50 focus:bg-secondary/5 transition-all uppercase"
                      value={localProfile.ai_name || ''}
                      onChange={(e) => setLocalProfile({ ...localProfile, ai_name: e.target.value })}
                      onBlur={(e) => updateProfileField('ai_name', e.target.value)}
                      placeholder="ENTER_AI_NAME"
                    />
                    <p className="text-[10px] font-space text-white/20 tracking-wider">THIS NAME WILL BE USED IN ALL NEURAL NOTIFICATIONS.</p>
                 </div>
              </div>
           </div>

           {/* Operator Config */}
           <div className="space-y-6">
              <h3 className="text-[10px] font-space tracking-[0.5em] text-white/20 uppercase font-black">OPERATOR_IDENTITY</h3>
              <div className="glass-panel p-6 md:p-10 border-white/5 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    <div className="space-y-4">
                       <label className="text-[9px] font-space text-[#39FF14] tracking-widest font-black uppercase">FULL_NAME</label>
                       <input 
                         type="text"
                         className="w-full bg-white/5 border border-white/5 p-4 md:p-6 rounded-sm font-space text-xl md:text-2xl font-black text-white outline-none focus:border-[#39FF14]/50 focus:bg-[#39FF14]/5 transition-all uppercase"
                         value={localProfile.full_name || ''}
                         onChange={(e) => setLocalProfile({ ...localProfile, full_name: e.target.value })}
                         onBlur={(e) => updateProfileField('full_name', e.target.value)}
                       />
                    </div>
                    <div className="space-y-4">
                       <label className="text-[9px] font-space text-[#39FF14] tracking-widest font-black uppercase">CHRONO_AGE</label>
                       <input 
                         type="number"
                         className="w-full bg-white/5 border border-white/5 p-4 md:p-6 rounded-sm font-space text-xl md:text-2xl font-black text-white outline-none focus:border-[#39FF14]/50 focus:bg-[#39FF14]/5 transition-all"
                         value={localProfile.age || ''}
                         onChange={(e) => setLocalProfile({ ...localProfile, age: e.target.value })}
                         onBlur={(e) => updateProfileField('age', parseInt(e.target.value))}
                       />
                    </div>
                 </div>

                 <div className="space-y-4 pt-8 border-t border-white/5">
                    <label className="text-[9px] font-space text-[#39FF14] tracking-widest font-black uppercase">MACRO_MISSION_GOAL</label>
                    <textarea 
                      className="w-full bg-white/5 border border-white/5 p-4 md:p-6 rounded-sm font-space text-lg md:text-xl font-black italic text-white outline-none focus:border-[#39FF14]/50 focus:bg-[#39FF14]/5 transition-all uppercase resize-none h-32"
                      value={localProfile.mission_goal || ''}
                      onChange={(e) => setLocalProfile({ ...localProfile, mission_goal: e.target.value })}
                      onBlur={(e) => updateProfileField('mission_goal', e.target.value)}
                    />
                 </div>
              </div>
           </div>
        </section>

        <footer className="pt-16 flex flex-col md:flex-row justify-between items-center gap-8">
           <button 
             onClick={async () => {
               await supabase.auth.signOut()
               window.location.href = '/auth/login'
             }}
             className="text-[10px] font-space tracking-[0.4em] uppercase font-black text-red-500/40 hover:text-red-500 transition-colors w-full md:w-auto"
           >
             TERMINATE_ACCOUNT_SYNC
           </button>
           <div className="flex items-center gap-4">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", updating ? "bg-secondary" : "bg-[#39FF14]")} />
              <span className="text-[9px] font-space text-white/20 tracking-widest uppercase font-black">
                {updating ? 'SYNCING_CHANGES...' : 'ALL_SYSTEMS_SYNCED'}
              </span>
           </div>
        </footer>
      </div>
    </Shell>
  )
}
