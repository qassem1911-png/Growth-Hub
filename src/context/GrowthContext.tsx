'use client'

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export type Language = 'en' | 'ar' | 'ar-eg'
export type Theme = 'Neon Cyberpunk' | 'Clean Stealth'
export type AiPersonality = 'SAVAGE' | 'GENTLE'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  age: number | null
  mission_goal: string | null
  weekly_project: string | null
  daily_focus: string | null
  language: Language
  onboarded: boolean
  ai_name: string | null
  ai_personality: AiPersonality
}

export interface MissionTask {
  id: string
  is_completed: boolean
  weight: number
  title: string
}

export interface Mission {
  id: string
  title: string
  start_date: string
  end_date: string
  sync_to_dashboard: boolean
  is_archived: boolean
  size: string
  tasks?: MissionTask[]
}

export const TRANSLATIONS = {
  en: {
    dashboard: 'DASHBOARD',
    mission: 'MISSION_CANVAS',
    brain: 'BRAIN_NOTES',
    achievements: 'LEGACY_VAULT',
    streak: 'STREAK',
    exit: 'SAFE EXIT',
    sync: 'SYNCING_IDENTITY',
    operator: 'OPERATOR',
    status: 'SYSTEM: ONLINE',
    // AI Templates - GENTLE
    ai_ahead_gentle: "Uplink successful! Your refactoring on {task} is surgical. Next node, Operator.",
    ai_red_gentle: "INTERRUPT: {task} is flatlining. Why are you staring at the HUD? Move.",
    ai_default_gentle: "Uplink stable. Keep executing, {name}.",
    // AI Templates - SAVAGE
    ai_ahead_savage: "Surgical execution, {name}. {task} was no match for your logic. Don't stop now.",
    ai_red_savage: "FAILURE_IMMINENT: {task} is bleeding out. Get offline or get it done. No excuses.",
    ai_default_savage: "Monitoring... Performance is acceptable, {name}. Barely.",
  },
  ar: {
    dashboard: 'لوحة القيادة',
    mission: 'مهام القمة',
    brain: 'ملاحظات العقل',
    achievements: 'قبو الإنجازات',
    streak: 'سلسلة الإنجاز',
    exit: 'خروج آمن',
    sync: 'مزامنة الهوية',
    operator: 'المشغل',
    status: 'النظام: متصل',
    // AI Templates - GENTLE
    ai_ahead_gentle: "تم الاتصال بنجاح! تعديلك على {task} دقيق للغاية. العقدة التالية يا مشغل.",
    ai_red_gentle: "مقاطعة: {task} تتلاشى. لماذا تحدق في الشاشة؟ تحرك.",
    ai_default_gentle: "الاتصال مستقر. استمر في التنفيذ يا {name}.",
    // AI Templates - SAVAGE
    ai_ahead_savage: "تنفيذ جراحي يا {name}. {task} لم تكن عائقاً أمام منطقك. لا تتوقف الآن.",
    ai_red_savage: "فشل وشيك: {task} تنزف. أنجزها أو اخرج من النظام. لا أعذار.",
    ai_default_savage: "مراقب... الأداء مقبول يا {name}. بالكاد.",
  },
  'ar-eg': {
    dashboard: 'المنصة الرئيسية',
    mission: 'خطة الشغل',
    brain: 'نوتات الدماغ',
    achievements: 'خزنة البطولات',
    streak: 'عاش يا وحش',
    exit: 'اخرج بالسلامة',
    sync: 'بنجيب بياناتك',
    operator: 'يا بطل',
    status: 'كله تمام',
    // AI Templates - GENTLE
    ai_ahead_gentle: "زي الفل! شغلك على {task} عالمي. اللي بعده يا بطل.",
    ai_red_gentle: "استنى هنا: الـ {task} بتضيع منك. انت واقف بتتفرج على ايه؟ انجز.",
    ai_default_gentle: "كله تمام. كمل شغل يا {name}.",
    // AI Templates - SAVAGE
    ai_ahead_savage: "وحش يا {name}! الـ {task} خلصت في ثانية. مش عاوز دلع، كمل.",
    ai_red_savage: "بقولك ايه: الـ {task} هتضيع. فوق كدا وخلصنا، مفيش وقت للدلع.",
    ai_default_savage: "متابعك... شغال يعني يا {name}. مش بطال.",
  }
}

interface GrowthContextType {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
  isLoading: boolean
  isRTL: boolean
  tutorialActive: boolean
  setTutorialActive: (active: boolean) => void
  refreshProfile: () => Promise<void>
  t: (key: keyof typeof TRANSLATIONS['en']) => string
  getAiMessage: (type: 'AHEAD' | 'RED' | 'DEFAULT', taskName?: string) => string
  mounted: boolean
  calculateAccountability: (mission: Mission) => {
    progress: number
    isInRedZone: boolean
    isAheadOfSchedule: boolean
    status: 'LATE' | 'ON_TRACK'
  }
}

const GrowthContext = createContext<GrowthContextType | undefined>(undefined)

export function GrowthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tutorialActive, setTutorialActive] = useState(false)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const isRTL = useMemo(() => profile?.language?.startsWith('ar') || false, [profile?.language])

  const t = (key: keyof typeof TRANSLATIONS['en']) => {
    const lang = profile?.language || 'en'
    return TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key]
  }

  const refreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (data) {
        setProfile({
          ...data,
          full_name: data.full_name || user.user_metadata.full_name,
          avatar_url: data.avatar_url || user.user_metadata.avatar_url,
          ai_name: data.ai_name,
          ai_personality: data.ai_personality || 'GENTLE'
        } as Profile)

        // Intelligent Gatekeeper Redirection
        const hasName = !!data.full_name
        const isAtOnboarding = window.location.pathname === '/onboarding'
        const isAtAuth = window.location.pathname.startsWith('/auth')

        if (!isAtAuth) {
          if (!hasName && !isAtOnboarding) {
            router.push('/onboarding')
          } else if (hasName && isAtOnboarding) {
            router.push('/')
          }
        }
      } else {
        if (!window.location.pathname.startsWith('/auth') && window.location.pathname !== '/onboarding') {
          router.push('/onboarding')
        }
      }
    } else {
       if (!window.location.pathname.startsWith('/auth')) {
         router.push('/auth/login')
       }
    }
    setIsLoading(false)
  }

  useEffect(() => {
    console.log('CONTEXT_MOUNTED:', true)
    setMounted(true)
    refreshProfile().then(() => {
      console.log('PROFILE_DATA:', profile)
    }).catch((err) => {
      console.error('PROFILE_ERROR:', err)
    })
  }, [])

  useEffect(() => {
    if (!mounted || !profile) return
    
    // Break Infinite Loop: Only apply if values changed
    const dir = isRTL ? 'rtl' : 'ltr'
    const lang = profile.language.startsWith('ar') ? 'ar' : 'en'
    
    if (document.documentElement.dir !== dir) document.documentElement.dir = dir
    if (document.documentElement.lang !== lang) document.documentElement.lang = lang
    
    const targetSize = lang === 'ar' ? '120%' : '100%'
    const targetLH = lang === 'ar' ? '1.7' : 'normal'
    
    if (document.documentElement.style.fontSize !== targetSize) {
      document.documentElement.style.fontSize = targetSize
    }
    if (document.documentElement.style.lineHeight !== targetLH) {
      document.documentElement.style.lineHeight = targetLH
    }
  }, [profile?.language, isRTL, mounted])

  return (
    <GrowthContext.Provider value={{ 
      profile, setProfile, 
      isLoading,
      isRTL,
      tutorialActive, setTutorialActive,
      refreshProfile,
      t,
      mounted,
      getAiMessage: (type: 'AHEAD' | 'RED' | 'DEFAULT', taskName?: string) => {
        const lang = profile?.language || 'en'
        const personality = (profile?.ai_personality || 'GENTLE').toLowerCase()
        const name = profile?.full_name?.split(' ')[0] || t('operator')
        
        let typeKey = 'default'
        if (type === 'AHEAD') typeKey = 'ahead'
        if (type === 'RED') typeKey = 'red'

        const key = `ai_${typeKey}_${personality}`
        // @ts-ignore
        const template = (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) || ""
        return template.replace('{task}', taskName || 'MISSION').replace('{name}', name)
      },
      calculateAccountability: (mission: Mission) => {
        const tasks = mission.tasks || []
        const totalWeight = tasks.reduce((acc, t) => acc + (Number(t.weight) || 1), 0)
        const completedWeight = tasks.reduce((acc, t) => acc + (t.is_completed ? (Number(t.weight) || 1) : 0), 0)
        const progress = totalWeight === 0 ? 0 : completedWeight / totalWeight

        if (!mission.start_date || !mission.end_date) {
          return { progress: progress * 100, isInRedZone: false, isAheadOfSchedule: false, status: 'ON_TRACK' }
        }

        const start = new Date(mission.start_date).getTime()
        const end = new Date(mission.end_date).getTime()
        const now = new Date().getTime()

        const totalDuration = end - start
        const timeElapsed = now - start

        if (totalDuration <= 0) return { progress: progress * 100, isInRedZone: false, isAheadOfSchedule: false, status: 'ON_TRACK' }

        const timeRatio = Math.max(0, Math.min(1, timeElapsed / totalDuration))
        
        const status = timeRatio > (progress + 0.1) ? 'LATE' : 'ON_TRACK'
        const isInRedZone = status === 'LATE'
        const isAheadOfSchedule = progress > (timeRatio + 0.2)

        return {
          progress: Math.round(progress * 100),
          isInRedZone,
          isAheadOfSchedule,
          status
        }
      }
    }}>
      {children}
    </GrowthContext.Provider>
  )
}

export function useGrowth() {
  const context = useContext(GrowthContext)
  if (context === undefined) {
    throw new Error('useGrowth must be used within a GrowthProvider')
  }
  return context
}
