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

        {/* Mission Title */}
        <div className="space-y-4">
          {isRenaming ? (
            <input
              ref={renameRef}
              value={mission.title}
              onChange={e => renameMission(e.target.value)}
              onBlur={() => setIsRenaming(false)}
              onKeyDown={e => { if (e.key === 'Enter') setIsRenaming(false) }}
              className="w-full bg-transparent border-b-2 border-neon-green text-5xl font-space font-black text-white italic outline-none uppercase tracking-tight pb-2"
            />
          ) : (
            <div className="flex items-start gap-4 group">
              <h1 className="text-3xl md:text-5xl font-black font-space tracking-tighter uppercase italic text-white leading-tight flex-1">
                {mission.title}
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className={cn("mt-2 transition-all", showHelp ? "text-neon-green" : "text-white/30 hover:text-neon-green")}
                >
                  <span className="material-symbols-outlined text-2xl">lightbulb</span>
                </button>
                <button
                  onClick={() => setIsRenaming(true)}
                  className="opacity-0 group-hover:opacity-100 transition-all mt-2 text-white/30 hover:text-neon-green"
                >
                  <span className="material-symbols-outlined text-2xl">edit</span>
                </button>
              </div>
            </div>
          )}

          <AnimatePresence>
            {showHelp && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-neon-green/5 border border-neon-green/20 rounded-lg">
                  <p className="text-[10px] font-space text-neon-green/80 tracking-widest uppercase font-bold leading-relaxed">
                    NEURAL_LOGIC: Red borders mean you're behind schedule based on the mission duration. Green means you're a legend.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="text-[10px] font-space text-white/20 tracking-widest uppercase">
            MISSION_ID: {id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Progress Block */}
        <div className="glass-panel p-6 md:p-8 border-white/5 bg-white/[0.02] space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-0">
            <div>
              <span className={cn("text-5xl md:text-7xl font-space font-black italic", isInRedZone ? "text-red-500" : "text-white")}>{percentage}</span>
              <span className={cn("text-2xl md:text-3xl font-space font-black", isInRedZone ? "text-red-600" : "text-neon-green")}>%</span>
            </div>
            <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start md:text-right gap-1">
              <p className="text-[9px] font-space text-white/30 tracking-widest uppercase font-black">NODES_COMPLETE</p>
              <p className="text-xl md:text-2xl font-space font-black text-white">{completed}<span className="text-white/20">/{total}</span></p>
            </div>
          </div>
          <div className="w-full h-[3px] bg-white/5 overflow-hidden rounded-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isInRedZone ? "bg-red-500 shadow-[0_0_12px_#ef4444]" : "bg-neon-green shadow-[0_0_12px_#39FF14]"
              )}
            />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Show on HUD Toggle */}
          <button
            onClick={toggleHUD}
            className={cn(
              "flex items-center justify-center gap-3 px-6 py-3 border font-space text-[10px] tracking-widest uppercase font-black transition-all flex-1 md:flex-none",
              mission.sync_to_dashboard
                ? "bg-[#39FF14]/10 border-[#39FF14] text-[#39FF14] shadow-[0_0_20px_rgba(57,255,20,0.15)]"
                : "bg-white/[0.02] border-white/10 text-white/30 hover:border-white/30 hover:text-white/60"
            )}
          >
            <span className="material-symbols-outlined text-base">
              {mission.sync_to_dashboard ? 'link' : 'link_off'}
            </span>
            {mission.sync_to_dashboard ? 'SHOWN_ON_HUD' : 'SHOW_ON_HUD'}
          </button>

          {/* Delete Mission */}
          <button
            onClick={deleteMission}
            className="flex items-center justify-center gap-3 px-6 py-3 border border-white/5 text-white/20 hover:border-red-500/50 hover:text-red-500 font-space text-[10px] tracking-widest uppercase font-black transition-all flex-1 md:flex-none"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            TERMINATE_MISSION
          </button>

          {/* Date Parameters */}
          <div className="flex items-center gap-6 glass-panel p-4 border-white/5 bg-white/[0.02] flex-1 min-w-[300px]">
             <div className="flex flex-col gap-1">
               <label className="text-[8px] font-space text-white/30 tracking-widest uppercase font-black">START_DATE</label>
               <button 
                 onClick={() => { setActiveDatePicker('start'); setTempDate(mission.start_date?.split('T')[0] || '') }}
                 className="bg-transparent text-[10px] font-space text-white outline-none border border-white/10 p-2 rounded hover:border-neon-green/50 transition-all text-left min-w-[100px]"
               >
                 {mission.start_date ? new Date(mission.start_date).toLocaleDateString() : 'SELECT_DATE'}
               </button>
             </div>
             <div className="flex flex-col gap-1">
               <label className="text-[8px] font-space text-white/30 tracking-widest uppercase font-black">END_DATE</label>
               <button 
                 onClick={() => { setActiveDatePicker('end'); setTempDate(mission.end_date?.split('T')[0] || '') }}
                 className="bg-transparent text-[10px] font-space text-white outline-none border border-white/10 p-2 rounded hover:border-neon-green/50 transition-all text-left min-w-[100px]"
               >
                 {mission.end_date ? new Date(mission.end_date).toLocaleDateString() : 'SELECT_DATE'}
               </button>
             </div>
          </div>
        </div>

        {/* Task Checklist */}
        <div className="space-y-3">
          <p className="text-[9px] font-space text-white/20 tracking-[0.5em] uppercase font-black">CHECKLIST_NODES</p>

          <AnimatePresence>
            {tasks.map((task, idx) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: idx * 0.03 }}
                className="flex items-center gap-5 p-5 border border-white/5 bg-white/[0.02] group hover:border-white/10 transition-all"
              >
                {/* Neon Checkbox */}
                <button
                  onClick={() => toggleTask(task.id, task.is_completed)}
                  className={cn(
                    "w-5 h-5 border-2 flex-shrink-0 flex items-center justify-center transition-all",
                    task.is_completed
                      ? "bg-neon-green border-neon-green shadow-[0_0_10px_#39FF14]"
                      : "border-white/20 hover:border-neon-green/60"
                  )}
                >
                  {task.is_completed && (
                    <span className="material-symbols-outlined text-black text-sm font-black">check</span>
                  )}
                </button>

                {/* Task Title */}
                <span className={cn(
                  "flex-1 font-space text-sm transition-all",
                  task.is_completed
                    ? "text-white/30 line-through decoration-neon-green/50"
                    : "text-white/80"
                )}>
                  {task.title}
                </span>

                {/* Custom Weight Slider (1-10 Nodes) */}
                <div className="flex flex-col items-center gap-1.5 px-4">
                  <span className="text-[7px] font-space text-white/20 uppercase tracking-widest">IMPACT_LVL</span>
                  <div className="flex gap-1">
                    {[...Array(10)].map((_, i) => {
                      const weight = i + 1
                      const isActive = (task.weight || 1) >= weight
                      return (
                        <button
                          key={i}
                          onClick={() => updateTaskWeight(task.id, weight)}
                          className={cn(
                            "w-1.5 h-4 transition-all duration-300",
                            isActive 
                              ? "bg-neon-green shadow-[0_0_8px_#39FF14]" 
                              : "bg-white/5 hover:bg-white/20"
                          )}
                          style={{
                            opacity: isActive ? 0.3 + (weight * 0.07) : 1,
                            boxShadow: isActive ? `0 0 ${4 + weight}px #39FF14` : 'none'
                          }}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Delete task */}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-500 transition-all"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {tasks.length === 0 && (
            <div className="text-center py-12 text-white/15 font-space text-[10px] tracking-widest uppercase">
              NO_NODES_DETECTED. ADD A TASK BELOW.
            </div>
          )}

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
