'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useGrowth, type Language, type AiPersonality } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'language',   label: 'LEXICON_SELECT',   title: 'CHOOSE_INTERFACE_LANGUAGE' },
  { id: 'ai_protocol', label: 'AI_PROTOCOL',      title: 'SELECT_AI_BEHAVIORAL_PROTOCOL' },
  { id: 'identity',   label: 'IDENTITY_SCAN',    title: 'WHO_ARE_YOU?' },
  { id: 'mission',    label: 'MACRO_SYNAPSE',     title: 'YOUR_MAIN_MISSION?' },
  { id: 'project',    label: 'MESO_NODE',         title: 'WEEKLY_PROJECT?' },
  { id: 'focus',      label: 'MICRO_PULSE',       title: 'DAILY_FOCUS?' }
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    language: 'en' as Language,
    ai_personality: 'GENTLE' as AiPersonality,
    full_name: '',
    age: '',
    mission_goal: '',
    weekly_project: '',
    daily_focus: ''
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { refreshProfile } = useGrowth()

  useEffect(() => {
    async function prefill() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.full_name) {
        setFormData(prev => ({ ...prev, full_name: user.user_metadata.full_name }))
      }
    }
    prefill()
  }, [])

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      completeOnboarding()
    }
  }

  const completeOnboarding = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name || user.user_metadata?.full_name || 'OPERATOR',
          age: parseInt(formData.age) || null,
          mission_goal: formData.mission_goal,
          weekly_project: formData.weekly_project,
          daily_focus: formData.daily_focus,
          language: formData.language,
          ai_personality: formData.ai_personality,
          onboarded: true,
          updated_at: new Date().toISOString()
        })
      
      if (profileError) {
        alert(profileError.message)
        setLoading(false)
        return
      }

      // Initialize 3 Synced Missions (only if they filled goal fields)
      const missions = []
      if (formData.mission_goal)    missions.push({ user_id: user.id, title: formData.mission_goal, sync_to_dashboard: true, status: 'ACTIVE', is_archived: false })
      if (formData.weekly_project)  missions.push({ user_id: user.id, title: formData.weekly_project, sync_to_dashboard: true, status: 'ACTIVE', is_archived: false })
      if (formData.daily_focus)     missions.push({ user_id: user.id, title: formData.daily_focus, sync_to_dashboard: true, status: 'ACTIVE', is_archived: false })
      if (missions.length > 0) await supabase.from('cups').insert(missions)

      await refreshProfile()
      router.push('/')
    } else {
       router.push('/')
    }
    setLoading(false)
  }

  const handleSkip = () => completeOnboarding()

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Step Progress HUD */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 flex gap-8 z-20 overflow-x-auto max-w-full px-8 pb-4">
         {STEPS.map((step, i) => (
           <div key={step.id} className="flex flex-col items-center gap-2 min-w-[100px]">
             <div className={cn(
               "w-full h-[2px] bg-white/5 transition-all duration-700",
               i <= currentStep ? "bg-[#39FF14] shadow-[0_0_10px_#39FF14]" : ""
             )} />
             <span className={cn(
               "text-[8px] font-space tracking-widest uppercase font-black whitespace-nowrap",
               i === currentStep ? "text-[#39FF14]" : "text-white/10"
             )}>
               {step.label}
             </span>
           </div>
         ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full max-w-3xl space-y-12 relative z-10"
        >
           <header className="space-y-4">
              <span className="text-[10px] font-space text-[#39FF14] tracking-[0.6em] uppercase font-bold">SEQUENCE_0{currentStep + 1}</span>
              <h2 className="text-3xl md:text-6xl font-black font-space tracking-tighter italic uppercase text-white leading-tight">
                {STEPS[currentStep].title}
              </h2>
           </header>

           <div className="space-y-10">

              {/* STEP 0: Language */}
              {currentStep === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {[
                     { id: 'en', label: 'ENGLISH_US', sub: 'CORE_STANDARD' },
                     { id: 'ar', label: 'ARABIC_MSA', sub: 'CLASSIC_LEXICON' },
                     { id: 'ar-eg', label: 'EGYPTIAN', sub: 'STREET_UPLINK' }
                   ].map(lang => (
                     <button
                       key={lang.id}
                       onClick={() => setFormData({ ...formData, language: lang.id as Language })}
                       className={cn(
                         "p-8 border rounded-sm text-left transition-all group relative overflow-hidden",
                         formData.language === lang.id 
                          ? "bg-[#39FF14]/10 border-[#39FF14] shadow-[0_0_30px_rgba(57,255,20,0.1)]" 
                          : "bg-white/5 border-white/5 hover:border-white/10"
                       )}
                     >
                       <div className="space-y-2 relative z-10">
                          <p className={cn("text-[10px] font-space font-black tracking-widest", formData.language === lang.id ? "text-[#39FF14]" : "text-white/20")}>{lang.sub}</p>
                          <p className={cn("text-xl font-space font-black", formData.language === lang.id ? "text-white" : "text-white/40")}>{lang.label}</p>
                       </div>
                       {formData.language === lang.id && (
                         <motion.div layoutId="lang-check" className="absolute top-4 right-4 text-[#39FF14]">
                            <span className="material-symbols-outlined">check_circle</span>
                         </motion.div>
                       )}
                     </button>
                   ))}
                </div>
              )}

              {/* STEP 1: AI Personality */}
              {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* SAVAGE */}
                  <button
                    onClick={() => setFormData({ ...formData, ai_personality: 'SAVAGE' })}
                    className={cn(
                      "p-6 md:p-10 border rounded-sm text-left transition-all relative overflow-hidden group",
                      formData.ai_personality === 'SAVAGE'
                        ? "bg-[#FF3131]/10 border-[#FF3131] shadow-[0_0_40px_rgba(255,49,49,0.15)]"
                        : "bg-white/5 border-white/5 hover:border-white/10"
                    )}
                  >
                    <div className="space-y-4">
                      <span className="text-4xl md:text-5xl">🔥</span>
                      <p className={cn("text-xl md:text-2xl font-space font-black uppercase", formData.ai_personality === 'SAVAGE' ? "text-[#FF3131]" : "text-white/40")}>
                        SAVAGE
                      </p>
                      <p className={cn("text-xs md:text-sm font-space leading-relaxed", formData.ai_personality === 'SAVAGE' ? "text-white/70" : "text-white/20")}>
                        {formData.language === 'en' ? "AI will trash talk if you're late. No mercy. No excuses. High pressure logic only." : 
                         formData.language === 'ar' ? "الـ AI سيسخر منك إذا تأخرت. لا رحمة. لا أعذار. منطق الضغط العالي فقط." :
                         "الـ AI هيهزأك لو اتأخرت. مفيش دلع. لو مش حمل الحق متبدأش."}
                      </p>
                    </div>
                    {formData.ai_personality === 'SAVAGE' && (
                      <div className="absolute top-4 right-4 text-[#FF3131]">
                        <span className="material-symbols-outlined">whatshot</span>
                      </div>
                    )}
                  </button>

                  {/* GENTLE */}
                  <button
                    onClick={() => setFormData({ ...formData, ai_personality: 'GENTLE' })}
                    className={cn(
                      "p-6 md:p-10 border rounded-sm text-left transition-all relative overflow-hidden group",
                      formData.ai_personality === 'GENTLE'
                        ? "bg-[#39FF14]/10 border-[#39FF14] shadow-[0_0_40px_rgba(57,255,20,0.15)]"
                        : "bg-white/5 border-white/5 hover:border-white/10"
                    )}
                  >
                    <div className="space-y-4">
                      <span className="text-4xl md:text-5xl">💚</span>
                      <p className={cn("text-xl md:text-2xl font-space font-black uppercase", formData.ai_personality === 'GENTLE' ? "text-[#39FF14]" : "text-white/40")}>
                        GENTLE
                      </p>
                      <p className={cn("text-xs md:text-sm font-space leading-relaxed", formData.ai_personality === 'GENTLE' ? "text-white/70" : "text-white/20")}>
                        {formData.language === 'en' ? "Supportive AI coach. Focuses on positive reinforcement and steady growth." : 
                         formData.language === 'ar' ? "مدرب AI داعم. يركز على التعزيز الإيجابي والنمو المستمر." :
                         "الـ AI هيشجعك بحنية. كل خطوة هيقولك عاش. الجو إيجابي دايماً."}
                      </p>
                    </div>
                    {formData.ai_personality === 'GENTLE' && (
                      <div className="absolute top-4 right-4 text-[#39FF14]">
                        <span className="material-symbols-outlined">favorite</span>
                      </div>
                    )}
                  </button>
                </div>
              )}

              {/* STEP 2: Identity */}
              {currentStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <label className="text-[10px] font-space text-white/30 tracking-widest uppercase font-black">DESIGNATION</label>
                      <input 
                        type="text"
                        placeholder="ENTER_NAME"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full bg-white/5 border border-white/5 p-8 rounded-sm font-space text-2xl outline-none focus:border-[#39FF14]/50 focus:bg-[#39FF14]/5 transition-all uppercase placeholder:opacity-5 text-white font-black"
                      />
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-space text-white/30 tracking-widest uppercase font-black">CHRONO_AGE</label>
                      <input 
                        type="number"
                        placeholder="00"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        className="w-full bg-white/5 border border-white/5 p-8 rounded-sm font-space text-2xl outline-none focus:border-[#39FF14]/50 focus:bg-[#39FF14]/5 transition-all uppercase placeholder:opacity-5 text-white font-black"
                      />
                   </div>
                </div>
              )}

              {/* STEPS 3-5: Mission / Project / Focus */}
              {currentStep >= 3 && (
                <div className="space-y-4">
                   <label className="text-[10px] font-space text-white/30 tracking-widest uppercase font-black">
                     {currentStep === 3 ? 'MACRO_GOAL // LONG_TERM' : currentStep === 4 ? 'MESO_PROJECT // WEEKLY' : 'MICRO_FOCUS // DAILY'}
                   </label>
                   <textarea 
                     placeholder="DESCRIBE_OBJECTIVE_SPECIFICS"
                     value={currentStep === 3 ? formData.mission_goal : currentStep === 4 ? formData.weekly_project : formData.daily_focus}
                     onChange={(e) => {
                        const val = e.target.value
                        if (currentStep === 3) setFormData({ ...formData, mission_goal: val })
                        else if (currentStep === 4) setFormData({ ...formData, weekly_project: val })
                        else setFormData({ ...formData, daily_focus: val })
                     }}
                     className="w-full h-32 md:h-48 bg-white/5 border border-white/5 p-6 md:p-10 rounded-sm font-space text-2xl md:text-4xl italic font-black outline-none focus:border-[#39FF14]/50 focus:bg-[#39FF14]/5 transition-all uppercase placeholder:opacity-5 text-white resize-none"
                   />
                </div>
              )}

              {/* Navigation */}
               <div className="flex flex-col md:flex-row justify-between items-center pt-8 md:pt-16 gap-6">
                  <div className="flex items-center gap-6 w-full md:w-auto justify-between">
                    <button 
                      onClick={() => currentStep > 0 && setCurrentStep(prev => prev - 1)}
                      className={cn(
                        "text-[10px] font-space tracking-[0.4em] uppercase font-black px-6 md:px-10 py-4 md:py-6 border border-white/5 hover:bg-white/5 transition-all text-white/20",
                        currentStep === 0 ? "opacity-0 pointer-events-none" : ""
                      )}
                    >
                      BACK
                    </button>

                    {/* SKIP PROTOCOL */}
                    <button
                      onClick={handleSkip}
                      disabled={loading}
                      className="text-[10px] font-space tracking-[0.4em] uppercase font-black text-white/15 hover:text-white/40 transition-all flex items-center gap-2 disabled:opacity-30"
                    >
                      SKIP_PROTOCOL
                      <span className="material-symbols-outlined text-sm">fast_forward</span>
                    </button>
                  </div>
                  
                  <button 
                    disabled={loading}
                    onClick={handleNext}
                    className="w-full md:w-auto flex items-center justify-center gap-6 bg-[#39FF14] text-[#0D0D0D] px-10 md:px-16 py-4 md:py-6 rounded-sm font-space text-[12px] tracking-[0.3em] uppercase font-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(57,255,20,0.2)]"
                  >
                    {loading ? 'CALIBRATING...' : currentStep === STEPS.length - 1 ? 'FINALIZE_UPLINK' : 'NEXT_STATION'}
                    <span className="material-symbols-outlined text-2xl">arrow_forward</span>
                  </button>
               </div>
           </div>
        </motion.div>
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none opacity-[0.02] scanlines" />
    </div>
  )
}
