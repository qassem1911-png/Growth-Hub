'use client'

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export type Language = 'en' | 'ar'
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
  gender: string | null
  xp: number
  rank: string
  active_theme: string
}

export const THEME_PACKAGES = {
  SILVER: {
    id: 'SILVER',
    name: 'Steel Grey',
    color: '#B0C4DE',
    cupStyle: 'cylinder',
    glow: 'rgba(176, 196, 222, 0.4)',
    accent: 'text-[#B0C4DE]',
    border: 'border-[#B0C4DE]/30'
  },
  PLATINUM: {
    id: 'PLATINUM',
    name: 'Cool Cyan',
    color: '#00CED1',
    cupStyle: 'hex',
    glow: 'rgba(0, 206, 209, 0.4)',
    accent: 'text-[#00CED1]',
    border: 'border-[#00CED1]/30'
  },
  CROWN: {
    id: 'CROWN',
    name: 'Majestic Purple',
    color: '#9370DB',
    cupStyle: 'crystal',
    glow: 'rgba(147, 112, 219, 0.4)',
    accent: 'text-[#9370DB]',
    border: 'border-[#9370DB]/30'
  },
  ACE: {
    id: 'ACE',
    name: 'Crimson Red',
    color: '#DC143C',
    cupStyle: 'shard',
    glow: 'rgba(220, 20, 60, 0.4)',
    accent: 'text-[#DC143C]',
    border: 'border-[#DC143C]/30'
  },
  CONQUEROR: {
    id: 'CONQUEROR',
    name: 'Blazing Gold',
    color: '#FFD700',
    cupStyle: 'sphere',
    glow: 'rgba(255, 215, 0, 0.5)',
    accent: 'text-[#FFD700]',
    border: 'border-[#FFD700]/30'
  }
}

export const RANK_THRESHOLDS = [
  { rank: 'SILVER', xp: 0, theme: 'SILVER', perk: 'Basic Protocol' },
  { rank: 'PLATINUM', xp: 500, theme: 'PLATINUM', perk: 'Energy Streams' },
  { rank: 'CROWN', xp: 1500, theme: 'CROWN', perk: 'Savage AI Coach' },
  { rank: 'ACE', xp: 4000, theme: 'ACE', perk: 'Tactical HUD' },
  { rank: 'CONQUEROR', xp: 10000, theme: 'CONQUEROR', perk: 'Glitch FX' }
]

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
    mission: 'MISSIONS',
    brain: 'NOTES',
    achievements: 'ACHIEVEMENTS',
    vault: 'VAULT',
    streak: 'STREAK',
    exit: 'Logout',
    sync: 'SYNCING',
    operator: 'USER',
    status: 'ONLINE',
    createMission: 'CREATE MISSION',
    task: 'TASK',
    showOnDashboard: 'SHOW ON DASHBOARD',
    save: 'SAVE',
    cancel: 'CANCEL',
    delete: 'DELETE',
    edit: 'EDIT',
    deadline: 'DEADLINE',
    start_date: 'START DATE',
    end_date: 'END DATE',
    title: 'TITLE',
    progress: 'PROGRESS',
    on_track: 'ON TRACK',
    late: 'LATE',
    ahead: 'AHEAD',
    addTask: 'ADD TASK',
    settings: 'SETTINGS',
    gender: 'GENDER',
    male: 'MALE',
    female: 'FEMALE',
    age: 'AGE',
    fullName: 'FULL NAME',
    aiName: 'COACH NAME',
    aiPersonality: 'AI PERSONALITY',
    gentle: 'GENTLE',
    savage: 'SAVAGE',
    logout: 'LOGOUT',
    noTasks: 'NO TASKS DETECTED. ADD A TASK BELOW.',
    tapToEnter: 'TAP TO ENTER MISSION',
    purge: 'PURGE',
    deploy: 'DEPLOY',
    missionColor: 'MISSION COLOR',
    missionScale: 'MISSION SCALE',
  },
  ar: {
    dashboard: 'الرئيسية',
    mission: 'المهام الشغالة',
    brain: 'الذاكرة',
    achievements: 'الإنجازات',
    vault: 'الخزنة',
    streak: 'سجل الأيام',
    exit: 'خروج',
    sync: 'جاري المزامنة',
    operator: 'أوبريتور',
    status: 'متصل',
    createMission: 'ابدأ مهمة جديدة',
    task: 'مهمة فرعية',
    showOnDashboard: 'عرض في الرئيسية',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'احذف',
    edit: 'تعديل',
    deadline: 'الموعد النهائي',
    start_date: 'تاريخ البدء',
    end_date: 'تاريخ الانتهاء',
    title: 'العنوان',
    progress: 'التقدم',
    on_track: 'على المسار',
    late: 'متأخر',
    ahead: 'متقدم',
    addTask: 'ضيف مهمة فرعية',
    settings: 'الإعدادات',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    age: 'السن',
    fullName: 'الاسم بالكامل',
    aiName: 'اسم المدرب',
    aiPersonality: 'شخصية المدرب',
    gentle: 'هادئ',
    savage: 'شرس',
    logout: 'خروج',
    noTasks: 'مفيش مهام مضافة.. ضيف واحدة دلوقتي.',
    tapToEnter: 'انقر للدخول',
    purge: 'مسح',
    deploy: 'ابدأ التنفيذ',
    missionColor: 'لون المهمة',
    missionScale: 'حجم المهمة',
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
  mounted: boolean
  currentTheme: typeof THEME_PACKAGES['SILVER']
  addXp: (amount: number) => Promise<void>
  lastAiMessage: string
  setLastAiMessage: (msg: string) => void
  changeTheme: (themeId: string) => Promise<void>
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
  const [lastAiMessage, setLastAiMessage] = useState('SYSTEM_ONLINE // STANDING_BY')
  const supabase = createClient()
  const router = useRouter()

  const isRTL = useMemo(() => profile?.language?.startsWith('ar') || false, [profile?.language])

  const currentTheme = useMemo(() => {
    const themeKey = (profile?.active_theme || 'SILVER') as keyof typeof THEME_PACKAGES
    return THEME_PACKAGES[themeKey] || THEME_PACKAGES.SILVER
  }, [profile?.active_theme])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-neon-green', currentTheme.color)
      document.documentElement.style.setProperty('--color-primary', currentTheme.color)
    }
  }, [currentTheme])

  const addXp = async (amount: number) => {
    if (!profile) return
    const newXp = (profile.xp || 0) + Math.round(amount)
    
    // Determine new rank
    let newRank = profile.rank || 'RECRUIT'
    for (const threshold of [...RANK_THRESHOLDS].reverse()) {
      if (newXp >= threshold.xp) {
        newRank = threshold.rank
        break
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ xp: newXp, rank: newRank })
      .eq('id', profile.id)

    if (!error) {
      setProfile({ ...profile, xp: newXp, rank: newRank })
    }
  }

  const changeTheme = async (themeId: string) => {
    if (!profile) return
    const { error } = await supabase
      .from('profiles')
      .update({ active_theme: themeId })
      .eq('id', profile.id)

    if (!error) {
      setProfile({ ...profile, active_theme: themeId })
    }
  }

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
          ai_personality: data.ai_personality || 'GENTLE',
          xp: data.xp || 0,
          rank: data.rank || 'RECRUIT',
          active_theme: data.active_theme || 'SILVER'
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
    
    const targetSize = lang === 'ar' ? '140%' : '100%'
    const targetLH = lang === 'ar' ? '1.8' : 'normal'
    
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
      currentTheme,
      addXp,
      changeTheme,
      lastAiMessage,
      setLastAiMessage,
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
