'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import Tutorial from '@/components/ui/Tutorial'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Slot colors: Green, Cyan, Purple (cycle for additional missions)
const SLOT_COLORS = ['green', 'blue', 'purple'] as const

// Size mapping: user's profile.size field -> EnergyCell size prop
const SIZE_MAP: Record<string, 'sm' | 'md' | 'lg'> = {
  S: 'sm',
  SMALL: 'sm',
  M: 'md',
  MEDIUM: 'md',
  L: 'lg',
  LARGE: 'lg',
}

export default function Dashboard() {
  // === ALL HOOKS FIRST — NO EXCEPTIONS ===
  const { profile, calculateAccountability, mounted } = useGrowth()
  const router = useRouter()
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (mounted) fetchDashboardMissions()
  }, [mounted])

  const cupSize = useMemo(() => {
    const pref = (profile as any)?.dashboard_view_preference || (profile as any)?.size || 'M'
    return SIZE_MAP[pref.toUpperCase()] || 'md'
  }, [profile])

  async function fetchDashboardMissions() {
    const { data } = await supabase
      .from('cups')
      .select('*, tasks(*)')
      .eq('sync_to_dashboard', true)
      .eq('is_archived', false)
      .limit(3)
    if (data) setMissions(data)
    setLoading(false)
  }

  // Gate after hooks — this is safe
  if (!mounted) return null

  return (
    <Shell syncedMissions={missions} onMissionsRefresh={fetchDashboardMissions}>
      <Tutorial />

      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 md:p-12 space-y-12">

        {/* ── CENTERED TITLE ── */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center gap-6 opacity-20">
            <div className="h-[1px] w-32 bg-gradient-to-r from-transparent to-white" />
            <span className="material-symbols-outlined text-neon-green text-sm">bolt</span>
            <div className="h-[1px] w-32 bg-gradient-to-l from-transparent to-white" />
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-9xl font-space font-black text-white italic tracking-tighter uppercase leading-none"
          >
            CORE<span className="text-neon-green">_UPLINK</span>
          </motion.h1>

          <p className="text-[10px] font-space text-white/40 tracking-[0.6em] uppercase font-black">
            CORE_STATION // {profile?.full_name?.toUpperCase() || 'OPERATOR'}
          </p>
        </div>

        {/* ── MISSION CARDS GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl cells-target">
          {missions.map((mission, idx) => {
            const { progress, isInRedZone } = calculateAccountability(mission)
            const color = SLOT_COLORS[idx % SLOT_COLORS.length]

            return (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => router.push(`/tasks/${mission.id}`)}
                className={cn(
                  'group cursor-pointer rounded-sm border bg-white/[0.02] p-6 flex flex-col items-center gap-6 transition-all duration-300',
                  isInRedZone
                    ? 'border-red-500/30 hover:border-red-500/60 shadow-[0_0_30px_rgba(255,0,0,0.05)]'
                    : 'border-white/5 hover:border-white/20 hover:shadow-[0_0_30px_rgba(57,255,20,0.05)]'
                )}
              >
                {/* Mission Title */}
                <div className="w-full text-center space-y-1">
                  <p className={cn(
                    'text-[9px] font-space font-black tracking-[0.5em] uppercase',
                    isInRedZone ? 'text-red-500/60' : 'text-white/30'
                  )}>
                    {isInRedZone ? '⚠ RED_ZONE' : 'MISSION_CORE'}
                  </p>
                  <h2 className="text-sm font-space font-black text-white uppercase tracking-wider truncate">
                    {mission.title}
                  </h2>
                  {mission.end_date && (
                    <p className="text-[8px] font-space text-white/20 tracking-widest">
                      TERMINAL: {new Date(mission.end_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Energy Cup */}
                <EnergyCell
                  percentage={progress}
                  label={`SLOT_0${idx + 1}`}
                  subLabel={mission.title}
                  color={isInRedZone ? 'red' : color}
                  size={cupSize}
                  isInRedZone={isInRedZone}
                />

                {/* Progress Bar */}
                <div className="w-full space-y-1.5">
                  <div className="flex justify-between text-[8px] font-space font-black tracking-widest uppercase text-white/20">
                    <span>PROGRESS</span>
                    <span className={isInRedZone ? 'text-red-500' : 'text-neon-green'}>{progress}%</span>
                  </div>
                  <div className="w-full h-[2px] bg-white/5 overflow-hidden rounded-full">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={cn(
                        'h-full rounded-full',
                        isInRedZone
                          ? 'bg-red-500 shadow-[0_0_8px_#FF0000]'
                          : 'bg-neon-green shadow-[0_0_8px_#39FF14]'
                      )}
                    />
                  </div>
                  <p className="text-[7px] font-space text-white/10 tracking-widest uppercase text-center">
                    TAP TO ENTER MISSION
                  </p>
                </div>
              </motion.div>
            )
          })}

          {/* Empty state (only shown when no missions at all) */}
          {missions.length === 0 && !loading && (
            <div
              className="md:col-span-3 flex flex-col items-center justify-center gap-4 p-16 border border-dashed border-white/10 rounded-sm cursor-pointer hover:border-neon-green/30 transition-all"
              onClick={() => router.push('/tasks')}
            >
              <span className="material-symbols-outlined text-5xl text-white/10">add_circle</span>
              <p className="text-[10px] font-space text-white/30 tracking-widest uppercase">
                INITIALIZE_FIRST_MISSION
              </p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
