'use client'

import { Activity, AlertTriangle, BarChart3, Lightbulb, Target, Zap, Check, Calendar, Users } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import React from 'react'
import InlineGuideTip from '@/components/ui/InlineGuideTip'

const SLOT_COLORS = ['#39FF14', '#00F0FF', '#b600f8'] as const

// DB stores 'sm' | 'md' | 'lg' — cover all aliases too
const SIZE_MAP: Record<string, 'sm' | 'md' | 'lg'> = {
  sm: 'sm', md: 'md', lg: 'lg',
  S: 'sm', SMALL: 'sm', small: 'sm',
  M: 'md', MEDIUM: 'md', medium: 'md',
  L: 'lg', LARGE: 'lg', large: 'lg',
}

export default function Dashboard() {
  const { profile, calculateAccountability, mounted, t, isRTL, currentTheme, tasksCompletedToday, addXp } = useGrowth()
  const router = useRouter()
  const [missions, setMissions] = useState<any[]>([])
  const [weeklyMinutes, setWeeklyMinutes] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [rivalryText, setRivalryText] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    if (mounted) {
      fetchDashboardMissions()
      fetchWeeklyTimeLogs()
    }
  }, [mounted])

  async function fetchDashboardMissions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('cups')
      .select('*, tasks(*)')
      .eq('user_id', user.id)
      .eq('sync_to_dashboard', true)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    
    if (data) {
      setMissions(data)
      
      const squadGoals = data.filter((m: any) => m.metadata?.type === 'squad')
      if (squadGoals.length > 0) {
        const squadGoalIds = squadGoals.map((m: any) => m.id)
        
        // Fetch squad members and map them (exclude blocked)
        const { data: members } = await supabase
          .from('goal_members')
          .select('*, profiles(*)')
          .in('goal_id', squadGoalIds)

        if (members) {
          const uniqueMembersMap: Record<string, any> = {}
          members.forEach((m: any) => {
            if (m.profiles && m.profiles.id !== user.id && !m.profiles.blocked) {
              uniqueMembersMap[m.profiles.id] = m.profiles
            }
          })
          const otherMembers = Object.values(uniqueMembersMap).sort((a: any, b: any) => b.xp - a.xp)
          
          if (otherMembers.length > 0) {
            const topMember: any = otherMembers[0]
            const myXp = profile?.xp || 0
            
            if (myXp >= topMember.xp) {
              const diff = myXp - topMember.xp
              setRivalryText(isRTL 
                ? `أنت في الصدارة! يليك ${topMember.full_name || 'منافسك'} بفارق ${diff} XP.` 
                : `You are leading! ${topMember.full_name || 'Rival'} is ${diff} XP behind you.`
              )
            } else {
              const diff = topMember.xp - myXp
              setRivalryText(isRTL 
                ? `أنت متأخر بـ ${diff} XP عن ${topMember.full_name || 'المتصدر'}.` 
                : `You are ${diff} XP behind ${topMember.full_name || 'Leader'}.`
              )
            }
          } else {
            setRivalryText(isRTL ? 'انضم إلى فريق لتتبع منافسيك.' : 'Join a squad to track your rivals.')
          }
        }
      } else {
        setRivalryText(isRTL ? 'انضم إلى فريق لتتبع منافسيك.' : 'Join a squad to track your rivals.')
      }
    }
    setLoading(false)
  }

  async function fetchWeeklyTimeLogs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now.setDate(diff))
    monday.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('time_logs')
      .select('duration_minutes')
      .eq('user_id', user.id)
      .gte('started_at', monday.toISOString())

    if (error) {
      console.error("ERROR FETCHING WEEKLY TIME LOGS:", error)
      return
    }

    if (data) {
      const total = data.reduce((acc: number, log: any) => acc + (log.duration_minutes || 0), 0)
      setWeeklyMinutes(total)
    }
  }

  const allTasks = useMemo(() => {
    const list: any[] = []
    missions.forEach(m => {
      if (m.tasks) {
        m.tasks.forEach((t: any) => {
          list.push({ ...t, missionTitle: m.title, missionColor: m.color || currentTheme.color })
        })
      }
    })
    return list
  }, [missions, currentTheme.color])

  const actionInboxTasks = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return allTasks.filter((task: any) => {
      if (task.is_completed) return false
      const dateStr = task.metadata?.endDate || task.metadata?.dueDate
      if (!dateStr) return false
      
      const taskDate = new Date(dateStr)
      taskDate.setHours(0, 0, 0, 0)
      
      return taskDate <= today
    })
  }, [allTasks])

  const completedTasksCount = useMemo(() => allTasks.filter(t => t.is_completed).length, [allTasks])
  const pendingTasksCount = useMemo(() => allTasks.filter(t => !t.is_completed).length, [allTasks])

  async function toggleTask(task: any) {
    const updatedStatus = !task.is_completed
    setMissions(prev => prev.map(m => ({
      ...m,
      tasks: m.tasks?.map((t: any) => t.id === task.id ? { ...t, is_completed: updatedStatus } : t)
    })))

    // Support guest goals locally
    if (task.cup_id?.startsWith('local_')) {
      const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
      const updatedGoals = guestGoals.map((m: any) => {
        if (m.id === task.cup_id) {
          return {
            ...m,
            tasks: m.tasks?.map((t: any) => t.id === task.id ? { ...t, is_completed: updatedStatus } : t)
          }
        }
        return m
      })
      localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))
      return
    }

    const { error } = await supabase.from('tasks').update({ is_completed: updatedStatus }).eq('id', task.id)
    if (error) {
      fetchDashboardMissions()
    } else {
      const mission = missions.find(m => m.id === task.cup_id)
      if (mission && mission.tasks) {
        const taskIndex = mission.tasks.findIndex((t: any) => t.id === task.id)
        if (taskIndex !== -1) {
          const sizeStr = mission.size?.toLowerCase() || 'md'
          let xpCeiling = 8
          if (sizeStr === 'sm' || sizeStr === 's' || sizeStr === 'small') xpCeiling = 4
          else if (sizeStr === 'lg' || sizeStr === 'l' || sizeStr === 'large') xpCeiling = 20

          if (taskIndex < xpCeiling) {
            await addXp(updatedStatus ? ((Number(task.weight) || 3) * 10) : -((Number(task.weight) || 3) * 10), updatedStatus ? task.title : undefined)
          }
        }
      }

      if (updatedStatus) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('task_completion_log').insert([{
            user_id: user.id,
            task_id: task.id,
            cup_id: task.cup_id,
            completed_at: new Date().toISOString()
          }])
        }
      }
    }
  }

  if (!mounted) return null

  return (
    <Shell syncedMissions={missions} onMissionsRefresh={fetchDashboardMissions}>
      <div className="w-full min-h-[calc(100vh-64px)] flex flex-col py-8 md:py-12 px-4 md:px-12 space-y-8 max-w-7xl mx-auto font-space">
        
        {/* ── COMMAND CENTER TITLE ── */}
        <div className="w-full flex flex-col items-center text-center space-y-3">
          <div className="flex items-center gap-6">
            <div className="h-[1px] w-20 md:w-32" style={{ background: `linear-gradient(to right, transparent, ${currentTheme.color}40)` }} />
            <motion.span
              style={{ color: currentTheme.color, filter: `drop-shadow(0 0 8px ${currentTheme.color})` }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Zap className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
            </motion.span>
            <div className="h-[1px] w-20 md:w-32" style={{ background: `linear-gradient(to left, transparent, ${currentTheme.color}40)` }} />
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight uppercase leading-none text-zinc-900 dark:text-white"
          >
            {isRTL ? 'منظومة' : 'COMMAND'} <span style={{ color: currentTheme.color }}>{isRTL ? 'التحكم' : 'CENTER'}</span>
          </motion.h1>

          <p className="text-[10px] text-zinc-500 dark:text-white/40 tracking-[0.4em] uppercase font-black">
            {isRTL ? 'لوحة القيادة التكتيكية' : 'TACTICAL DECISION PLATFORM'} // {profile?.rank || 'MEMBER'}
          </p>
        </div>

        {/* ── THE FOCUS PIPELINE (Top Section - Full Width) ── */}
        {(() => {
          const isOverCap = tasksCompletedToday > 9
          return (
            <div className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 md:p-8 space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1" style={{ background: `linear-gradient(to right, ${isOverCap ? '#FF0055' : currentTheme.color}, transparent)` }} />
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 shrink-0" style={{ color: isOverCap ? '#FF0055' : currentTheme.color }} />
                  <span className="text-xs font-black tracking-widest text-[var(--text-secondary)] uppercase">
                    {isRTL ? 'خط تدفق التركيز اليومي' : 'DAILY FOCUS PIPELINE'}
                  </span>
                </div>
                <div className="text-lg font-black tracking-tight">
                  <span style={{ color: isOverCap ? '#FF0055' : currentTheme.color }}>{tasksCompletedToday}</span>
                  <span className="text-zinc-500"> / 9</span>
                </div>
              </div>

              {/* Segmented 9-slot Energy Bar */}
              <div 
                className="flex gap-2 h-7 p-1 rounded-xl border bg-zinc-100 dark:bg-[#050505] overflow-hidden shadow-inner"
                style={{ borderColor: `${currentTheme.color}30` }}
              >
                {Array.from({ length: 9 }).map((_, i) => {
                  const isActive = i < tasksCompletedToday
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded transition-all duration-500 relative overflow-hidden"
                      style={{
                        backgroundColor: isActive
                          ? (isOverCap ? '#FF0055' : currentTheme.color)
                          : 'transparent',
                        border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                        boxShadow: isActive 
                          ? `0 0 15px ${isOverCap ? '#FF0055' : currentTheme.color}`
                          : 'none',
                      }}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        <InlineGuideTip hasTasks={allTasks.length > 0} />

        {/* ── MIDDLE TWO-COLUMN GRID (Action Inbox & Rivalry Tracker) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">
          
          {/* Action Inbox (60%) */}
          <div className="lg:col-span-6 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-transparent" />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-500 shrink-0" />
                <h2 className="text-sm font-black tracking-widest text-[var(--text-secondary)] uppercase">
                  {isRTL ? 'الوارد التكتيكي العاجل' : 'ACTION INBOX // CRITICAL'}
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-black border border-red-500/20">
                {actionInboxTasks.length} {isRTL ? 'مهمة عاجلة' : 'IMMEDIATE'}
              </span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {actionInboxTasks.map((task) => {
                const tDate = new Date(task.metadata.endDate || task.metadata.dueDate)
                tDate.setHours(0,0,0,0)
                const today = new Date()
                today.setHours(0,0,0,0)
                const isOverdue = tDate < today

                return (
                  <motion.div
                    key={task.id}
                    layout
                    className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-zinc-950/20 hover:bg-white/5 hover:border-white/10 transition-all gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <button
                        onClick={() => toggleTask(task)}
                        className="w-6 h-6 rounded-full border flex items-center justify-center bg-transparent hover:bg-white/5 transition-all shrink-0 cursor-pointer"
                        style={{ borderColor: task.missionColor || currentTheme.color }}
                      >
                        <Check className="w-3.5 h-3.5 opacity-0 hover:opacity-100 transition-opacity" style={{ color: task.missionColor || currentTheme.color }} />
                      </button>

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-black text-white/95 uppercase truncate leading-tight">{task.title}</span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5 truncate">{task.missionTitle}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Overdue/Today Date indicator */}
                      <span className={cn(
                        "font-mono text-[9px] px-2 py-0.5 rounded border tracking-wider",
                        isOverdue 
                          ? "text-red-500 border-red-500/30 bg-red-950/15 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse font-black" 
                          : "text-zinc-400 border-white/5 bg-white/[0.02]"
                      )}>
                        📅 {task.metadata.endDate || task.metadata.dueDate}
                      </span>

                      {/* XP badge */}
                      <span className="text-[10px] font-mono text-zinc-500 tracking-wider">
                        +{task.weight * 10}XP
                      </span>
                    </div>
                  </motion.div>
                )
              })}

              {actionInboxTasks.length === 0 && (
                <div className="py-16 text-center space-y-2 border border-dashed border-white/5 rounded-xl">
                  <span className="text-zinc-600 font-black text-2xl">⚡</span>
                  <p className="text-xs text-zinc-500 dark:text-white/30 uppercase tracking-widest">
                    {isRTL ? 'الوارد فارغ! جميع الالتزامات منجزة.' : 'INBOX CLEAR // NO OVERDUE TASKS'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* The Rivalry Tracker (40%) */}
          <div 
            className="lg:col-span-4 bg-[var(--card-bg)] border rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden transition-all duration-300"
            style={{ 
              borderColor: currentTheme.color,
              boxShadow: `0 0 20px ${currentTheme.color}25`
            }}
          >
            <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: currentTheme.color }} />
            
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 shrink-0" style={{ color: currentTheme.color }} />
              <h2 className="text-sm font-black tracking-widest text-[var(--text-secondary)] uppercase">
                {isRTL ? 'متتبع المنافسة' : 'THE RIVALRY TRACKER'}
              </h2>
            </div>

            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <span className="text-4xl animate-bounce">⚔️</span>
              <p className="text-base font-black tracking-wide text-zinc-100 leading-relaxed uppercase max-w-xs">
                {rivalryText || (isRTL ? 'انضم إلى فريق لتتبع منافسيك.' : 'Join a squad to track your rivals.')}
              </p>
            </div>

            <div className="pt-4 border-t border-white/5 text-center">
              <button
                onClick={() => router.push('/goals/squad')}
                className="w-full py-2.5 bg-white/[0.02] hover:bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all cursor-pointer"
              >
                {isRTL ? 'إدارة فرق العمل' : 'MANAGE TEAM WORKSPACES'}
              </button>
            </div>
          </div>

        </div>

        {/* ── RECENT ACTIVE GOALS (Bottom Section - Full Width Grid) ── */}
        <div className="w-full space-y-6 pt-8 border-t border-[var(--card-border)]">
          <div className="flex items-center gap-3">
            <Target className="text-2xl w-6 h-6 shrink-0" style={{ color: currentTheme.color }} />
            <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
              {isRTL ? 'أحدث الأهداف النشطة' : 'RECENT ACTIVE GOALS // FOCUS MATRIX'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {missions.slice(0, 3).map((mission, idx) => {
              const { progress, isInRedZone } = calculateAccountability(mission)
              const roundedProgress = Math.round(progress)
              const customColor = mission.color || currentTheme.color

              return (
                <div
                  key={mission.id}
                  onClick={() => router.push(`/missions/${mission.id}`)}
                  className={cn(
                    "relative group cursor-pointer p-5 rounded-xl border bg-zinc-900/20 hover:bg-white/5 transition-all overflow-hidden flex flex-col gap-4",
                    isInRedZone ? "border-red-500/40" : "border-white/5 hover:border-white/10"
                  )}
                >
                  <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: isInRedZone ? '#ef4444' : customColor }} />

                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-sm font-black uppercase tracking-wide truncate max-w-[80%] text-zinc-100">
                      {mission.title}
                    </h3>
                    <span 
                      className="text-xs font-black font-mono shrink-0"
                      style={{ color: isInRedZone ? '#ef4444' : customColor }}
                    >
                      {roundedProgress}%
                    </span>
                  </div>

                  {/* Sleek horizontal Progress Bar */}
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${roundedProgress}%` }}
                      transition={{ duration: 1.2 }}
                      className="h-full rounded-full"
                      style={{ 
                        backgroundColor: isInRedZone ? '#ef4444' : customColor,
                        boxShadow: `0 0 8px ${isInRedZone ? '#ef4444' : customColor}`
                      }}
                    />
                  </div>
                </div>
              )
            })}

            {missions.length === 0 && (
              <div className="col-span-full py-12 text-center border border-dashed border-white/5 rounded-xl">
                <p className="text-xs uppercase tracking-widest text-zinc-500">
                  {isRTL ? 'لا توجد أهداف نشطة حالياً.' : 'NO ACTIVE GOALS SYNCED'}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </Shell>
  )
}
