'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useGrowth } from '@/context/GrowthContext'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Sidebar({ isRTL = false }: { isRTL?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, t } = useGrowth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const MENU_ITEMS = [
    { icon: 'dashboard', label: t ? t('dashboard') : 'DASHBOARD', href: '/', shortcut: '01', exact: true },
    { icon: 'layers', label: t ? t('mission') : 'MISSION', href: '/tasks', shortcut: '02', exact: false },
    { icon: 'psychology', label: t ? t('brain') : 'BRAIN', href: '/notes', shortcut: '03', exact: false },
    { icon: 'military_tech', label: t ? t('achievements') : 'VAULT', href: '/achievements', shortcut: '04', exact: false },
  ]

  return (
    <>
      {/* Mobile Hamburger Toggle */}
      <button 
        onClick={() => setMobileOpen(!mobileOpen)}
        className={cn(
          "fixed top-4 z-[200] p-3 glass-panel border-white/10 text-white md:hidden transition-all",
          isRTL ? "left-4" : "right-4"
        )}
      >
        <span className="material-symbols-outlined">
          {mobileOpen ? 'close' : 'menu'}
        </span>
      </button>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[105] md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "w-72 bg-[#0D0D0D] h-screen fixed top-0 flex flex-col z-[110] border-y-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)] sidebar-target transition-transform duration-300 md:translate-x-0",
        isRTL ? "right-0 border-l border-white/5" : "left-0 border-r border-white/5",
        mobileOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full")
      )}>
      {/* Sidebar Header - Profile Sync */}
      <div className="pt-16 px-10 flex flex-col items-start gap-6 relative overflow-hidden group">
        <Link href="/settings" className="flex items-center gap-4 group/avatar">
           {profile?.avatar_url ? (
             <img 
               src={profile.avatar_url} 
               alt="Operator" 
               className="w-12 h-12 rounded-full border border-[#39FF14]/30 shadow-[0_0_10px_#39FF1433] group-hover/avatar:border-[#39FF14] transition-all" 
             />
           ) : (
             <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover/avatar:border-[#39FF14]/50 transition-all">
               <span className="material-symbols-outlined text-white/20">person</span>
             </div>
           )}
           <div className="flex flex-col">
              <span className="text-[9px] font-space text-[#39FF14] tracking-widest uppercase font-black opacity-40">OPERATOR_SYNC</span>
              <span className="text-sm font-space font-black text-white truncate max-w-[120px] group-hover/avatar:text-[#39FF14] transition-colors">
                {profile?.full_name ? profile.full_name.toUpperCase() : (t ? t('operator') : 'OPERATOR')}
              </span>
           </div>
        </Link>
        
        <h1 className="font-space font-black text-2xl tracking-tighter uppercase italic relative z-10 text-white">
          GROWTH<span className="text-[#39FF14]">_HUB</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-grow px-4 py-16 space-y-2">
        <h3 className="px-10 text-[9px] font-space tracking-[0.8em] text-white/20 uppercase mb-10 font-black">INTERFACE</h3>
        {MENU_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-5 p-4 px-10 rounded-sm transition-all duration-300 relative group overflow-hidden",
                isActive 
                  ? "bg-[#39FF14]/5 text-[#39FF14] border border-[#39FF14]/10" 
                  : "text-white/30 hover:text-white/80 border border-transparent hover:border-white/5 hover:bg-white/[0.02]"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-nav"
                  className="absolute left-0 w-1.5 h-1/2 bg-[#39FF14] shadow-[0_0_20px_#39FF14] rounded-r-full"
                />
              )}
              
              <span className={cn(
                "material-symbols-outlined transition-all duration-300 text-xl",
                isActive ? "text-[#39FF14]" : "group-hover:text-[#39FF14]/60"
              )}>
                {item.icon}
              </span>
              
              <span className={cn(
                "font-space text-[12px] tracking-[0.3em] font-black uppercase flex-grow",
                isActive ? "text-[#39FF14]" : ""
              )}>
                {item.label}
              </span>

              <span className="text-[10px] font-space text-white/10 group-hover:text-[#39FF14]/40 font-black">
                {item.shortcut}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-10 mt-auto">
        <Link 
          href="/settings" 
          onClick={() => setMobileOpen(false)}
          className="w-full flex items-center justify-start gap-4 p-5 glass-panel border-white/5 text-white/30 hover:text-[#39FF14] hover:border-[#39FF14]/20 hover:bg-[#39FF14]/5 rounded-sm transition-all font-space text-[11px] tracking-[0.4em] uppercase font-black mb-4"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
          SETTINGS
        </Link>
        <button 
          onClick={() => { handleLogout(); setMobileOpen(false); }}
          className="w-full flex items-center justify-start gap-4 p-5 border border-white/5 bg-white/5 text-white/20 hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/5 rounded-sm transition-all font-space text-[11px] tracking-[0.4em] uppercase font-black"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          {t ? t('exit') : 'EXIT'}
        </button>
      </div>
    </aside>
    </>
  )
}
