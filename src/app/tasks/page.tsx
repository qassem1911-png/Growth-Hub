'use client'

import Shell from '@/components/layout/Shell'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'

const SIZES = [
  { key: 'lg', label: 'LARGE',  desc: 'Macro Mission' },
  { key: 'md', label: 'MED',    desc: 'Standard Task' },
  { key: 'sm', label: 'SMALL',  desc: 'Micro Focus' },
]

export default function TasksPage() {
  const { profile, t, calculateAccountability } = useGrowth()
  const { showToast } = useToast()
  const router = useRouter()
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('NEW_CORE_MISSION')
  const [newSize, setNewSize] = useState('md')
  const supabase = createClient()

  useEffect(() => { fetchMissions() }, [])

  async function fetchMissions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('cups')
      .select('*, tasks(*)')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    if (data) setMissions(data)
    setLoading(false)
  }

  const addMission = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('cups').insert({
      user_id: user.id,
      title: newTitle || 'NEW_CORE_MISSION',
      status: 'INITIALIZING',
      size: newSize,
      is_archived: false,
    }).select().single()
    if (data) {
      setMissions([data, ...missions])
      setShowCreate(false)
      setNewTitle('NEW_CORE_MISSION')
      setNewSize('md')
      showToast('MISSION_INITIALIZED. Opening detail view...', 'success')
      router.push(`/tasks/${data.id}`)
    }
  }

  if (loading) return (
    <Shell>
      <div className="p-16 text-neon-green font-space animate-pulse tracking-widest">
        SCANNING_CORE_OBJECTIVES...
      </div>
    </Shell>
  )

  return (
    <Shell>
      <div className="p-6 md:p-12 space-y-8 md:space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-[#39FF14] text-4xl md:text-5xl">layers</span>
              <h1 className="text-4xl md:text-6xl font-black font-space tracking-tighter uppercase italic text-white leading-none">
                {t ? t('mission') : 'MISSION_CANVAS'}
              </h1>
            </div>
            <p className="text-[10px] font-space text-[#39FF14] tracking-[0.8em] uppercase font-bold opacity-40">
              ACTIVE_CORE_OBJECTIVES // {missions.length} MISSIONS RUNNING
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="w-full md:w-auto bg-[#39FF14] text-[#131313] px-10 py-4 font-space text-[11px] tracking-[0.3em] font-black uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(57,255,20,0.2)] flex items-center justify-center gap-4"
          >
            <span className="material-symbols-outlined">add_circle</span>
            INITIALIZE_MISSION
          </button>
        </header>

        {/* Create Mission Modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050505]/90 backdrop-blur-md"
              onClick={() => setShowCreate(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-lg bg-[#0A0A0A] border border-white/10 p-12 space-y-10"
              >
                <h2 className="text-2xl font-space font-black uppercase italic text-white tracking-tighter">
                  NEW_CORE_MISSION
                </h2>

                <div className="space-y-3">
                  <label className="text-[9px] font-space text-neon-green tracking-widest uppercase font-black">MISSION_DESIGNATION</label>
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addMission() }}
                    className="w-full bg-white/5 border border-white/10 p-4 font-space text-lg font-black text-white italic outline-none focus:border-neon-green/50 transition-all uppercase"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-space text-neon-green tracking-widest uppercase font-black">MISSION_SCALE</label>
                  <div className="grid grid-cols-3 gap-4">
                    {SIZES.map(s => (
                      <button
                        key={s.key}
                        onClick={() => setNewSize(s.key)}
                        className={cn(
                          'p-4 border text-left transition-all',
                          newSize === s.key
                            ? 'border-neon-green bg-neon-green/10 shadow-[0_0_20px_rgba(57,255,20,0.15)]'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                        )}
                      >
                        <p className={cn('text-[9px] font-space font-black tracking-widest', newSize === s.key ? 'text-neon-green' : 'text-white/20')}>{s.label}</p>
                        <p className="text-[11px] font-space text-white/60 mt-1">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-6 pt-4">
                  <button onClick={() => setShowCreate(false)} className="text-white/20 font-space text-[10px] uppercase tracking-widest hover:text-white transition-all">ABORT</button>
                  <button onClick={addMission} className="px-8 py-3 bg-neon-green text-black font-space font-black text-[11px] uppercase tracking-widest">DEPLOY</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mission List */}
        <div className="space-y-3">
          <AnimatePresence>
            {missions.map((mission, idx) => {
              const { progress: percentage, isInRedZone } = calculateAccountability(mission)
              const total = mission.tasks?.length || 0
              const completed = mission.tasks?.filter((t: any) => t.is_completed).length || 0
              const COLORS = ['#39FF14', '#00F0FF', '#b600f8', '#FFBD33', '#FF3131']
              const color = isInRedZone ? '#FF0000' : COLORS[idx % COLORS.length]

              return (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => router.push(`/tasks/${mission.id}`)}
                  className={cn(
                    "group flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 p-6 border cursor-pointer transition-all relative overflow-hidden",
                    isInRedZone
                      ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] bg-red-500/[0.03]"
                      : mission.sync_to_dashboard
                        ? "bg-[#39FF14]/[0.03] border-[#39FF14]/15 hover:border-[#39FF14]/40"
                        : "bg-white/[0.02] border-white/5 hover:border-white/15"
                  )}
                >
                  {/* Left color stripe */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />

                  {/* HUD Badge */}
                  {mission.sync_to_dashboard && (
                    <div className="hidden md:block ms-2 w-2 h-2 rounded-full bg-[#39FF14] shadow-[0_0_8px_#39FF14] flex-shrink-0" />
                  )}
                  {!mission.sync_to_dashboard && <div className="hidden md:block ms-2 w-2 h-2 flex-shrink-0" />}

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-space font-black uppercase italic text-lg truncate group-hover:text-neon-green transition-colors">
                      {mission.title}
                    </p>
                    <p className="text-[9px] font-space text-white/30 tracking-widest uppercase mt-1">
                      {completed}/{total} NODES COMPLETE
                      {mission.sync_to_dashboard ? ' · HUD_ACTIVE' : ''}
                    </p>
                  </div>

                  {/* Progress */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 flex-shrink-0 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                    <div className="text-right flex items-center gap-3 md:block">
                      <span className="text-2xl font-space font-black italic" style={{ color }}>{percentage}%</span>
                      <span className="text-[9px] md:hidden text-white/30 tracking-widest font-black">COMPLETION</span>
                    </div>
                    <div className="w-full md:w-32 h-[2px] bg-white/5">
                      <div
                        className="h-full transition-all duration-700"
                        style={{ width: `${percentage}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                      />
                    </div>
                  </div>

                  {/* Chevron */}
                  <span className="material-symbols-outlined text-white/10 group-hover:text-white/60 transition-all">chevron_right</span>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {missions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 opacity-30">
              <span className="material-symbols-outlined text-6xl text-white/20">layers</span>
              <p className="text-[10px] font-space text-white/20 tracking-widest uppercase font-black">NO_ACTIVE_MISSIONS_DETECTED</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
