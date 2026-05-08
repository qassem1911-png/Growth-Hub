'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface ProgressCupProps {
  percentage: number // 0 to 100
  onComplete?: () => void
  isInRedZone?: boolean
}

export default function ProgressCup({ percentage, onComplete, isInRedZone }: ProgressCupProps) {
  const [prevPercentage, setPrevPercentage] = useState(0)

  useEffect(() => {
    if (percentage >= 100 && prevPercentage < 100) {
      onComplete?.()
    }
    setPrevPercentage(percentage)
  }, [percentage, prevPercentage, onComplete])

  // Map 0-100 to wave position
  // 100% means the wave is at the top
  const liquidLevel = 100 - (percentage || 0)

  return (
    <div className="relative w-48 h-64 flex flex-col items-center justify-center">
      <motion.div 
        className="relative w-40 h-52 overflow-hidden border glass rounded-b-[40px] rounded-t-[10px]"
        style={{
          borderColor: isInRedZone ? '#FF0000' : 'rgba(255,255,255,0.1)',
          boxShadow: isInRedZone ? '0 0 30px rgba(255,0,0,0.2)' : '0 0 30px rgba(57,255,20,0.1)'
        }}
        animate={isInRedZone ? {
          boxShadow: [
            '0 0 20px rgba(255,0,0,0.2)',
            '0 0 40px rgba(255,0,0,0.4)',
            '0 0 20px rgba(255,0,0,0.2)',
          ]
        } : {}}
        transition={isInRedZone ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
      >
        {/* Liquid Body */}
        <motion.div 
          className="absolute inset-0 z-10"
          initial={{ y: '100%' }}
          animate={{ y: `${liquidLevel}%` }}
          transition={{ duration: 2, ease: "easeInOut" }}
        >
          {/* Waves */}
          <div className="liquid-wave" style={{ top: '-150%' }} />
          <div className="liquid-wave-2" style={{ top: '-145%' }} />
          
          {/* Solid fill */}
          <div 
            className="absolute inset-0 opacity-30 transition-colors duration-500" 
            style={{ 
              backgroundColor: isInRedZone ? '#FF0000' : '#39FF14',
              boxShadow: isInRedZone ? 'inset 0 0 40px rgba(255,0,0,0.4)' : 'inset 0 0 40px rgba(57,255,20,0.4)'
            }}
          />
          
          {/* Glow at the surface */}
          <div 
            className="absolute top-0 left-0 w-full h-1 transition-colors duration-500" 
            style={{ 
              backgroundColor: isInRedZone ? '#FF0000' : '#39FF14',
              boxShadow: isInRedZone ? '0 0 15px #FF0000' : '0 0 15px #39FF14'
            }}
          />
        </motion.div>

        {/* Scanlines on the cup itself */}
        <div className="absolute inset-0 pointer-events-none opacity-20 scanlines z-30" />
        
        {/* Highlight/Reflections */}
        <div className="absolute top-4 left-4 w-1 h-32 bg-white/10 rounded-full blur-[1px] z-40" />
      </motion.div>

      <div className="mt-8 text-center relative">
        <div 
          className="font-space text-5xl font-black tracking-tighter transition-colors duration-500"
          style={{ color: isInRedZone ? '#FF0000' : '#39FF14' }}
        >
          {Math.round(percentage || 0)}<span className="text-sm opacity-40 ml-1">%</span>
        </div>
        <p className="text-[10px] font-space text-foreground/40 uppercase tracking-[0.5em] mt-3 font-bold">
          XP_LOAD_STATUS
        </p>
        
        {/* Small decorative blip */}
        <div 
          className="absolute -top-2 -right-4 w-1.5 h-1.5 rounded-full animate-ping transition-colors duration-500" 
          style={{ backgroundColor: isInRedZone ? '#FF0000' : '#39FF14' }}
        />
      </div>

      {/* Bubble particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full blur-[1px] transition-colors duration-500"
            style={{ 
              backgroundColor: isInRedZone ? 'rgba(255,0,0,0.4)' : 'rgba(57,255,20,0.4)',
              width: 10, 
              height: 10,
              left: `${30 + (i * 10)}%`,
              bottom: '20%'
            }}
            animate={{
              bottom: ['20%', '80%'],
              opacity: [0, 0.8, 0],
              scale: [0.5, 1.2, 0.5]
            }}
            transition={{
              duration: 2 + i,
              repeat: Infinity,
              delay: i
            }}
          />
        ))}
      </div>
    </div>
  )
}
