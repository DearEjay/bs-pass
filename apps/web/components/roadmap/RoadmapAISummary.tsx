'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, RefreshCw, Volume2, Square, Loader2 } from 'lucide-react'
import type { TaskWithDeps } from '@/hooks/useTasks'
import type { Database } from '@/types/database'

type Track = Database['public']['Tables']['tracks']['Row']

interface Props {
  projectId: string
  project: { title: string; project_type: string }
  tasks: TaskWithDeps[]
  tracks: Track[]
  displayName: string
}

// ── localStorage helpers ───────────────────────────────────────────────────────
// localStorage survives page refreshes (unlike in-memory state).
// Cleared only when the user clicks Regenerate.

interface Cached { text: string; ts: number }

const cacheKey = (id: string) => `bs-pass:roadmap-summary:${id}`

function readStore(projectId: string): Cached | null {
  try {
    const raw = localStorage.getItem(cacheKey(projectId))
    return raw ? (JSON.parse(raw) as Cached) : null
  } catch { return null }
}

function writeStore(projectId: string, text: string) {
  try {
    localStorage.setItem(cacheKey(projectId), JSON.stringify({ text, ts: Date.now() }))
  } catch {}
}

function clearStore(projectId: string) {
  try { localStorage.removeItem(cacheKey(projectId)) } catch {}
}

// ── API ────────────────────────────────────────────────────────────────────────
async function fetchSummary(projectId: string, displayName: string): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-summarize-roadmap`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ projectId, displayName }),
    },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`${res.status}: ${body.detail ?? body.error ?? JSON.stringify(body)}`)
  }
  const data = await res.json()
  if (!data.summary) throw new Error('No summary in response')
  return data.summary as string
}

function fmtTs(ms: number) {
  return new Date(ms).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })
}

// ── Component ──────────────────────────────────────────────────────────────────
export function RoadmapAISummary({ projectId, tasks, displayName }: Props) {
  const qc = useQueryClient()
  const queryKey = ['roadmap-summary', projectId]

  // Track last-updated time separately so it reflects the localStorage timestamp
  const [lastTs, setLastTs] = useState<number | null>(null)
  const [ttsState, setTtsState] = useState<'idle' | 'loading' | 'playing'>('idle')

  const audioRef   = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  // Guard refs: mountedRef prevents the mount effect from running twice (React StrictMode);
  // fetchedRef ensures we only trigger one automatic fetch per mount lifecycle.
  const mountedRef = useRef(false)
  const fetchedRef = useRef(false)

  const { data: summary, isFetching, refetch, error } = useQuery<string>({
    queryKey,
    queryFn: async () => {
      const text = await fetchSummary(projectId, displayName)
      writeStore(projectId, text)
      setLastTs(Date.now())
      return text
    },
    // Never auto-fetches. We drive all fetches manually so SSR never triggers one.
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })

  // Runs once on the client after mount.
  // If localStorage has a summary → seed the TQ cache directly (no network call).
  // If not → auto-fetch, but only if tasks are already available.
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    const cached = readStore(projectId)
    if (cached) {
      qc.setQueryData(queryKey, cached.text)
      setLastTs(cached.ts)
      return
    }
    if (tasks.length > 0) {
      fetchedRef.current = true
      refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // If tasks weren't loaded when we mounted, trigger the fetch as soon as they arrive.
  useEffect(() => {
    if (!mountedRef.current) return  // wait for mount effect
    if (fetchedRef.current) return   // already fetching or fetched
    if (tasks.length === 0) return
    if (qc.getQueryData(queryKey)) return  // TQ cache already seeded
    if (readStore(projectId)) return       // localStorage has it (will be seeded next mount)
    fetchedRef.current = true
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length])

  // Clean up audio on unmount
  useEffect(() => () => stopAudio(), []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!tasks.length) return null

  function stopAudio() {
    audioRef.current?.pause()
    audioRef.current = null
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
    setTtsState('idle')
  }

  function handleRegenerate() {
    stopAudio()
    clearStore(projectId)
    fetchedRef.current = true
    refetch()
  }

  async function handleSpeak() {
    if (!summary) return
    if (ttsState !== 'idle') { stopAudio(); return }

    setTtsState('loading')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Not authenticated')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tts-speak`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ text: summary }),
        }
      )
      if (!res.ok) throw new Error(`TTS failed (${res.status})`)

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      blobUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { URL.revokeObjectURL(url); blobUrlRef.current = null; audioRef.current = null; setTtsState('idle') }
      audio.onerror = () => { URL.revokeObjectURL(url); blobUrlRef.current = null; audioRef.current = null; setTtsState('idle') }

      await audio.play()
      setTtsState('playing')
    } catch (e) {
      console.error('TTS error:', e)
      stopAudio()
    }
  }

  const isLoading = isFetching && !summary

  return (
    <div className="relative rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-4 min-h-[80px] flex gap-3 items-start">
      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
        <Sparkles size={15} className="text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="space-y-2 py-1">
            <div className="h-3.5 w-3/4 rounded-full bg-muted/60 animate-pulse" />
            <div className="h-3.5 w-1/2 rounded-full bg-muted/40 animate-pulse" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground italic">{(error as Error).message}</p>
        ) : summary ? (
          <>
            <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
            {lastTs && (
              <p className="text-[11px] text-muted-foreground/50 mt-2">
                Last updated: {fmtTs(lastTs)}
              </p>
            )}
          </>
        ) : null}
      </div>

      <button
        onClick={handleRegenerate}
        disabled={isFetching}
        className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
        title="Regenerate summary"
      >
        <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
      </button>

      {summary && !isLoading && (
        <button
          onClick={handleSpeak}
          className={`absolute bottom-3 right-3 p-1.5 rounded-md transition-colors ${
            ttsState !== 'idle'
              ? 'text-primary bg-primary/10 hover:bg-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          }`}
          title={ttsState !== 'idle' ? 'Stop reading' : 'Listen to summary'}
        >
          {ttsState === 'loading'
            ? <Loader2 size={13} className="animate-spin" />
            : ttsState === 'playing'
            ? <Square size={13} fill="currentColor" />
            : <Volume2 size={13} />}
        </button>
      )}
    </div>
  )
}
