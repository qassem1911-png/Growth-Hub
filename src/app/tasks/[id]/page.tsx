'use client'

import { use } from 'react'

import { useState, useEffect, useRef } from 'react'
import Shell from '@/components/layout/Shell'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'

interface MissionDetailPageProps {
  params: Promise<{ id: string }>
}

export default function MissionDetailPage({ params }: MissionDetailPageProps) {
  const { id } = use(params)
  const supabase = createClient()
  const { profile, calculateAccountability, getAiMessage } = useGrowth()
  const { showToast } = useToast()
  const router = useRouter()
  const [showHelp, setShowHelp] = useState(false)
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null)
  const [tempDate, setTempDate] = useState('')

  const [mission, setMission] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchMission() }, [id])
  useEffect(() => {
    if (isRenaming) renameRef.current?.focus()
  }, [isRenaming])

  async function fetchMission() {
    const { data } = await supabase
      .from('cups')
      .select('*, tasks(*)')
      .eq('id', id)
      .single()
    if (data) {
      setMission(data)
      setTasks(data.tasks || [])
    }
    setLoading(false)
  }

  const { progress: percentage, isInRedZone } = mission ? calculateAccountability({ ...mission, tasks }) : { progress: 0, isInRedZone: false }
  const total = tasks.length
  const completed = tasks.filter(t => t.is_completed).length

  const toggleTask = async (taskId: string, current: boolean) => {
    const newVal = !current
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: newVal } : t))
    await supabase.from('tasks').update({ is_completed: newVal }).eq('id', taskId)

    if (newVal) {
      // Log for streak
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('task_completion_log').insert({ user_id: user.id })

      const taskTitle = tasks.find(t => t.id === taskId)?.title || 'NODE'
      showToast(getAiMessage('AHEAD', taskTitle), 'success')

      // Check for 100% → auto-archive
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, is_completed: true } : t)
      const allDone = updatedTasks.every(t => t.is_completed)
      if (allDone && updatedTasks.length > 0) {
        await supabase.from('cups').update({ is_archived: true, status: 'COMPLETE' }).eq('id', id)
        showToast('MISSION_COMPLETE: AUTO-ARCHIVED TO LEGACY_VAULT! 🏆', 'success')
        setTimeout(() => router.push('/tasks'), 1500)
      }
    }
  }

  const addTask = async () => {
    const title = newTaskTitle.trim()
    if (!title) return
    const { data } = await supabase.from('tasks').insert({
      cup_id: id,
      title,
      type: 'CHECKLIST',
      is_completed: false
    }).select().single()
    if (data) {
      setTasks(prev => [...prev, data])
      setNewTaskTitle('')
      // Refresh mission to update task weights in accountability
      fetchMission()
    }
  }

  const updateTaskWeight = async (taskId: string, weight: number) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, weight } : t))
    await supabase.from('tasks').update({ weight }).eq('id', taskId)
    // No need to fetch mission here, state is updated locally
  }

  const updateMissionDates = async (field: 'start_date' | 'end_date', value: string) => {
    setMission((prev: any) => ({ ...prev, [field]: value }))
    await supabase.from('cups').update({ [field]: value }).eq('id', id)
  }

  const deleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    await supabase.from('tasks').delete().eq('id', taskId)
  }

  const renameMission = async (title: string) => {
    setMission((prev: any) => ({ ...prev, title }))
    await supabase.from('cups').update({ title }).eq('id', id)
  }

  const toggleHUD = async () => {
    if (!mission) return
    const newSync = !mission.sync_to_dashboard

    // Enforce max 3 HUD slots (check total)
    if (newSync) {
      const { count } = await supabase
        .from('cups')
        .select('id', { count: 'exact', head: true })
        .eq('sync_to_dashboard', true)
        .eq('is_archived', false)
      if ((count || 0) >= 3) {
        showToast('HUD_LIMIT: Only 3 active slots on HUD. Disable another mission first.', 'warning')
        return
      }
    }

    setMission((prev: any) => ({ ...prev, sync_to_dashboard: newSync }))
    await supabase.from('cups').update({ sync_to_dashboard: newSync }).eq('id', id)
    showToast(newSync ? 'MISSION UPLINKED TO HUD 📡' : 'MISSION REMOVED FROM HUD', newSync ? 'success' : 'info')
  }

  const deleteMission = async () => {
    if (!confirm('TERMINATE MISSION? All nodes will be purged.')) return
    await supabase.from('cups').delete().eq('id', id)
    router.push('/tasks')
  }

  if (loading) return (
    <Shell>
      <div className="p-16 text-neon-green font-space animate-pulse tracking-widest">LOADING_MISSION_DATA...</div>
    </Shell>
  )

  if (!mission) return (
    <Shell>
      <div className="p-16 text-red-500 font-space tracking-widest">MISSION_NOT_FOUND</div>
    </Shell>
  )

  return (
    <Shell>
      <div className="min-h-[calc(100vh-64px)] p-6 md:p-12 space-y-8 md:space-y-12 max-w-4xl mx-auto">

        {/* Back */}
        <button
          onClick={() => router.push('/tasks')}
          className="flex items-center gap-2 text-white/30 hover:text-white transition-all font-space text-[10px] tracking-widest uppercase font-black"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          MISSION_CANVAS
        </button>

        {/* ── CONTROL PANEL CARD ── */}
        <div className={cn(
          'rounded-sm border bg-black/40 backdrop-blur-xl p-6 space-y-5',
          isInRedZone
            ? 'border-red-500/30 shadow-[0_0_30px_rgba(255,0,0,0.06)]'
            : 'border-[#00F0FF]/20 shadow-[0_0_30px_rgba(0,240,255,0.04)]'
        )}>
          {/* Row 1: Title + Edit + Help */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {isRenaming ? (
                <input
                  ref={renameRef}
                  value={mission.title}
                  onChange={e => renameMission(e.target.value)}
                  onBlur={() => setIsRenaming(false)}
                  onKeyDown={e => { if (e.key === 'Enter') setIsRenaming(false) }}
                  className="w-full bg-transparent border-b border-[#00F0FF]/40 text-2xl font-space font-black text-white italic outline-none uppercase tracking-tight pb-1"
                />
              ) : (
                <h1 className="text-2xl md:text-3xl font-black font-space tracking-tighter uppercase italic text-white leading-tight truncate">
                  {mission.title}
                </h1>
              )}
              <p className="text-[9px] font-space text-white/20 tracking-[0.4em] uppercase mt-1">MISSION_ID: {id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setShowHelp(!showHelp)} className={cn('p-1.5 transition-all', showHelp ? 'text-neon-green' : 'text-white/20 hover:text-white/60')}>
                <span className="material-symbols-outlined text-lg">lightbulb</span>
              </button>
              <button onClick={() => setIsRenaming(true)} className="p-1.5 text-white/20 hover:text-[#00F0FF] transition-all">
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
            </div>
          </div>

          {/* Help tooltip */}
          <AnimatePresence>
            {showHelp && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <p className="text-[9px] font-space text-neon-green/70 tracking-widest uppercase font-bold leading-relaxed border-l-2 border-neon-green/30 pl-3">
                  RED = time ratio exceeds progress by 10%+. Stay ahead or the system flags you.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Row 2: Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[7px] font-space text-white/20 tracking-[0.4em] uppercase">PROGRESS</span>
              <span className={cn('text-3xl font-space font-black italic', isInRedZone ? 'text-red-500' : 'text-white')}>
                {percentage}<span className={cn('text-sm', isInRedZone ? 'text-red-600' : 'text-neon-green')}>%</span>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[7px] font-space text-white/20 tracking-[0.4em] uppercase">NODES</span>
              <span className="text-3xl font-space font-black italic text-white">{completed}<span className="text-white/20 text-sm">/{total}</span></span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[7px] font-space text-white/20 tracking-[0.4em] uppercase">STATUS</span>
              <span className={cn('text-sm font-space font-black uppercase tracking-widest mt-1', isInRedZone ? 'text-red-500' : 'text-neon-green')}>
                {isInRedZone ? '⚠ LATE' : '✓ ON_TRACK'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-[2px] bg-white/5 overflow-hidden rounded-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn('h-full rounded-full', isInRedZone ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]')}
            />
          </div>

          {/* Row 3: Dates + Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button onClick={() => { setActiveDatePicker('start'); setTempDate(mission.start_date?.split('T')[0] || '') }}
              className="flex flex-col items-start px-3 py-2 border border-white/10 hover:border-[#00F0FF]/40 transition-all rounded-sm">
              <span className="text-[7px] font-space text-white/20 tracking-widest uppercase">START</span>
              <span className="text-[10px] font-space text-white font-bold">{mission.start_date ? new Date(mission.start_date).toLocaleDateString() : '—'}</span>
            </button>
            <button onClick={() => { setActiveDatePicker('end'); setTempDate(mission.end_date?.split('T')[0] || '') }}
              className="flex flex-col items-start px-3 py-2 border border-white/10 hover:border-[#00F0FF]/40 transition-all rounded-sm">
              <span className="text-[7px] font-space text-white/20 tracking-widest uppercase">END</span>
              <span className="text-[10px] font-space text-white font-bold">{mission.end_date ? new Date(mission.end_date).toLocaleDateString() : '—'}</span>
            </button>
            <div className="flex-1" />
            <button onClick={toggleHUD} className={cn(
              'px-4 py-2 border font-space text-[9px] tracking-widest uppercase font-black transition-all',
              mission.sync_to_dashboard ? 'bg-neon-green/10 border-neon-green/50 text-neon-green' : 'border-white/10 text-white/30 hover:border-white/30'
            )}>
              <span className="material-symbols-outlined text-sm align-middle mr-1">{mission.sync_to_dashboard ? 'link' : 'link_off'}</span>
              {mission.sync_to_dashboard ? 'ON HUD' : 'ADD HUD'}
            </button>
            <button onClick={deleteMission} className="px-4 py-2 border border-white/5 text-white/20 hover:border-red-500/50 hover:text-red-500 font-space text-[9px] tracking-widest uppercase font-black transition-all">
              <span className="material-symbols-outlined text-sm align-middle mr-1">delete</span>
              PURGE
            </button>
          </div>
        </div>

        {/* Task Vertical List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-space text-white/20 tracking-[0.5em] uppercase font-black">CHECKLIST_NODES</p>
            <p className="text-[9px] font-space text-white/20 tracking-[0.3em] uppercase font-black">{completed}/{total} COMPLETE</p>
          </div>

          {tasks.length === 0 && (
            <div className="text-center py-12 text-white/15 font-space text-[10px] tracking-widest uppercase border border-dashed border-white/5 rounded-sm">
              NO_NODES_DETECTED. ADD A TASK BELOW.
            </div>
          )}

          <AnimatePresence>
            <div className="space-y-1">
              {tasks.map((task, idx) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn(
                    'group flex items-center gap-4 px-4 py-3 transition-all',
                    task.is_completed ? 'opacity-40' : 'hover:bg-white/[0.02]'
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTask(task.id, task.is_completed)}
                    className={cn(
                      'flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center transition-all',
                      task.is_completed
                        ? 'bg-neon-green border-neon-green shadow-[0_0_8px_#39FF14]'
                        : 'border-white/20 hover:border-neon-green/60'
                    )}
                  >
                    {task.is_completed && <span className="material-symbols-outlined text-black text-xs font-black">check</span>}
                  </button>

                  {/* Title */}
                  <span className={cn(
                    'flex-1 font-space text-sm transition-all',
                    task.is_completed ? 'text-white/30 line-through' : 'text-white/80'
                  )}>{task.title}</span>

                  {/* Impact nodes */}
                  <div className="flex gap-[3px] items-center flex-shrink-0">
                    {[...Array(10)].map((_, i) => {
                      const nodeVal = i + 1
                      const isActive = (task.weight || 1) >= nodeVal
                      return (
                        <button
                          key={i}
                          onClick={() => updateTaskWeight(task.id, nodeVal)}
                          className={cn(
                            'w-1.5 h-3.5 transition-all duration-200 rounded-[1px]',
                            isActive ? 'bg-neon-green shadow-[0_0_4px_#39FF14]' : 'bg-white/5 hover:bg-white/20'
                          )}
                        />
                      )
                    })}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-500 transition-all flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>

          {/* Add Task Input */}
          <div className="flex gap-3 pt-4">
            <input
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newTaskTitle.trim()) addTask() }}
              placeholder="ADD_NODE... (Press Enter)"
              className="flex-1 bg-white/[0.02] border border-white/10 px-5 py-3 font-space text-sm text-white outline-none focus:border-neon-green/50 transition-all placeholder:text-white/10 uppercase"
            />
            <button
              onClick={addTask}
              disabled={!newTaskTitle.trim()}
              className="px-6 py-3 bg-neon-green/10 border border-neon-green/30 text-neon-green font-space text-[10px] font-black uppercase hover:bg-neon-green hover:text-black transition-all disabled:opacity-20"
            >
              + ADD
            </button>
          </div>
        </div>


      </div>

      {/* Custom Cyberpunk Date Picker Modal */}
      <AnimatePresence>
        {activeDatePicker && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveDatePicker(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass-panel border-neon-green/30 bg-[#050505]/90 p-8 space-y-6 overflow-hidden"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black font-space tracking-tighter italic text-white uppercase">
                  {activeDatePicker === 'start' ? 'INIT_MISSION_START' : 'SET_TERMINAL_DATE'}
                </h3>
                <button onClick={() => setActiveDatePicker(null)} className="text-white/20 hover:text-white">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-space text-white/40 tracking-[0.2em] uppercase leading-relaxed">
                  ENTER_VALUE_ISO_FORMAT (YYYY-MM-DD):
                </p>
                <input 
                  type="date"
                  value={tempDate}
                  onChange={e => setTempDate(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 p-4 font-space text-white text-xl outline-none focus:border-neon-green/50 transition-all rounded-sm uppercase"
                />
              </div>

              <div className="pt-6 flex justify-end gap-4">
                 <button 
                   onClick={() => setActiveDatePicker(null)}
                   className="text-[10px] font-space tracking-widest uppercase font-black text-white/30 hover:text-white"
                 >
                   CANCEL_SYNC
                 </button>
                 <button 
                   onClick={() => {
                     updateMissionDates(activeDatePicker === 'start' ? 'start_date' : 'end_date', tempDate)
                     setActiveDatePicker(null)
                     showToast('NEURAL_SYNC_COMPLETE 📡', 'success')
                   }}
                   className="bg-neon-green text-black px-6 py-2 font-space text-[10px] tracking-widest uppercase font-black hover:scale-105 transition-all"
                 >
                   EXECUTE_SYNC
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Shell>
  )
}
