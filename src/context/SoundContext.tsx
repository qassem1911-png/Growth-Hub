'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'

interface SoundContextType {
  volume: number
  isMuted: boolean
  setVolume: (v: number) => void
  setIsMuted: (m: boolean) => void
  playBlip: () => void
  playSuccess: () => void
  playError: () => void
  playDeploy: () => void
  playNeuralLink: () => void
}

const SoundContext = createContext<SoundContextType | undefined>(undefined)

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [volume, setVolumeState] = useState(0.5)
  const [isMuted, setIsMutedState] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    // Load from local storage
    const savedVol = localStorage.getItem('tactical_volume')
    const savedMuted = localStorage.getItem('tactical_muted')
    if (savedVol !== null) setVolumeState(parseFloat(savedVol))
    if (savedMuted !== null) setIsMutedState(savedMuted === 'true')
  }, [])

  const setVolume = (v: number) => {
    setVolumeState(v)
    localStorage.setItem('tactical_volume', v.toString())
  }

  const setIsMuted = (m: boolean) => {
    setIsMutedState(m)
    localStorage.setItem('tactical_muted', m.toString())
  }

  const getAudioContext = () => {
    if (typeof window === 'undefined') return null
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }

  // Helper to play synthesized sounds
  const playTone = (
    type: OscillatorType,
    freq1: number,
    freq2: number,
    duration: number,
    volMultiplier = 1
  ) => {
    if (isMuted || volume === 0) return
    const ctx = getAudioContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    
    // Frequency ramp for sci-fi effect
    osc.frequency.setValueAtTime(freq1, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + duration)

    // Volume envelope
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume * volMultiplier, ctx.currentTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + duration)
  }

  // 1. Tactical Blip (Nav/Tabs)
  const playBlip = () => playTone('square', 800, 1200, 0.1, 0.15)

  // 2. Success Chime (XP/Completion)
  const playSuccess = () => {
    if (isMuted || volume === 0) return
    playTone('sine', 440, 880, 0.3, 0.3)
    setTimeout(() => playTone('sine', 880, 1760, 0.5, 0.3), 150)
  }

  // 3. System Alert (Error/Full)
  const playError = () => {
    if (isMuted || volume === 0) return
    playTone('sawtooth', 150, 100, 0.4, 0.4)
    setTimeout(() => playTone('sawtooth', 150, 100, 0.4, 0.4), 150)
  }

  // 4. Mission Initialize (Power-up)
  const playDeploy = () => playTone('sawtooth', 200, 1200, 0.8, 0.3)

  // 5. Neural Link (AI Modal)
  const playNeuralLink = () => {
    if (isMuted || volume === 0) return
    const ctx = getAudioContext()
    if (!ctx) return
    
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 1.5)
    
    // Pulsing volume
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume * 0.2, ctx.currentTime + 0.5)
    gain.gain.linearRampToValueAtTime(volume * 0.05, ctx.currentTime + 1.0)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0)
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.start()
    osc.stop(ctx.currentTime + 2.0)
  }

  return (
    <SoundContext.Provider value={{
      volume,
      isMuted,
      setVolume,
      setIsMuted,
      playBlip,
      playSuccess,
      playError,
      playDeploy,
      playNeuralLink
    }}>
      {children}
    </SoundContext.Provider>
  )
}

export function useSound() {
  const context = useContext(SoundContext)
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider')
  }
  return context
}
