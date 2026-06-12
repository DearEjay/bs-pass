'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, Loader2, Link2, Link2Off, X, Volume2, VolumeX } from 'lucide-react'
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
  muted: boolean
  resetSignal: number
  showMuteToggle?: boolean
  onMuteToggle?: () => void
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
  muted,
  resetSignal,
  showMuteToggle,
  onMuteToggle,
}: MiniPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsRef = useRef<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const suppressSyncRef = useRef(false)
  const prevResetRef = useRef(resetSignal)

  // Apply muted state to wavesurfer whenever it changes
  useEffect(() => {
    wsRef.current?.setVolume(muted ? 0 : 1)
  }, [muted])

  // Reset: stop + seek to 0 when signal increments
  useEffect(() => {
    if (resetSignal === prevResetRef.current) return
    prevResetRef.current = resetSignal
    if (!wsRef.current) return
    wsRef.current.pause()
    wsRef.current.setTime(0)
    setCurrentTime(0)
  }, [resetSignal])

  // Seek from external (follower sync)
  useEffect(() => {
    if (externalSeek === null || !wsRef.current) return
    suppressSyncRef.current = true
    wsRef.current.setTime(Math.max(0, Math.min(externalSeek, duration)))
    setTimeout(() => { suppressSyncRef.current = false }, 100)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSeek])

  // Play/pause driven by parent state
  useEffect(() => {
    if (!wsRef.current || isLoading) return
    if (externalPlay && !wsRef.current.isPlaying()) wsRef.current.play()
    if (!externalPlay && wsRef.current.isPlaying()) wsRef.current.pause()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPlay, isLoading])

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
      ws.on('ready', (dur: number) => {
        setDuration(dur)
        setIsLoading(false)
        // Apply initial muted state from closure (captured at effect-run time = mount)
        ws.setVolume(muted ? 0 : 1)
      })
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
      // Pause directly then notify parent to update state
      wsRef.current.pause()
      onPause()
    } else {
      // Route through parent so state stays authoritative; parent drives externalPlay
      onPlay(isSynced ? (syncedTimeRef.current ?? currentTime) : currentTime)
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
          {/* In synced mode, only the leader (A) controls playback */}
          {(!isSynced || isLeader) && (
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
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatTime(currentTime)}<span className="mx-0.5 opacity-40">/</span>{formatTime(duration)}
          </span>
          {showMuteToggle && onMuteToggle && (
            <button
              onClick={onMuteToggle}
              className={cn(
                'ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors',
                muted
                  ? 'text-muted-foreground hover:text-foreground bg-muted/50'
                  : 'text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20',
              )}
              title={muted ? 'Unmute Version B' : 'Mute Version B'}
            >
              {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
              {muted ? 'Unmute' : 'Mute'}
            </button>
          )}
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

  // Synced mode: shared play state, A is leader, B follows
  // Starts as true so both auto-start when waveforms are ready
  const [playing, setPlaying] = useState(true)
  // soloA: true = A audible / B muted; false = B audible / A muted
  const [soloA, setSoloA] = useState(true)

  // Independent mode: exclusive play — only one active at a time
  const [aIndepPlaying, setAIndepPlaying] = useState(false)
  const [bIndepPlaying, setBIndepPlaying] = useState(false)

  // Follower sync (synced mode only)
  const [followerSeek, setFollowerSeek] = useState<number | null>(null)
  const syncedTimeRef = useRef<number | null>(null)
  const seekTickRef = useRef(0)

  // Incrementing this tells both MiniPlayers to stop + seek to 0
  const [resetSignal, setResetSignal] = useState(0)

  const handleLeaderTime = useCallback((t: number) => {
    if (!synced) return
    seekTickRef.current++
    if (seekTickRef.current % 10 === 0) setFollowerSeek(t)
  }, [synced])

  // Synced mode: A's play/pause controls both
  function handleLeaderPlay(seekTo: number) {
    syncedTimeRef.current = seekTo
    setFollowerSeek(seekTo)
    setPlaying(true)
  }

  function handleLeaderPause() {
    setPlaying(false)
  }

  // Independent mode: A plays → stop B (exclusive)
  function handleAIndepPlay(_seekTo: number) {
    setAIndepPlaying(true)
    setBIndepPlaying(false)
  }

  function handleAIndepPause() {
    setAIndepPlaying(false)
  }

  // Independent mode: B plays → stop A (exclusive)
  function handleBIndepPlay(_seekTo: number) {
    setBIndepPlaying(true)
    setAIndepPlaying(false)
  }

  function handleBIndepPause() {
    setBIndepPlaying(false)
  }

  function toggleSync() {
    const goingIndependent = synced
    if (goingIndependent) {
      // Turning sync off: immediately stop both and reset to 0:00
      setPlaying(false)
      setAIndepPlaying(false)
      setBIndepPlaying(false)
      setResetSignal(s => s + 1)
    }
    setSynced(v => !v)
  }

  return (
    <div className="border-t border-border/50 bg-accent/5">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-xs font-medium text-muted-foreground">A / B Comparison</span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSync}
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
            onPlay={synced ? handleLeaderPlay : handleAIndepPlay}
            onPause={synced ? handleLeaderPause : handleAIndepPause}
            onTimeUpdate={handleLeaderTime}
            externalPlay={synced ? playing : aIndepPlaying}
            externalSeek={null}
            muted={synced ? !soloA : false}
            resetSignal={resetSignal}
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
            onPlay={synced ? () => {} : handleBIndepPlay}
            onPause={synced ? () => {} : handleBIndepPause}
            onTimeUpdate={() => {}}
            externalPlay={synced ? playing : bIndepPlaying}
            externalSeek={synced ? followerSeek : null}
            muted={synced ? soloA : false}
            resetSignal={resetSignal}
            showMuteToggle={synced}
            onMuteToggle={synced ? () => setSoloA(v => !v) : undefined}
          />
        </div>
      </div>
    </div>
  )
}
