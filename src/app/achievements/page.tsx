'use client'

import React, { useState, useEffect } from 'react'
import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export default function LegacyVaultPage() {
  const [archived, setArchived] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMission, setSelectedMission] = useState<any | null>(null)
  const supabase = createClient()

  useEffect(() => { fetchArchived() }, [])

  async function fetchArchived() {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Only show truly archived missions (is_archived = true)
    const { data } = await supabase
      .from('cups')
      .select('*, tasks(*)')
      .eq('user_id', user.id)
      .eq('is_archived', true)
      .order('updated_at', { ascending: false })

    if (data) {
      const processed = data.map(m => {
        const total = m.tasks?.length || 0
        const completed = m.tasks?.filter((t: any) => t.is_completed).length || 0
        return {
          ...m,
          totalTasks: total,
          completedTasks: completed,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 100
        }
      })
      setArchived(processed)
    }
    setIsLoading(false)
  }

  const unarchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await supabase.from('cups').update({ is_archived: false, status: 'ACTIVE' }).eq('id', id)
    setArchived(prev => prev.filter(m => m.id !== id))
    if (selectedMission?.id === id) setSelectedMission(null)
  }

  const calculateDuration = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    const diff = e.getTime() - s.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    return days > 0 ? `${days} DAYS` : 'SINGLE_CYCLE'
  }

  return (
    <Shell>
      <div className="p-6 md:p-12 space-y-12 md:space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 relative">
          <div className="flex items-center justify-center gap-6 mb-2">
            <div className="w-20 h-[1px] bg-gradient-to-r from-transparent to-neon-green opacity-30" />
            <span className="material-symbols-outlined text-neon-green text-3xl md:text-4xl">military_tech</span>
            <div className="w-20 h-[1px] bg-gradient-to-l from-transparent to-neon-green opacity-30" />
          </div>
          <h1 className="text-4xl md:text-7xl font-black font-space tracking-tighter uppercase italic text-white leading-none">
            LEGACY<span className="text-neon-green">_VAULT</span>
          </h1>
          <p className="text-[10px] font-space text-neon-green tracking-[0.8em] uppercase font-bold opacity-40">
            COMPLETED_MISSIONS // {archived.length}_RECORDS_IN_VAULT
          </p>
        </div>

        {isLoading ? (
          <div className="text-center text-neon-green font-space animate-pulse tracking-widest text-sm">
            ACCESSING_VAULT...
          </div>
        ) : archived.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="relative">
              <div className="w-32 h-32 border-2 border-white/5 flex items-center justify-center"
                style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}>
                <span className="material-symbols-outlined text-5xl text-white/10">lock</span>
              </div>
            </div>
            <p className="text-[10px] font-space text-white/15 tracking-[0.5em] uppercase font-black">
              VAULT_EMPTY — COMPLETE A MISSION TO UNLOCK
            </p>
            <p className="text-[9px] font-space text-white/10 tracking-widest uppercase">
              WHEN YOU COMPLETE ALL TASKS IN A MISSION, IT AUTO-ARCHIVES HERE
            </p>
          </div>
        ) : (
          /* ── TROPHY ROOM — Shelf of Glowing Cups ── */
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 items-end justify-items-center">
            {archived.map((mission, i) => {
              const TROPHY_COLORS = ['green', 'blue', 'purple', 'green', 'blue']
              const color = TROPHY_COLORS[i % TROPHY_COLORS.length] as 'green' | 'blue' | 'purple'

              return (
                <motion.a
                  key={mission.id}
                  href={`/tasks/${mission.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="group flex flex-col items-center gap-3 cursor-pointer"
                >
                  {/* Trophy badge */}
                  <div className="text-[8px] font-space tracking-[0.4em] text-neon-green/40 uppercase font-black">
                    ★ COMPLETE
                  </div>

                  {/* Full glowing cup — forced 100%, no Red Zone */}
                  <EnergyCell
                    percentage={100}
                    label=""
                    color={color}
                    size="md"
                    isInRedZone={false}
                  />

                  {/* Mission title below cup */}
                  <p className="text-[9px] font-space font-black text-white/50 group-hover:text-white/90 tracking-widest uppercase text-center transition-all max-w-[100px] leading-tight truncate">
                    {mission.title}
                  </p>

                  {/* Unarchive */}
                  <button
                    onClick={(e) => { e.preventDefault(); unarchive(mission.id, e as any) }}
                    className="text-[7px] font-space text-white/10 hover:text-white/40 transition-all tracking-widest uppercase"
                  >
                    RESTORE →
                  </button>
                </motion.a>
              )
            })}
          </div>
        )}


        {/* Mission Detail Modal */}
        <AnimatePresence>
          {selectedMission && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050505]/95 backdrop-blur-md p-6"
              onClick={() => setSelectedMission(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-2xl bg-[#0A0A0A] border border-white/10 p-8 md:p-12 space-y-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-neon-green">military_tech</span>
                      <span className="text-[9px] font-space text-neon-green tracking-widest uppercase font-black">LEGACY_RECORD</span>
                    </div>
                    <h2 className="text-4xl font-space font-black uppercase italic text-white tracking-tighter">
                      {selectedMission.title}
                    </h2>
                  </div>
                  <button onClick={() => setSelectedMission(null)} className="text-white/20 hover:text-white transition-all">
                    <span className="material-symbols-outlined text-3xl">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-white/5">
                  <div className="space-y-1">
                    <p className="text-[8px] font-space text-white/30 tracking-widest uppercase">DURATION</p>
                    <p className="text-sm font-space font-black text-white">{calculateDuration(selectedMission.start_date, selectedMission.end_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-space text-white/30 tracking-widest uppercase">NODES</p>
                    <p className="text-sm font-space font-black text-white">{selectedMission.totalTasks}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-space text-white/30 tracking-widest uppercase">COMPLETION</p>
                    <p className="text-sm font-space font-black text-neon-green">100%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-space text-white/30 tracking-widest uppercase">STAMP</p>
                    <p className="text-sm font-space font-black text-white/60">{new Date(selectedMission.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="space-y-6">
                   <h4 className="text-[10px] font-space text-neon-green tracking-[0.4em] uppercase font-black">NODE_LOG</h4>
                   <div className="space-y-3">
                     {selectedMission.tasks?.map((task: any) => (
                       <div key={task.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5">
                         <div className="flex items-center gap-4">
                           <span className="material-symbols-outlined text-neon-green text-sm">check_circle</span>
                           <span className="text-xs font-space font-bold text-white/80">{task.title}</span>
                         </div>
                         <span className="text-[8px] font-space text-white/20 tracking-widest uppercase font-black">WEIGHT: {task.weight}</span>
                       </div>
                     ))}
                   </div>
                </div>

                <button
                  onClick={(e) => unarchive(selectedMission.id, e)}
                  className="w-full py-4 bg-neon-green/10 border border-neon-green/30 text-neon-green font-space text-[10px] tracking-widest uppercase font-black hover:bg-neon-green hover:text-black transition-all"
                >
                  RESTORE_MISSION_TO_ACTIVE_UPLINK
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Telemetry */}
        {archived.length > 0 && (
          <div className="flex flex-col items-center gap-6 opacity-20">
            <div className="flex gap-12">
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-space text-white uppercase tracking-widest mb-2 font-black">VAULT_STATUS</span>
                <span className="text-xl font-space font-black text-neon-green">SECURE</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-space text-white uppercase tracking-widest mb-2 font-black">TOTAL_WINS</span>
                <span className="text-xl font-space font-black text-neon-green">{archived.length}</span>
              </div>
            </div>
            <div className="w-96 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        )}
      </div>
    </Shell>
  )
}
