'use client'

import { motion } from 'framer-motion'

interface EnergyCellProps {
  percentage: number
  label: string
  subLabel?: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  isInRedZone?: boolean
}

const COLORS = {
  green: {
    primary: '#39FF14',
    glow: 'rgba(57, 255, 20, 0.35)',
    glowSoft: 'rgba(57, 255, 20, 0.08)',
    text: 'text-[#39FF14]',
    border: '#39FF14',
  },
  blue: {
    primary: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.35)',
    glowSoft: 'rgba(0, 240, 255, 0.08)',
    text: 'text-[#00F0FF]',
    border: '#00F0FF',
  },
  purple: {
    primary: '#b600f8',
    glow: 'rgba(182, 0, 248, 0.35)',
    glowSoft: 'rgba(182, 0, 248, 0.08)',
    text: 'text-[#b600f8]',
    border: '#b600f8',
  },
  red: {
    primary: '#FF0000',
    glow: 'rgba(255, 0, 0, 0.35)',
    glowSoft: 'rgba(255, 0, 0, 0.08)',
    text: 'text-[#FF0000]',
    border: '#FF0000',
  },
}

const SIZES = {
  sm: { w: 80, h: 120 },
  md: { w: 100, h: 152 },
  lg: { w: 128, h: 192 },
}

export default function EnergyCell({ percentage, label, subLabel, color, size = 'md', isInRedZone }: EnergyCellProps) {
  const config = isInRedZone ? COLORS.red : (COLORS[color as keyof typeof COLORS] || COLORS.green)
  const { w, h } = SIZES[size]
  const clampedPct = Math.max(0, Math.min(100, percentage))
  const fillHeight = (clampedPct / 100) * h

  return (
    <div className="flex flex-col items-center gap-6 group">
      {/* Cell Body */}
      <motion.div
        className="relative overflow-hidden"
        style={{
          width: w,
          height: h,
          background: 'transparent',
          border: `1px solid ${config.border}`,
          borderRadius: '4px 4px 16px 16px',
          boxShadow: `0 0 20px ${config.glow}, inset 0 0 30px ${config.glowSoft}`,
        }}
        animate={isInRedZone ? {
          boxShadow: [
            `0 0 20px ${config.glow}, inset 0 0 30px ${config.glowSoft}`,
            `0 0 40px ${config.glow}, inset 0 0 50px ${config.glowSoft}`,
            `0 0 20px ${config.glow}, inset 0 0 30px ${config.glowSoft}`,
          ]
        } : {}}
        transition={isInRedZone ? {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        } : {}}
      >
        {/* Liquid fill — rises from bottom */}
        <motion.div
          className="absolute bottom-0 left-0 w-full"
          initial={{ height: 0 }}
          animate={{ height: fillHeight }}
          transition={{ duration: 2.2, ease: 'easeInOut' }}
          style={{
            background: `linear-gradient(to top, ${config.glow}, ${config.glowSoft})`,
            boxShadow: `0 0 20px ${config.glow}`,
          }}
        >
          {/* Glowing surface line */}
          <div
            className="absolute top-0 left-0 w-full"
            style={{
              height: '2px',
              background: config.primary,
              boxShadow: `0 0 12px ${config.primary}, 0 0 30px ${config.glow}`,
            }}
          />
        </motion.div>

        {/* Inner grid lines for depth */}
        {[25, 50, 75].map((tick) => (
          <div
            key={tick}
            className="absolute left-0 w-full"
            style={{
              bottom: `${tick}%`,
              height: '1px',
              background: `${config.primary}18`,
            }}
          />
        ))}

        {/* Corner reflection */}
        <div
          className="absolute top-3 left-2 w-[1px] rounded-full"
          style={{
            height: h * 0.4,
            background: 'rgba(255,255,255,0.08)',
          }}
        />

        {/* Percentage overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span
            className="font-space font-black text-lg tracking-tighter"
            style={{
              color: config.primary,
              textShadow: `0 0 20px ${config.primary}`,
              mixBlendMode: 'screen',
            }}
          >
            {Math.round(clampedPct)}%
          </span>
        </div>
      </motion.div>

      {/* Labels */}
      <div className="text-center space-y-1">
        <p className={`text-[10px] font-space font-black tracking-[0.3em] uppercase ${config.text}`}>
          {label}
        </p>
        {subLabel && (
          <p className="text-[9px] font-space text-foreground/30 uppercase tracking-widest font-black max-w-[120px] truncate">
            {subLabel}
          </p>
        )}
      </div>
    </div>
  )
}
