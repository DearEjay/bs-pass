'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, Loader2, Link2, Link2Off, X } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'

interface MiniPlayerProps {
  label: string
  url: string
  syncedTimeRef: React.MutableRefObject<number | null>
  isSynced: boolean
  isLeader: boolean
  onPlay: (seekTo: number) => void
  onPause: () => void
  onTimeUpdate: (t: number) => void
  externalPlay: boolean
  externalSeek: number | null
}

function MiniPlayer({
  label,
  url,
  syncedTimeRef,
  isSynced,
  isLeader,
  onPlay,
  onPause,
  onTimeUpdate,
  externalPlay,
  externalSeek,
}: MiniPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsRef = useRef<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const suppressSyncRef = useRef(false)

  // Seek from external (sync from leader)
  useEffect(() => {
    if (externalSeek === null || !wsRef.current) return
    suppressSyncRef.current = true
    wsRef.current.setTime(Math.max(0, Math.min(externalSeek, duration)))
    setTimeout(() => { suppressSyncRef.current = false }, 100)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSeek])

  // Play/pause from external (sync from leader)
  useEffect(() => {
    if (!wsRef.current || isLoading) return
    if (externalPlay && !wsRef.current.isPlaying()) wsRef.current.play()
    if (!externalPlay && wsRef.current.isPlaying()) wsRef.current.pause()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPlay])

  useEffect(() => {
    if (!containerRef.current || !url) return
    let cancelled = false
    setIsLoading(true)
    setCurrentTime(0)
    setDuration(0)

    import('wavesurfer.js').then(({ default: WaveSurfer }) => {
      if (cancelled || !containerRef.current) return
      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: label === 'A' ? 'rgba(156, 163, 175, 0.35)' : 'rgba(156, 163, 175, 0.25)',
        progressColor: label === 'A' ? 'rgba(99, 102, 241, 0.75)' : 'rgba(34, 197, 94, 0.75)',
        cursorColor: label === 'A' ? 'rgb(99, 102, 241)' : 'rgb(34, 197, 94)',
        height: 44,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        url,
        interact: true,
      })
      ws.on('ready', (dur: number) => { setDuration(dur); setIsLoading(false) })
      ws.on('play', () => setIsPlaying(true))
      ws.on('pause', () => setIsPlaying(false))
      ws.on('timeupdate', (t: number) => {
        setCurrentTime(t)
        onTimeUpdate(t)
        if (isSynced && isLeader && !suppressSyncRef.current) {
          syncedTimeRef.current = t
        }
      })
      wsRef.current = ws
    })

    return () => {
      cancelled = true
      wsRef.current?.destroy()
      wsRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  function togglePlay() {
    if (!wsRef.current || isLoading) return
    if (wsRef.current.isPlaying()) {
      wsRef.current.pause()
      onPause()
    } else {
      if (isSynced) onPlay(syncedTimeRef.current ?? currentTime)
      else wsRef.current.play()
    }
  }

  const color = label === 'A' ? 'bg-primary' : 'bg-emerald-500'

  return (
    <div className="flex items-start gap-3 px-3 py-2">
      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5', color)}>
        {label}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-card border border-border hover:bg-accent transition-colors disabled:opacity-40 shrink-0"
          >
            {isLoading ? (
              <Loader2 size={10} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={9} fill="currentColor" />
            ) : (
              <Play size={9} fill="currentColor" className="translate-x-px" />
            )}
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatTime(currentTime)}<span className="mx-0.5 opacity-40">/</span>{formatTime(duration)}
          </span>
        </div>
        <div className="relative">
          <div ref={containerRef} className="w-full" />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-full bg-muted/30 animate-pulse rounded" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface TrackABPlayerProps {
  versionA: { url: string; label: string }
  versionB: { url: string; label: string }
  onClose: () => void
}

export function TrackABPlayer({ versionA, versionB, onClose }: TrackABPlayerProps) {
  const [synced, setSynced] = useState(true)
  const [leaderPlaying, setLeaderPlaying] = useState(false)
  const [followerSeek, setFollowerSeek] = useState<number | null>(null)
  const syncedTimeRef = useRef<number | null>(null)
  const seekTickRef = useRef(0)

  // When leader timeupdate fires in synced mode, throttle-push seeks to follower
  const handleLeaderTime = useCallback((t: number) => {
    if (!synced) return
    seekTickRef.current++
    if (seekTickRef.current % 10 === 0) {
      setFollowerSeek(t)
    }
  }, [synced])

  function handleLeaderPlay(seekTo: number) {
    syncedTimeRef.current = seekTo
    setFollowerSeek(seekTo)
    setLeaderPlaying(true)
  }

  function handleLeaderPause() {
    setLeaderPlaying(false)
  }

  return (
    <div className="border-t border-border/50 bg-accent/5">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-xs font-medium text-muted-foreground">A / B Comparison</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSynced(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 text-xs rounded border transition-colors',
              synced
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {synced ? <Link2 size={11} /> : <Link2Off size={11} />}
            {synced ? 'Synced' : 'Independent'}
          </button>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="divide-y divide-border/30">
        <div>
          <p className="px-3 pt-2 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{versionA.label}</p>
          <MiniPlayer
            label="A"
            url={versionA.url}
            syncedTimeRef={syncedTimeRef}
            isSynced={synced}
            isLeader={true}
            onPlay={handleLeaderPlay}
            onPause={handleLeaderPause}
            onTimeUpdate={handleLeaderTime}
            externalPlay={false}
            externalSeek={null}
          />
        </div>
        <div>
          <p className="px-3 pt-2 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{versionB.label}</p>
          <MiniPlayer
            label="B"
            url={versionB.url}
            syncedTimeRef={syncedTimeRef}
            isSynced={synced}
            isLeader={false}
            onPlay={() => {}}
            onPause={() => {}}
            onTimeUpdate={() => {}}
            externalPlay={leaderPlaying}
            externalSeek={followerSeek}
          />
        </div>
      </div>
    </div>
  )
}
