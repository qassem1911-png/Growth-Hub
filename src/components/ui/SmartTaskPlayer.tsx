import React, { useState, useEffect, useRef, useCallback } from 'react'
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

interface SmartTaskPlayerProps {
  taskId: string
  videoId: string
  initialProgress: number
  isGuest: boolean
  themeColor: string
  onComplete: () => void
}

export default function SmartTaskPlayer({ 
  taskId, 
  videoId, 
  initialProgress, 
  isGuest, 
  themeColor,
  onComplete
}: SmartTaskPlayerProps) {
  const [player, setPlayer] = useState<YouTubePlayer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const { showToast } = useToast()
  const supabase = createClient()
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  // --- V25.1 HOTFIX: Mutable refs to avoid stale closures in beforeunload ---
  const playerRef = useRef<YouTubePlayer | null>(null)
  const isPlayingRef = useRef(false)

  // --- V25.1 HOTFIX: Guard flag to fix seek race condition ---
  const hasSeeked = useRef(false)

  // Keep refs in sync with state
  useEffect(() => { playerRef.current = player }, [player])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  // Configuration for the YouTube Iframe
  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      fs: 1,
    },
  }

  const saveProgress = useCallback(async (currentTime: number) => {
    if (isGuest) {
      localStorage.setItem(`growth_hub_video_progress_${taskId}`, currentTime.toString())
    } else {
      await supabase
        .from('tasks')
        .update({ video_progress: currentTime })
        .eq('id', taskId)
    }
  }, [isGuest, taskId, supabase])

  // --- V25.1 HOTFIX: Instant save helper using refs (safe for beforeunload) ---
  const saveCurrentTime = useCallback(() => {
    const p = playerRef.current
    if (p && isPlayingRef.current) {
      try {
        const currentTime = p.getCurrentTime()
        // Use synchronous localStorage write — guaranteed to flush before tab dies
        localStorage.setItem(`growth_hub_video_progress_${taskId}`, currentTime.toString())
        // Also fire async Supabase save (best-effort, may not complete)
        if (!isGuest) {
          supabase
            .from('tasks')
            .update({ video_progress: currentTime })
            .eq('id', taskId)
        }
      } catch {
        // Player may already be destroyed — silently ignore
      }
    }
  }, [taskId, isGuest, supabase])

  const onReady = (event: YouTubeEvent) => {
    const p = event.target
    setPlayer(p)
    // V25.1: We no longer seekTo here — it races with YouTube buffering.
    // The seek is deferred to the first PLAYING state in onStateChange.
  }

  // --- V25.1 HOTFIX: Unified onStateChange handles PLAYING seek + PAUSED instant save ---
  const onStateChange = (event: YouTubeEvent) => {
    const state = event.data
    const p = event.target

    // YouTube PlayerState constants (from YT.PlayerState)
    const PLAYING = 1
    const PAUSED = 2
    const ENDED = 0

    if (state === PLAYING) {
      setIsPlaying(true)

      // V25.1 FIX: Deferred auto-resume — only seek after YouTube is actively streaming
      if (!hasSeeked.current && initialProgress > 0) {
        p.seekTo(initialProgress, true)
        hasSeeked.current = true
        showToast('تم استئناف التشغيل من حيث توقفت', 'success')
      }
    } else if (state === PAUSED) {
      setIsPlaying(false)
      // V25.1 FIX: Instant save on pause — don't wait for the 5s interval
      saveProgress(p.getCurrentTime())
    } else if (state === ENDED) {
      setIsPlaying(false)
      saveProgress(0) // Reset progress on completion
      onComplete()
    }
  }

  // Polling loop to save progress every 5 seconds while playing
  useEffect(() => {
    if (isPlaying && player) {
      progressInterval.current = setInterval(() => {
        saveProgress(player.getCurrentTime())
      }, 5000)
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [isPlaying, player, saveProgress])

  // --- V25.1 HOTFIX: beforeunload listener — saves the instant the tab is killed ---
  useEffect(() => {
    window.addEventListener('beforeunload', saveCurrentTime)
    return () => {
      window.removeEventListener('beforeunload', saveCurrentTime)
      // Also save on component unmount (navigation within the SPA)
      saveCurrentTime()
    }
  }, [saveCurrentTime])

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl relative border" style={{ borderColor: `${themeColor}40` }}>
      {/* Decorative cyber border glow */}
      <div className="absolute inset-0 pointer-events-none z-10" style={{ boxShadow: `inset 0 0 20px ${themeColor}22` }} />
      
      <YouTube 
        videoId={videoId} 
        opts={opts} 
        onReady={onReady}
        onStateChange={onStateChange}
        className="w-full h-full absolute inset-0"
      />
    </div>
  )
}

