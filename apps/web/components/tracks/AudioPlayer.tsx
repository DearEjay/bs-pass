'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Loader2 } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'
import { useAudioPlayerStore } from '@/hooks/useAudioPlayer'

export interface AudioMarker {
  id: string
  timestamp: number
  isActive?: boolean
}

interface AudioPlayerProps {
  trackId: string
  audioUrl: string
  markers?: AudioMarker[]
  autoPlay?: boolean
  onTimeUpdate?: (time: number) => void
  onEnded?: () => void
}

export function AudioPlayer({
  trackId,
  audioUrl,
  markers = [],
  autoPlay = false,
  onTimeUpdate,
  onEnded,
}: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsRef = useRef<any>(null)
  const autoPlayRef = useRef(autoPlay)
  autoPlayRef.current = autoPlay

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const { activeTrackId, setActiveTrackId } = useAudioPlayerStore()

  // Pause when another track becomes active
  useEffect(() => {
    if (activeTrackId !== trackId && wsRef.current?.isPlaying()) {
      wsRef.current.pause()
    }
  }, [activeTrackId, trackId])

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return

    let cancelled = false
    setIsLoading(true)
    setCurrentTime(0)
    setDuration(0)

    import('wavesurfer.js').then(({ default: WaveSurfer }) => {
      if (cancelled || !containerRef.current) return

      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: 'rgba(156, 163, 175, 0.35)',
        progressColor: 'rgba(99, 102, 241, 0.75)',
        cursorColor: 'rgb(99, 102, 241)',
        height: 52,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        url: audioUrl,
        interact: true,
      })

      ws.on('ready', (dur: number) => {
        setDuration(dur)
        setIsLoading(false)
        if (autoPlayRef.current) {
          setActiveTrackId(trackId)
          ws.play()
        }
      })
      ws.on('play', () => setIsPlaying(true))
      ws.on('pause', () => setIsPlaying(false))
      ws.on('timeupdate', (t: number) => {
        setCurrentTime(t)
        onTimeUpdate?.(t)
      })
      ws.on('finish', () => {
        setIsPlaying(false)
        onEnded?.()
      })

      wsRef.current = ws
    })

    return () => {
      cancelled = true
      if (wsRef.current) {
        wsRef.current.destroy()
        wsRef.current = null
      }
    }
    // onTimeUpdate / onEnded are intentionally omitted to avoid re-creating
    // WaveSurfer on every render; callers should use stable refs or useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, trackId])

  function togglePlay() {
    if (!wsRef.current || isLoading) return
    if (wsRef.current.isPlaying()) {
      wsRef.current.pause()
    } else {
      setActiveTrackId(trackId)
      wsRef.current.play()
    }
  }

  return (
    <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
      <div className="flex items-center gap-2.5">
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity shrink-0 disabled:opacity-40"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : isPlaying ? (
            <Pause size={12} fill="currentColor" />
          ) : (
            <Play size={12} fill="currentColor" className="translate-x-px" />
          )}
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatTime(currentTime)}
          <span className="mx-0.5 opacity-40">/</span>
          {formatTime(duration)}
        </span>
      </div>

      {/* Waveform with comment markers overlaid */}
      <div className="relative">
        <div ref={containerRef} className="w-full" />

        {/* Loading skeleton over the waveform area */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-accent/30 rounded">
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Comment timestamp markers */}
        {!isLoading && duration > 0 && markers.map(m => (
          <div
            key={m.id}
            title={formatTime(m.timestamp)}
            className={cn(
              'absolute top-0 h-full w-px pointer-events-none transition-opacity',
              m.isActive ? 'bg-yellow-400' : 'bg-yellow-400/60',
            )}
            style={{ left: `${Math.min(100, (m.timestamp / duration) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  )
}
