'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import Tutorial from '@/components/ui/Tutorial'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { motion } from 'framer-motion'

export default function Dashboard() {
  // 1. ALL HOOKS AT THE TOP (No conditional returns before this)
  const { profile, calculateAccountability, mounted } = useGrowth()
  const router = useRouter()
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (mounted) fetchDashboardMissions()
  }, [mounted])

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

  // Gate content ONLY after all hooks are declared
  if (!mounted) return null

  return (
    <Shell syncedMissions={missions} onMissionsRefresh={fetchDashboardMissions}>
      <Tutorial />
      
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 md:p-12 space-y-16">
        
        {/* CENTERED HEADER SECTION */}
        <div className="flex flex-col items-center text-center space-y-4">
           {/* Visual Decoration */}
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
          
          <div className="flex items-center gap-4 text-[10px] font-space text-white/40 tracking-[0.6em] uppercase font-black">
            <span>CORE_STATION // {profile?.full_name?.toUpperCase() || 'OPERATOR'}</span>
          </div>
        </div>

        {/* DYNAMIC MISSION GRID (NO PLACEHOLDERS) */}
        <div className="flex flex-wrap justify-center gap-16 md:gap-24 items-end cells-target">
           {missions.map((mission, idx) => (
             <motion.div
               key={mission.id}
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               transition={{ delay: idx * 0.1 }}
               className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
               onClick={() => router.push(`/tasks/${mission.id}`)}
             >
                <EnergyCell 
                  mission={mission}
                  onRefresh={fetchDashboardMissions}
                />
             </motion.div>
           ))}

           {missions.length === 0 && !loading && (
             <div 
               onClick={() => router.push('/tasks')}
               className="p-12 border border-dashed border-white/10 rounded-sm text-center space-y-4 cursor-pointer hover:border-neon-green/30 transition-all"
             >
               <span className="material-symbols-outlined text-4xl text-white/10">add_circle</span>
               <p className="text-[10px] font-space text-white/30 tracking-widest uppercase">INITIALIZE_FIRST_MISSION</p>
             </div>
           )}
        </div>
      </div>
    </Shell>
  )
}
