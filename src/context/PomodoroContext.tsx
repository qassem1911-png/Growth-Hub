'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/Toast'
import { useSound } from '@/context/SoundContext'

type SessionType = 'FOCUS' | 'BREAK'

interface PomodoroContextType {
  timeRemaining: number
  isActive: boolean
  isPaused: boolean
  sessionType: SessionType
  taskName: string
  isMinimized: boolean
  isInitialized: boolean
  focusDuration: number
  breakDuration: number
  startFocus: (taskName: string) => void
  startTimer: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  toggleMinimize: () => void
  updateConfig: (focus: number, breakTime: number) => void
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined)

const FOCUS_TIME = 25 * 60
const BREAK_TIME = 5 * 60

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [focusDuration, setFocusDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)
  const [timeRemaining, setTimeRemaining] = useState(25 * 60)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [sessionType, setSessionType] = useState<SessionType>('FOCUS')
  const [taskName, setTaskName] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const { showToast } = useToast()
  const { playSuccess, playBlip } = useSound()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Load from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('pomodoro_config')
    if (savedConfig) {
      const { focus, break: breakTime } = JSON.parse(savedConfig)
      setFocusDuration(focus)
      setBreakDuration(breakTime)
      if (!isActive) setTimeRemaining(focus * 60)
    }

    const saved = localStorage.getItem('pomodoro_session')
    if (saved) {
      const data = JSON.parse(saved)
      const now = Date.now()
      const elapsed = Math.floor((now - data.startTime) / 1000)
      
      if (!data.isPaused && data.isActive) {
        const remaining = data.initialTime - elapsed
        if (remaining > 0) {
          setTimeRemaining(remaining)
          setIsActive(true)
          setIsInitialized(true)
          setSessionType(data.sessionType)
          setTaskName(data.taskName)
        }
      } else {
        setTimeRemaining(data.timeRemaining)
        setIsActive(data.isActive)
        setIsPaused(data.isPaused)
        setIsInitialized(data.isInitialized || data.isActive)
        setSessionType(data.sessionType)
        setTaskName(data.taskName)
      }
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (isInitialized) {
      const data = {
        timeRemaining,
        isActive,
        isPaused,
        isInitialized,
        sessionType,
        taskName,
        startTime: Date.now(),
        initialTime: timeRemaining
      }
      localStorage.setItem('pomodoro_session', JSON.stringify(data))
    } else {
      localStorage.removeItem('pomodoro_session')
    }
  }, [timeRemaining, isActive, isPaused, isInitialized, sessionType, taskName])

  useEffect(() => {
    if (isActive && !isPaused && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)
    } else if (timeRemaining === 0) {
      handleSessionComplete()
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isActive, isPaused, timeRemaining])

  const handleSessionComplete = () => {
    playSuccess()
    if (sessionType === 'FOCUS') {
      showToast('FOCUS_SESSION_COMPLETE // TAKE A BREAK', 'success')
      setSessionType('BREAK')
      setTimeRemaining(breakDuration * 60)
    } else {
      showToast('BREAK_COMPLETE // RESUME?', 'info')
      setSessionType('FOCUS')
      setTimeRemaining(focusDuration * 60)
      setIsActive(false) // Wait for user to resume
    }
  }

  const startFocus = (name: string) => {
    setTaskName(name)
    setSessionType('FOCUS')
    setTimeRemaining(focusDuration * 60)
    setIsInitialized(true)
    setIsActive(false)
    setIsPaused(false)
    setIsMinimized(false)
    playBlip()
  }

  const startTimer = () => {
    setIsActive(true)
    setIsPaused(false)
    playBlip()
  }

  const pause = () => {
    setIsPaused(true)
    playBlip()
  }

  const resume = () => {
    setIsPaused(false)
    playBlip()
  }

  const stop = () => {
    setIsActive(false)
    setIsPaused(false)
    setIsInitialized(false)
    setTimeRemaining(focusDuration * 60)
    setTaskName('')
    playBlip()
  }

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
    playBlip()
  }

  const updateConfig = (focus: number, breakTime: number) => {
    setFocusDuration(focus)
    setBreakDuration(breakTime)
    localStorage.setItem('pomodoro_config', JSON.stringify({ focus, break: breakTime }))
    if (!isActive) {
      setTimeRemaining(focus * 60)
    }
    playBlip()
  }

  return (
    <PomodoroContext.Provider value={{
      timeRemaining, isActive, isPaused, sessionType, taskName, isMinimized, isInitialized,
      focusDuration, breakDuration,
      startFocus, startTimer, pause, resume, stop, toggleMinimize, updateConfig
    }}>
      {children}
    </PomodoroContext.Provider>
  )
}

export function usePomodoro() {
  const context = useContext(PomodoroContext)
  if (!context) throw new Error('usePomodoro must be used within PomodoroProvider')
  return context
}
