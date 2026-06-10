'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Play, Pause, Loader2 } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'
import { useAudioPlayerStore } from '@/hooks/useAudioPlayer'

export interface AudioMarker {
  id: string
  timestamp: number
  body?: string
  authorName?: string
  authorAvatarUrl?: string | null
}

export interface AudioPlayerHandle {
  seekTo: (seconds: number) => void
}

interface AudioPlayerProps {
  trackId: string
  audioUrl: string
  markers?: AudioMarker[]
  autoPlay?: boolean
  onTimeUpdate?: (time: number) => void
  onEnded?: () => void
}

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  function AudioPlayer({ trackId, audioUrl, markers = [], autoPlay = false, onTimeUpdate, onEnded }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wsRef = useRef<any>(null)
    const autoPlayRef = useRef(autoPlay)
    autoPlayRef.current = autoPlay

    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isLoading, setIsLoading] = useState(true)

    // Comment pill queue
    const queueRef = useRef<string[]>([])
    const displayedIdRef = useRef<string | null>(null)
    const showTimerRef = useRef<ReturnType<typeof setTimeout>>()
    const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>()
    const [displayedId, setDisplayedId] = useState<string | null>(null)
    const [isFading, setIsFading] = useState(false)

    const prevActiveRef = useRef(new Set<string>())

    const { activeTrackId, setActiveTrackId } = useAudioPlayerStore()

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (wsRef.current && duration > 0) {
          wsRef.current.setTime(Math.max(0, Math.min(seconds, duration)))
        }
      },
    }), [duration])

    const advanceQueue = useCallback(() => {
      clearTimeout(showTimerRef.current)
      clearTimeout(fadeTimerRef.current)
      if (queueRef.current.length === 0) {
        displayedIdRef.current = null
        setDisplayedId(null)
        setIsFading(false)
        return
      }
      const next = queueRef.current.shift()!
      displayedIdRef.current = next
      setDisplayedId(next)
      setIsFading(false)
      // Show for 2.5s then fade out over 0.5s
      showTimerRef.current = setTimeout(() => {
        setIsFading(true)
        fadeTimerRef.current = setTimeout(advanceQueue, 500)
      }, 2500)
    }, [])

    const enqueueComment = useCallback((id: string) => {
      queueRef.current.push(id)
      if (!displayedIdRef.current) advanceQueue()
    }, [advanceQueue])

    // Detect when playback enters a comment's window and enqueue it
    const activeKey = markers
      .filter(m => Math.abs(currentTime - m.timestamp) < 1.5)
      .map(m => m.id)
      .sort()
      .join(',')

    useEffect(() => {
      const nowActive = new Set(activeKey ? activeKey.split(',') : [])
      for (const id of nowActive) {
        if (!prevActiveRef.current.has(id)) enqueueComment(id)
      }
      prevActiveRef.current = nowActive
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeKey])

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
      // Reset comment queue on new track
      clearTimeout(showTimerRef.current)
      clearTimeout(fadeTimerRef.current)
      queueRef.current = []
      displayedIdRef.current = null
      setDisplayedId(null)
      setIsFading(false)
      prevActiveRef.current = new Set()

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioUrl, trackId])

    useEffect(() => () => {
      clearTimeout(showTimerRef.current)
      clearTimeout(fadeTimerRef.current)
    }, [])

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

        {/* Waveform — pb-7 reserves space below the bars for avatar bubbles */}
        <div className="relative pb-5">
          <div ref={containerRef} className="w-full" />

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-accent/30 rounded">
              <Loader2 size={14} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Avatar bubbles — positioned along the bottom edge of the waveform */}
          {!isLoading && duration > 0 && markers.map(m => {
            const leftPct = Math.min(98, Math.max(2, (m.timestamp / duration) * 100))
            const isDisplayed = displayedId === m.id
            const flipLeft = leftPct > 55

            return (
              <div
                key={m.id}
                className="absolute bottom-1 -translate-x-1/2 z-10 group"
                style={{ left: `${leftPct}%` }}
              >
                {/* Avatar */}
                <AvatarBubble
                  name={m.authorName}
                  avatarUrl={m.authorAvatarUrl}
                  isActive={isDisplayed}
                />

                {/* Comment pill — right of avatar (or left if near right edge) */}
                {(m.body || m.authorName) && (
                  <div
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 pointer-events-none z-20 transition-opacity duration-500',
                      flipLeft ? 'right-full mr-2' : 'left-full ml-2',
                      // Always visible on hover; auto-visible when queued
                      isDisplayed
                        ? isFading ? 'opacity-0' : 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100',
                    )}
                  >
                    <div className="flex items-center gap-1.5 bg-zinc-900 rounded-full pl-1.5 pr-2.5 py-1 shadow-lg whitespace-nowrap">
                      <AvatarBubble
                        name={m.authorName}
                        avatarUrl={m.authorAvatarUrl}
                        size={14}
                      />
                      {m.authorName && (
                        <span className="text-[11px] font-semibold text-white">{m.authorName}</span>
                      )}
                      {m.body && (
                        <span className="text-[11px] text-zinc-400 max-w-[160px] truncate">{m.body}</span>
                      )}
                      <span className="text-[9px] text-zinc-600 tabular-nums">{formatTime(m.timestamp)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)

// Tiny helper so we don't repeat avatar logic
function AvatarBubble({
  name,
  avatarUrl,
  isActive,
  size = 20,
}: {
  name?: string
  avatarUrl?: string | null
  isActive?: boolean
  size?: number
}) {
  const [imgError, setImgError] = useState(false)
  const initial = (name?.[0] ?? '?').toUpperCase()

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center overflow-hidden select-none transition-all shadow-sm shrink-0',
        isActive ? 'ring-2 ring-primary/50 scale-110' : '',
      )}
      style={{ width: size, height: size }}
    >
      {avatarUrl && !imgError ? (
        <img
          src={avatarUrl}
          alt={name ?? ''}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center bg-zinc-500 text-white font-bold"
          style={{ fontSize: size * 0.45 }}
        >
          {initial}
        </div>
      )}
    </div>
  )
}
